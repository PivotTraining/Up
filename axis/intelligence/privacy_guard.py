"""
Axis Privacy Guard

Before any query leaves the Mac mini for Claude API processing,
this module scrubs it of data from LOCAL_ONLY lanes (Family and Self).

Sanitization approach:
  - Known entity names replaced with consistent tokens ([PERSON_1], etc.)
  - Tokens are stable within a session so Claude can reason about
    "PERSON_1 said X and PERSON_1 also did Y" without knowing the name
  - A reverse map is held in memory so Axis can substitute names back
    into Claude's response before reading it aloud

The guard also checks that memory context injected into the prompt
doesn't contain LOCAL_ONLY lane records — those are stripped before
the prompt is assembled.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional


# ── Entity token registry ─────────────────────────────────────────────────────

# Family entities that must never reach the cloud
_FAMILY_ENTITIES = [
    "Jazmine", "Jazmine Davis",
    "Caleb", "Caleb Davis",
    "Jaxon", "Jaxon Davis",
    "Major", "Major Davis",
]

# Self entities (health details, doctoral specifics, trading positions)
# These are caught by pattern matching rather than fixed names
_SELF_PATTERNS = [
    re.compile(r"\b(doctoral|dissertation|thesis|PhD|Ed\.D)\b", re.I),
    re.compile(r"\b(blood pressure|A1C|glucose|medication|prescription)\b", re.I),
    re.compile(r"\b(put|call|strike|expiry|delta|theta|premium.collector)\b", re.I),
]


@dataclass
class SanitizedPayload:
    """A query + context block that has been cleared for cloud processing."""
    original_query: str
    sanitized_query: str
    original_context: str
    sanitized_context: str
    token_map: dict[str, str] = field(default_factory=dict)   # token → real name
    warnings: list[str] = field(default_factory=list)

    def restore(self, text: str) -> str:
        """
        Substitute tokens back to real names in Claude's response
        before reading it aloud or storing it.
        """
        result = text
        for token, name in self.token_map.items():
            result = result.replace(token, name)
        return result

    @property
    def was_sanitized(self) -> bool:
        return bool(self.token_map or self.warnings)


class PrivacyGuard:
    """
    Sanitizes prompts before they leave the Mac mini.

    Usage:
        guard = PrivacyGuard()
        payload = guard.sanitize(query=user_query, context=memory_context)
        # send payload.sanitized_query + payload.sanitized_context to Claude
        # restore names in Claude's response:
        response = payload.restore(claude_response)
    """

    def __init__(self) -> None:
        # Stable token assignments for this session
        self._entity_tokens: dict[str, str] = {}
        self._token_counter: int = 0

    def _get_token(self, name: str) -> str:
        """Get or create a consistent token for an entity name."""
        if name not in self._entity_tokens:
            self._token_counter += 1
            self._entity_tokens[name] = f"[PERSON_{self._token_counter}]"
        return self._entity_tokens[name]

    def _redact_family_entities(self, text: str) -> tuple[str, dict[str, str]]:
        """Replace Family lane entity names with stable tokens."""
        result = text
        token_map: dict[str, str] = {}

        # Sort by length descending to match "Jazmine Davis" before "Jazmine"
        for entity in sorted(_FAMILY_ENTITIES, key=len, reverse=True):
            if entity in result:
                token = self._get_token(entity)
                result = result.replace(entity, token)
                # Store reverse map: token → real name
                token_map[token] = entity

        return result, token_map

    def _redact_self_patterns(self, text: str) -> tuple[str, list[str]]:
        """Warn if Self lane sensitive patterns appear — don't block, just flag."""
        warnings = []
        for pattern in _SELF_PATTERNS:
            if pattern.search(text):
                warnings.append(
                    f"Self-lane sensitive content detected (pattern: {pattern.pattern[:40]}). "
                    "Review before sending to cloud."
                )
        return text, warnings

    def sanitize(
        self,
        query: str,
        context: str = "",
    ) -> SanitizedPayload:
        """
        Sanitize query + memory context for cloud processing.
        Returns a SanitizedPayload with token map for response restoration.
        """
        sanitized_query, token_map_q = self._redact_family_entities(query)
        sanitized_query, warnings_q = self._redact_self_patterns(sanitized_query)

        sanitized_context, token_map_c = self._redact_family_entities(context)
        sanitized_context = self._strip_local_only_context(sanitized_context)

        token_map = {**token_map_q, **token_map_c}

        return SanitizedPayload(
            original_query=query,
            sanitized_query=sanitized_query,
            original_context=context,
            sanitized_context=sanitized_context,
            token_map=token_map,
            warnings=warnings_q,
        )

    def _strip_local_only_context(self, context: str) -> str:
        """
        Remove [FAMILY] and [SELF] memory lane blocks from the context
        before injecting into a cloud prompt.
        """
        lines = context.split("\n")
        filtered: list[str] = []
        skip_block = False

        for line in lines:
            # Detect start of LOCAL_ONLY lane block in the context format
            # Format from supabase_backend.py: "[FAMILY | 2026-04-01] ..."
            if re.match(r"\[FAMILY\b", line) or re.match(r"\[SELF\b", line):
                skip_block = True
                continue
            # End of block detection (next lane header or end marker)
            if skip_block and (
                re.match(r"\[[A-Z]+\b", line) or line.startswith("[END MEMORY")
            ):
                skip_block = False

            if not skip_block:
                filtered.append(line)

        return "\n".join(filtered)

    def check_safe_for_cloud(self, text: str) -> tuple[bool, list[str]]:
        """
        Quick check: is this text safe to send to cloud as-is?
        Returns (is_safe, list_of_issues).
        """
        issues = []
        for entity in _FAMILY_ENTITIES:
            if entity in text:
                issues.append(f"Family entity '{entity}' found — must sanitize first")
        for pattern in _SELF_PATTERNS:
            if pattern.search(text):
                issues.append(f"Self-lane pattern detected: {pattern.pattern[:40]}")
        return len(issues) == 0, issues
