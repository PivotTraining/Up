"""
Axis Devotion Generator Skill

Generates daily devotions in Chris's format — opening scripture,
word study/etymology, cross-reference, personal story bridge,
and a closing anchor. Pulls from the Faith lane memory to avoid
repeating recent themes.

Format (5 components):
  1. Scripture       — primary verse, full text
  2. Word Study      — one key Hebrew/Greek word, root meaning, transliteration
  3. Cross-Reference — 2-3 supporting verses that expand the theme
  4. Story Bridge    — a personal story or cultural illustration that grounds the truth
  5. Closing Anchor  — one sentence the listener carries into their day

Actions:
  generate    — produce a full devotion (optionally: theme, book, verse_ref)
  outline     — return just the structure with verse + word study + refs (no story)
  word_study  — deep word study on a specific word or verse
  recent      — show recent devotion themes (calls Faith lane memory)
"""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Optional

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


# ── Word study bank ───────────────────────────────────────────────────────────
# Key Hebrew/Greek words with etymological notes.
# Format: { word: (transliteration, language, root_meaning, usage_note) }

WORD_STUDIES: dict[str, tuple[str, str, str, str]] = {
    "shalom": (
        "shalom", "Hebrew", "completeness, wholeness, nothing missing, nothing broken",
        "Often translated as 'peace,' but shalom is bigger than the absence of conflict. "
        "It's the presence of everything needed for human flourishing. "
        "When God grants shalom, He's not just removing war — He's restoring wholeness.",
    ),
    "chesed": (
        "chesed", "Hebrew", "loyal love, covenant faithfulness, steadfast mercy",
        "The word behind 'lovingkindness' and 'steadfast love' in Psalms. "
        "Chesed isn't an emotion — it's a covenant commitment. "
        "God's chesed doesn't run out because it was never based on your performance.",
    ),
    "ruach": (
        "ruach", "Hebrew", "breath, wind, spirit",
        "Used for God's breath animating Adam (Genesis 2:7), the Spirit hovering over creation (Genesis 1:2), "
        "and the breath of prophecy (Ezekiel 37). "
        "Every time you breathe, you're receiving what only God can give.",
    ),
    "yada": (
        "yada", "Hebrew", "to know experientially, to be deeply acquainted with",
        "This isn't intellectual knowledge — it's the word for intimacy. "
        "When God says 'I know you by name,' He's using the same word for the deepest relational knowing. "
        "You are not a statistic to Him.",
    ),
    "ezer": (
        "ezer", "Hebrew", "helper, one who comes alongside with strength",
        "Used for Eve (Genesis 2:18) and also for God Himself (Psalm 121:2 — 'my help comes from the Lord'). "
        "Being an ezer isn't a subordinate role. It's the role God takes when He shows up in your crisis.",
    ),
    "pneuma": (
        "pneuma", "Greek", "breath, wind, spirit",
        "The New Testament parallel to ruach. "
        "The Spirit who hovered at creation is the same Spirit who raised Christ from the dead — "
        "and Paul says that Spirit lives in you (Romans 8:11).",
    ),
    "agape": (
        "agape", "Greek", "unconditional, self-giving love",
        "Different from phileo (affection) or eros (romantic love). "
        "Agape is a decision, not a feeling. "
        "When John says 'God is love,' he uses agape — a love that acts regardless of whether it's returned.",
    ),
    "kairos": (
        "kairos", "Greek", "the appointed time, the right moment",
        "Different from chronos (clock time). Kairos is qualitative — the opportune moment God has set. "
        "When Jesus said 'the time is fulfilled' (Mark 1:15), He used kairos. "
        "Some things aren't late. They're kairos.",
    ),
    "metanoia": (
        "metanoia", "Greek", "a change of mind and direction, repentance",
        "From meta (after/beyond) + nous (mind). "
        "Metanoia is not guilt management — it's a full reorientation of how you see reality. "
        "When you truly repent, you don't just stop a behavior. You see differently.",
    ),
    "dunamis": (
        "dunamis", "Greek", "power, inherent ability, miraculous strength",
        "The root of 'dynamite.' "
        "When Paul prays you'd know 'the exceeding greatness of His power' (Ephesians 1:19), he stacks three power words — "
        "dunamis, kratos, ischys — because no single word is enough.",
    ),
    "hesychia": (
        "hesychia", "Greek", "quietness, stillness, the peace of a settled soul",
        "Not silence from fear, but stillness from trust. "
        "The word appears in 1 Timothy 2:2 — Paul's vision for a life that runs deep rather than loud.",
    ),
    "sela": (
        "selah", "Hebrew", "pause, lift up, reflect (musical/liturgical notation)",
        "Appears 74 times in Psalms. Possibly a musical rest or an instruction to lift the hands. "
        "Either way — it's God's invitation to stop and let what you just heard actually land.",
    ),
}


# ── Devotion scaffolds ────────────────────────────────────────────────────────
# Curated verse clusters grouped by theme.
# Each entry: { "theme": str, "primary": (ref, text), "cross_refs": [(ref, theme_note)], "word": str }

DEVOTION_SEEDS = [
    {
        "theme": "identity",
        "primary": (
            "Psalm 139:14",
            "I praise you because I am fearfully and wonderfully made; your works are wonderful, I know that full well.",
        ),
        "cross_refs": [
            ("Genesis 1:27", "made in the image of God"),
            ("Ephesians 2:10", "God's workmanship, created for good works"),
            ("Isaiah 43:1", "called by name, belonging to God"),
        ],
        "word": "yada",
    },
    {
        "theme": "peace",
        "primary": (
            "Isaiah 26:3",
            "You will keep in perfect peace those whose minds are steadfast, because they trust in you.",
        ),
        "cross_refs": [
            ("John 14:27", "peace not as the world gives"),
            ("Philippians 4:7", "peace that surpasses understanding"),
            ("Romans 5:1", "peace with God through justification"),
        ],
        "word": "shalom",
    },
    {
        "theme": "strength",
        "primary": (
            "Isaiah 40:31",
            "But those who hope in the LORD will renew their strength. They will soar on wings like eagles; "
            "they will run and not grow weary, they will walk and not be faint.",
        ),
        "cross_refs": [
            ("Philippians 4:13", "strength through Christ"),
            ("2 Corinthians 12:9", "power made perfect in weakness"),
            ("Nehemiah 8:10", "the joy of the Lord is your strength"),
        ],
        "word": "dunamis",
    },
    {
        "theme": "faithfulness",
        "primary": (
            "Lamentations 3:22-23",
            "Because of the LORD's great love we are not consumed, for his compassions never fail. "
            "They are new every morning; great is your faithfulness.",
        ),
        "cross_refs": [
            ("Psalm 36:5", "faithfulness reaches to the skies"),
            ("Hebrews 10:23", "he who promised is faithful"),
            ("1 Corinthians 1:9", "God is faithful who called you"),
        ],
        "word": "chesed",
    },
    {
        "theme": "calling",
        "primary": (
            "Jeremiah 29:11",
            "For I know the plans I have for you, declares the LORD, plans to prosper you and not to harm you, "
            "plans to give you hope and a future.",
        ),
        "cross_refs": [
            ("Romans 8:28", "called according to His purpose"),
            ("Ephesians 1:11", "predestined according to His plan"),
            ("Proverbs 19:21", "the Lord's purpose prevails"),
        ],
        "word": "kairos",
    },
    {
        "theme": "the Spirit",
        "primary": (
            "Romans 8:11",
            "And if the Spirit of him who raised Jesus from the dead is living in you, he who raised Christ from the dead "
            "will also give life to your mortal bodies because of his Spirit who lives in you.",
        ),
        "cross_refs": [
            ("Genesis 2:7", "God breathed life into man"),
            ("Ezekiel 37:14", "I will put my Spirit in you"),
            ("Acts 1:8", "you will receive power when the Spirit comes"),
        ],
        "word": "pneuma",
    },
    {
        "theme": "repentance",
        "primary": (
            "Acts 3:19",
            "Repent, then, and turn to God, so that your sins may be wiped out, that times of refreshing may come from the Lord.",
        ),
        "cross_refs": [
            ("Luke 15:20", "the father runs to meet the returning son"),
            ("Isaiah 1:18", "sins white as snow"),
            ("2 Chronicles 7:14", "humble, pray, turn"),
        ],
        "word": "metanoia",
    },
    {
        "theme": "stillness",
        "primary": (
            "Psalm 46:10",
            "He says, 'Be still, and know that I am God; I will be exalted among the nations, I will be exalted in the earth.'",
        ),
        "cross_refs": [
            ("Exodus 14:14", "the Lord will fight for you; you need only be still"),
            ("1 Kings 19:12", "a still small voice after the fire"),
            ("Zephaniah 3:17", "he will quiet you with his love"),
        ],
        "word": "hesychia",
    },
]


# ── Story bridges ─────────────────────────────────────────────────────────────
# Short personal story starters that Chris can expand. Keyed by theme.

STORY_BRIDGES: dict[str, str] = {
    "identity": (
        "There's a moment I remember — I'm standing in front of a room of 8th graders "
        "who've been told in every way that they don't matter. Not with words, usually. "
        "With policies. With the way teachers look when they walk in. "
        "And I have to decide: do I give them a pep talk, or do I tell them the truth? "
        "The truth is harder. It says: what God made doesn't need a pep talk. It needs a mirror."
    ),
    "peace": (
        "I spent years chasing what I thought peace felt like — "
        "which mostly meant the absence of problems. "
        "Quiet calendar. No fires. No hard conversations. "
        "But shalom isn't the quiet you get when nothing is happening. "
        "It's the quiet you carry when everything is."
    ),
    "strength": (
        "There's a difference between being tired and being depleted. "
        "Tired is physical. Depleted is something else — "
        "it's when you've been drawing from a well that wasn't deep enough. "
        "I've been depleted in seasons where I looked productive from the outside. "
        "Isaiah 40 is written for people who look fine but are running on fumes."
    ),
    "faithfulness": (
        "My son Caleb once asked me: 'How do you know God is still there when you can't feel Him?' "
        "I told him: the same way I know the sun is real on a cloudy day. "
        "Not because I can see it, but because I've seen enough mornings to know it comes back."
    ),
    "calling": (
        "I was 27 when I walked away from a stable job to start something I couldn't fully explain to anyone. "
        "Not even myself. The plan I could see didn't match the plan I sensed. "
        "Jeremiah 29:11 doesn't say 'I will show you the plan.' It says 'I know the plan.' "
        "There's a difference. One requires your understanding. The other just requires your trust."
    ),
    "the Spirit": (
        "I've been in rooms where I knew I had nothing left to give — "
        "and something happened anyway. "
        "The counseling session that turned. The talk that landed. "
        "The moment a student finally exhaled. "
        "I stopped taking credit for those a long time ago. "
        "Romans 8:11 is the explanation."
    ),
    "repentance": (
        "Real repentance doesn't feel like punishment. "
        "It feels like relief. Like putting down something heavy you didn't realize you were carrying. "
        "The church has done damage by turning repentance into a shame ceremony "
        "when Jesus intended it as a homecoming."
    ),
    "stillness": (
        "I have a personality that wants to solve things. "
        "Silence feels like surrender to me. "
        "So when God says 'be still' — that's not a comfort. That's a command. "
        "And the hardest obedience I've ever practiced isn't doing something hard. "
        "It's stopping. And trusting that what I stopped doing was already handled."
    ),
}


# ── Builder ───────────────────────────────────────────────────────────────────

@dataclass
class Devotion:
    theme: str
    date: str
    primary_ref: str
    primary_text: str
    word_key: str
    word_transliteration: str
    word_language: str
    word_root: str
    word_note: str
    cross_refs: list[tuple[str, str]]
    story_bridge: str
    closing_anchor: str

    def format(self) -> str:
        cross_ref_lines = "\n".join(
            f"  • {ref} — {note}" for ref, note in self.cross_refs
        )
        return f"""— {self.date} —

SCRIPTURE
{self.primary_ref}
"{self.primary_text}"

WORD STUDY
{self.word_transliteration.upper()} ({self.word_language})
Root meaning: {self.word_root}

{self.word_note}

CROSS-REFERENCES
{cross_ref_lines}

STORY BRIDGE
{self.story_bridge}

CLOSING ANCHOR
{self.closing_anchor}
"""


def _closing_anchor(theme: str, primary_ref: str) -> str:
    anchors = {
        "identity":    "Today you don't have to earn what God already declared.",
        "peace":       "The peace available to you right now isn't waiting for your circumstances to change.",
        "strength":    "You're not running on empty — you're running on the wrong fuel.",
        "faithfulness": "His mercies were new this morning whether you felt them or not.",
        "calling":     "The plan God has for you has survived every detour you've taken.",
        "the Spirit":  "The same power that raised Christ from the dead is not on standby for you.",
        "repentance":  "Repentance isn't the end of something — it's the door to something better.",
        "stillness":   "The battle you need to stop fighting today isn't yours to win.",
    }
    return anchors.get(theme, f"Carry {primary_ref} with you today and let it do its work.")


def _build_devotion(seed: dict) -> Devotion:
    word_key = seed["word"]
    w = WORD_STUDIES[word_key]
    story = STORY_BRIDGES.get(seed["theme"], "")
    primary_ref, primary_text = seed["primary"]
    closing = _closing_anchor(seed["theme"], primary_ref)

    return Devotion(
        theme=seed["theme"],
        date=datetime.now().strftime("%B %d, %Y"),
        primary_ref=primary_ref,
        primary_text=primary_text,
        word_key=word_key,
        word_transliteration=w[0],
        word_language=w[1],
        word_root=w[2],
        word_note=w[3],
        cross_refs=seed["cross_refs"],
        story_bridge=story,
        closing_anchor=closing,
    )


def _build_word_study(word: str) -> str:
    word_lower = word.lower().strip()
    # Direct lookup
    if word_lower in WORD_STUDIES:
        w = WORD_STUDIES[word_lower]
        return (
            f"{w[0].upper()} ({w[1]})\n"
            f"Root meaning: {w[2]}\n\n"
            f"{w[3]}"
        )
    # Fuzzy — find a seed that mentions this word in primary ref or theme
    for key, w in WORD_STUDIES.items():
        if word_lower in key or word_lower in w[2].lower() or word_lower in w[3].lower():
            return (
                f"{w[0].upper()} ({w[1]})\n"
                f"Root meaning: {w[2]}\n\n"
                f"{w[3]}"
            )
    available = ", ".join(WORD_STUDIES.keys())
    return f"Word '{word}' not found in word study bank.\nAvailable words: {available}"


# ── Main skill ────────────────────────────────────────────────────────────────

class DevotionGeneratorSkill:
    """
    Generates daily devotions in Chris's 5-component format:
    Scripture → Word Study → Cross-References → Story Bridge → Closing Anchor.

    Integrates with the Faith lane memory to avoid theme repetition.
    """

    name = "devotion_generator"
    description = (
        "Generate daily devotions in Chris's format. "
        "Actions: generate, outline, word_study, recent. "
        "Optional: theme (identity/peace/strength/faithfulness/calling/the Spirit/repentance/stillness), "
        "word (for word_study action)."
    )

    def run(
        self,
        action: str = "generate",
        theme: str = "",
        word: str = "",
        verse_ref: str = "",
        **kwargs: Any,
    ) -> str:

        if action == "word_study":
            if not word:
                available = ", ".join(WORD_STUDIES.keys())
                return f"Specify a word. Available: {available}"
            return _build_word_study(word)

        if action == "outline":
            seed = self._find_seed(theme)
            if not seed:
                return f"No devotion seed found for theme '{theme}'."
            primary_ref, primary_text = seed["primary"]
            word_key = seed["word"]
            w = WORD_STUDIES[word_key]
            cross_lines = "\n".join(
                f"  • {ref} — {note}" for ref, note in seed["cross_refs"]
            )
            return (
                f"THEME: {seed['theme'].upper()}\n\n"
                f"SCRIPTURE: {primary_ref}\n"
                f'"{primary_text}"\n\n'
                f"KEY WORD: {w[0].upper()} ({w[1]}) — {w[2]}\n\n"
                f"CROSS-REFERENCES:\n{cross_lines}"
            )

        if action == "recent":
            return self._recent_themes()

        # Default: generate
        seed = self._find_seed(theme)
        if not seed:
            seed = DEVOTION_SEEDS[0]  # fallback
        devotion = _build_devotion(seed)
        return devotion.format()

    def _find_seed(self, theme: str) -> Optional[dict]:
        if not theme:
            # Pick by day of month to cycle through themes naturally
            idx = datetime.now().day % len(DEVOTION_SEEDS)
            return DEVOTION_SEEDS[idx]
        theme_lower = theme.lower().strip()
        for seed in DEVOTION_SEEDS:
            if theme_lower in seed["theme"].lower():
                return seed
        return None

    def _recent_themes(self) -> str:
        """Pull recent devotion themes from Faith lane memory, or return seed list."""
        try:
            sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
            from memory.supabase_backend import AxisMemoryBackend
            from memory.lanes import MemoryLane
            backend = AxisMemoryBackend()
            results = backend.recent(MemoryLane.FAITH, hours=168, limit=10)
            if results:
                lines = ["Recent Faith lane entries (last 7 days):"]
                for r in results[:5]:
                    preview = r.content[:80].replace("\n", " ")
                    lines.append(f"  • {preview}…")
                return "\n".join(lines)
        except Exception:
            pass

        lines = ["Available devotion themes:"]
        for seed in DEVOTION_SEEDS:
            lines.append(f"  • {seed['theme']} ({seed['primary'][0]})")
        return "\n".join(lines)
