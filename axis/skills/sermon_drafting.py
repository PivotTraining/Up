"""
Axis Sermon Drafting Skill

Long-form sermon content drafting using the 3-part structure Chris uses:
  1. HOOK        — cultural moment, story, or tension that opens the room
  2. TEXT        — exegetical section (word study + context + theological claim)
  3. TURN        — what this means for someone in the room today

Also generates shorter components:
  - sermon_intro    — opening hook only (5-7 minutes of material)
  - sermon_outline  — structured skeleton with main points + scripture
  - illustration    — a standalone story or cultural illustration for a given theme
  - transition      — a connecting bridge between two sermon sections
  - altar_call      — an invitation/closing application moment

Pulls from Faith lane memory to avoid repeating recent sermon topics.
The generator works from a theme, a passage, or both.
"""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Optional

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


# ── Sermon structures ─────────────────────────────────────────────────────────

@dataclass
class SermonOutline:
    title: str
    series: str
    passage: str
    big_idea: str            # The one sentence the whole sermon is building toward
    hook: str                # Opening scene/question/tension
    text_main: str           # What the passage says
    text_word_study: str     # Key word and what it unlocks
    text_context: str        # Historical/cultural context that changes the read
    theological_claim: str   # The core truth being asserted
    application: str         # The turn — what do they do with this?
    altar_call: str          # Invitation or closing
    date: str = ""

    def format(self) -> str:
        return f"""SERMON: {self.title}
{"Series: " + self.series if self.series else ""}
Passage: {self.passage}
Date: {self.date or "TBD"}

BIG IDEA
{self.big_idea}

─────────────────────────────
HOOK (Open with this)
─────────────────────────────
{self.hook}

─────────────────────────────
THE TEXT
─────────────────────────────
{self.text_main}

WORD STUDY
{self.text_word_study}

CONTEXT
{self.text_context}

THEOLOGICAL CLAIM
{self.theological_claim}

─────────────────────────────
THE TURN (Application)
─────────────────────────────
{self.application}

─────────────────────────────
CLOSING / ALTAR CALL
─────────────────────────────
{self.altar_call}
"""


# ── Sermon seeds ──────────────────────────────────────────────────────────────

SERMON_SEEDS: list[dict] = [
    {
        "theme": "identity under pressure",
        "passage": "Daniel 1:1-20",
        "title": "They Tried to Rename Him",
        "series": "",
        "big_idea": "Your name is not what they call you — your identity is what God declared before anyone else had a word for you.",
        "hook": (
            "There's a moment in every Black man's story where someone tries to rename you. "
            "Not your legal name — your identity. Your worth. Your ceiling. "
            "A teacher who told you what you couldn't be. "
            "A system that gave you a number instead of a future. "
            "A relationship that made you believe the label they put on you. "
            "\n\nDaniel knows this. He's 16, a prisoner in Babylon, and the first thing they do "
            "when they take him from Jerusalem is change his name. "
            "Belteshazzar. Their language. Their god. Their claim. "
            "But the text makes something clear: you can rename a man's mouth "
            "without renaming his soul."
        ),
        "text_main": (
            "Daniel 1 opens with a theological crisis. "
            "Nebuchadnezzar besieges Jerusalem — and the text says God 'gave' Jerusalem into his hand (v.2). "
            "This is not an accident. It's not a defeat. It's a mission. "
            "\n\nDaniel, Hananiah, Mishael, and Azariah are chosen specifically "
            "because they have the look of the elite — healthy, intelligent, no defect. "
            "Babylon doesn't want to destroy them. Babylon wants to absorb them. "
            "There's a difference. Destruction is violent and obvious. "
            "Absorption is slow, comfortable, and lethal."
        ),
        "text_word_study": (
            "SHAMAR — Hebrew, 'to guard, protect, keep watch over.'\n"
            "Daniel 1:8 says Daniel 'purposed in his heart' not to defile himself. "
            "The word behind that resolve is the same word used for a watchman at the gate. "
            "Daniel didn't drift into faithfulness. He stationed himself there. "
            "Your identity doesn't maintain itself — it requires a guard."
        ),
        "text_context": (
            "In ancient Near Eastern culture, a name carried legal weight. "
            "Changing someone's name meant changing their allegiance, their god, and their destiny. "
            "Daniel's Hebrew name means 'God is my judge.' "
            "Belteshazzar means 'Bel protect his life' — Bel being a Babylonian deity. "
            "This wasn't just a cultural nicety. It was theological warfare."
        ),
        "theological_claim": (
            "What Babylon could never change was what God had already inscribed. "
            "The name God gives you precedes every name the world tries to put on you. "
            "Before Babylon had a word for him, Daniel was already 'greatly beloved' (Daniel 9:23). "
            "The world can rename your resume. It cannot rename your soul."
        ),
        "application": (
            "Where are you being slowly absorbed right now? "
            "Not by something obviously evil — by something comfortable, convenient, and corrosive. "
            "The diet that changes you isn't one meal. It's accumulated decisions. "
            "Purpose in your heart. Not just once. Every morning."
        ),
        "altar_call": (
            "If you've forgotten your name — God's version of it — today is not the day He gives up reminding you. "
            "He's not waiting for you to earn your way back to the identity He gave you. "
            "He's been holding it for you the whole time. Come and get it."
        ),
    },
    {
        "theme": "grief and faith",
        "passage": "John 11:17-44",
        "title": "He Wept First",
        "series": "",
        "big_idea": "God does not bypass your grief to get to your miracle. He enters it first.",
        "hook": (
            "I want to ask you something you've probably never been asked at church: "
            "how are you actually doing? "
            "\n\nNot the Sunday answer. Not 'I'm blessed.' "
            "Because some of you are holding losses you haven't said out loud yet. "
            "A marriage that ended. A friendship that dissolved. A diagnosis you're still sitting with. "
            "A dream you quietly let go of last year. "
            "\n\nAnd the church often makes it worse — because we rush to the resurrection "
            "before we let people grieve the tomb. "
            "Jesus didn't do that. Watch what He does in John 11."
        ),
        "text_main": (
            "Lazarus is already four days dead by the time Jesus arrives. "
            "Mary falls at His feet and says 'if you had been here, my brother would not have died' (v.32). "
            "This is not a compliment. This is a rebuke wrapped in grief. "
            "She's saying: where were you? "
            "\n\nJesus doesn't answer her question. He asks where they laid him. "
            "He's about to raise the dead — and He stops to ask for directions. "
            "He enters the process instead of bypassing it."
        ),
        "text_word_study": (
            "EMBRIMAOMAI — Greek, 'deeply moved, indignant, troubled in spirit.'\n"
            "John 11:33 says Jesus was 'deeply moved in spirit and troubled.' "
            "This word is strong — it carries the idea of a groan that comes from somewhere deep. "
            "Some translations soften it to 'moved with compassion.' "
            "But embrimaomai also has anger in it. "
            "Jesus is not just sad. He's indignant at death itself. "
            "He hates what it does to the people He loves."
        ),
        "text_context": (
            "Four days was significant in Jewish belief. "
            "It was thought that the soul hovered near the body for three days after death. "
            "After four days, there was no question — the person was gone. "
            "By waiting, Jesus eliminated any possibility that this was resuscitation. "
            "He was making a theological statement: "
            "I have authority over what you have already given up on."
        ),
        "theological_claim": (
            "Verse 35: 'Jesus wept.' "
            "The shortest verse in the Bible is not a throwaway line. "
            "The God of the universe, who knew exactly what He was about to do, "
            "who had the power to reverse every effect of death — stopped and cried. "
            "Not for performance. Not because He forgot He was God. "
            "Because your grief matters to Him that much. "
            "He does not rush through your tomb to get to your testimony."
        ),
        "application": (
            "Stop performing okay when you're not. "
            "Jesus didn't meet Mary with a theology lesson. He met her where she was standing. "
            "The invitation today is not to get it together. "
            "It's to bring what you're actually carrying and let Him be with you in it. "
            "The resurrection comes. But He weeps first."
        ),
        "altar_call": (
            "If you're in a tomb season right now — not sure how you got here, not sure how long it lasts — "
            "I want you to know that the one standing outside your situation is not impatient. "
            "He's not disappointed that you're still in it. "
            "He showed up. And He's about to call your name."
        ),
    },
    {
        "theme": "purpose in the wait",
        "passage": "Habakkuk 2:1-4",
        "title": "The Vision Has a Due Date",
        "series": "",
        "big_idea": "The wait is not evidence that God forgot. It's evidence that the vision is too large for the wrong season.",
        "hook": (
            "How long have you been waiting for something? "
            "Not passively waiting — actively, obediently waiting. "
            "You did the right thing. You prayed the right prayers. "
            "You prepared. You stayed faithful. "
            "And it still hasn't moved. "
            "\n\nHabakkuk gets it. He opens his book with one of the most honest prayers in scripture: "
            "'How long, LORD, must I call for help, but you do not listen?' (1:2). "
            "This is not doubt. This is intimacy. "
            "You don't say that to someone you've given up on."
        ),
        "text_main": (
            "By chapter 2, something has shifted. Habakkuk stops talking and takes a position: "
            "'I will stand at my watch and station myself on the ramparts' (2:1). "
            "He's not giving up. He's getting a better vantage point. "
            "\n\nGod's response doesn't answer the timeline question. "
            "It answers the posture question. "
            "'Write down the vision and make it plain on tablets' (2:2). "
            "God doesn't tell Habakkuk when. He tells him to write it down anyway."
        ),
        "text_word_study": (
            "CHAZAH — Hebrew, 'to see, behold, perceive — as in divine vision.'\n"
            "The 'vision' in Habakkuk 2:2 isn't a plan. It's a revelation. "
            "Chazah is what prophets did — they perceived something in the spirit that hadn't happened yet in the natural. "
            "God is saying: what I showed you is real. Write it down. "
            "Not because I've forgotten it. Because you might."
        ),
        "text_context": (
            "Habakkuk is writing during the Babylonian threat — Judah is about to be destroyed. "
            "This is the worst possible time for a vision. "
            "The circumstances are moving in the wrong direction. "
            "And God says: linger over it. "
            "The word 'plain' (2:2) means to engrave clearly so a runner can read it at full speed. "
            "The vision is meant to be legible under pressure."
        ),
        "theological_claim": (
            "Verse 3: 'Though it linger, wait for it; it will certainly come and will not delay.' "
            "The tension here is real — it lingers, but it will not delay. "
            "That's not a contradiction. It means the vision arrives exactly on time "
            "according to a schedule you cannot see. "
            "What looks like a delay from your position is precision from His."
        ),
        "application": (
            "What vision have you quietly stopped writing down? "
            "What have you started referring to in past tense that God still speaks about in future tense? "
            "Get it back out. Write it down. Put it somewhere you can see it when you're running. "
            "The appointment hasn't been cancelled. You just can't see the calendar."
        ),
        "altar_call": (
            "The thing you've been waiting on — God hasn't forgotten it. "
            "He wrote the due date before you wrote the vision. "
            "Stand at your watch. Take your position. "
            "What is appointed will come."
        ),
    },
    {
        "theme": "the Father's love",
        "passage": "Luke 15:11-32",
        "title": "He Ran",
        "series": "",
        "big_idea": "The Father's love doesn't wait for you to clean yourself up before it starts moving toward you.",
        "hook": (
            "We've all either been the younger son or the older son. "
            "Sometimes in the same week. "
            "The younger son is the one who took everything and left — "
            "who decided that what God had was less interesting than what the world was offering. "
            "The older son is the one who stayed and kept score — "
            "who did everything right and built a quiet resentment about it. "
            "\n\nJesus tells this parable to two audiences at once: "
            "sinners who think they've gone too far, and religious people who think they've done enough. "
            "And the Father in the story embarrasses both of them."
        ),
        "text_main": (
            "The younger son's speech is rehearsed. He's written it on the road home: "
            "'Father, I have sinned against heaven and against you. "
            "I am no longer worthy to be called your son; make me like one of your hired servants.' (v.18-19) "
            "\n\nBut he never gets to finish it. "
            "Verse 20 interrupts the speech with one of the most jarring images in scripture: "
            "'But while he was still a long way off, his father saw him and was filled with compassion for him; "
            "he ran to his son, threw his arms around him and kissed him.'"
        ),
        "text_word_study": (
            "DROMOS — Greek concept behind the word 'ran' (from trecho, to run swiftly).\n"
            "In the ancient Near East, a man of the father's age and status did not run. "
            "Running was undignified. It exposed the legs — a cultural dishonor. "
            "The Father ran anyway. He chose exposure over distance. "
            "His dignity was less important to him than the gap between him and his son."
        ),
        "text_context": (
            "A Jewish son who wasted his inheritance in Gentile territory — feeding pigs — "
            "would have faced what was called a 'kezazah' ceremony: "
            "the village would gather and publicly cut him off when he tried to return. "
            "By running to his son, the Father was racing to reach him before the village could. "
            "He was absorbing the shame so his son wouldn't have to face it alone. "
            "The robe, ring, and sandals (v.22) were not gifts. They were status markers. "
            "The Father was re-declaring his son's identity before an audience."
        ),
        "theological_claim": (
            "The Father is not waiting for you to finish your speech. "
            "He started running before you crossed the last hill. "
            "The love in this story is not conditional on how clean the son arrived. "
            "It's not even conditional on the apology — "
            "the embrace comes before the son speaks a word."
        ),
        "application": (
            "Stop building your speech. You don't need it. "
            "Whatever distance you've put between yourself and God — "
            "He has already outrun it. "
            "The question isn't whether He'll take you back. "
            "The question is whether you'll stop rehearsing your unworthiness long enough to notice He's already there."
        ),
        "altar_call": (
            "If you've been a long way off — this is the moment you start back. "
            "You don't have to have it figured out. "
            "You don't have to be clean. You don't have to finish the speech. "
            "Just turn around. He's already running."
        ),
    },
]


# ── Illustration bank ─────────────────────────────────────────────────────────

ILLUSTRATIONS: dict[str, str] = {
    "pressure": (
        "I work with a lot of men who look like they have everything together on the outside. "
        "Productive, present, functional. And completely alone in it. "
        "There's a version of strength that's just high-functioning collapse. "
        "The tree that bends but never breaks isn't a metaphor for resilience — "
        "sometimes it's a metaphor for a man who learned that feelings were a liability. "
        "God never called you to be a load-bearing wall. He called you to be a son."
    ),
    "community": (
        "My son Jaxon plays basketball. When he's off — foot wrong, rhythm wrong — "
        "he doesn't need a lecture. He needs someone to stand close enough to mirror what right looks like. "
        "That's what community is. You don't fix people by talking at them. "
        "You stand close enough that your rhythm starts to rub off."
    ),
    "forgiveness": (
        "There's a weight people carry that they've named something else — "
        "stress, distance, disconnection. "
        "But underneath it is almost always something they haven't released. "
        "Unforgiveness is not about the other person. "
        "It's you, still sitting in a courtroom that already adjourned, "
        "waiting for a verdict you were never supposed to deliver."
    ),
    "provision": (
        "I've had seasons where I couldn't see three months out. "
        "The business looked uncertain. The plan didn't hold. "
        "And every single time — not most times, every time — "
        "provision showed up in a form I didn't anticipate from a direction I didn't watch. "
        "God doesn't use the route you've been monitoring."
    ),
    "obedience": (
        "Most of the time, obedience isn't dramatic. "
        "It's not the burning bush moment. "
        "It's Tuesday morning, when the thing you know you should do "
        "is boring, uncomfortable, or inconvenient — "
        "and you do it anyway. "
        "Character is just what happens in those undramatic moments. Accumulated."
    ),
}


# ── Transitions ───────────────────────────────────────────────────────────────

TRANSITIONS = [
    "So here's where we've been, and here's where we're going — ",
    "That's the text. Now let me tell you why it matters today.",
    "Stay with me, because this is where it gets personal.",
    "Before we move, I want to make sure we didn't rush past what just happened in that verse.",
    "Now here's the turn — and this is where the sermon becomes a question for you specifically.",
]


# ── Main skill ────────────────────────────────────────────────────────────────

class SermonDraftingSkill:
    """
    Generates full or partial sermon content in Chris's 3-part format:
    HOOK → TEXT → TURN.

    Actions:
      draft         — full sermon outline (all 5 sections)
      sermon_intro  — opening hook only
      outline       — structural skeleton with main points
      illustration  — standalone story/illustration for a theme
      transition    — connecting bridge between sections
      altar_call    — closing application/invitation
      recent        — recent sermon themes from Faith lane memory
    """

    name = "sermon_drafting"
    description = (
        "Draft sermon content in Chris's format: Hook → Text → Turn. "
        "Actions: draft, sermon_intro, outline, illustration, transition, altar_call, recent. "
        "Optional: theme (identity/grief/purpose/father's love), passage."
    )

    def run(
        self,
        action: str = "draft",
        theme: str = "",
        passage: str = "",
        section: str = "",
        **kwargs: Any,
    ) -> str:

        if action == "illustration":
            return self._illustration(theme or section)

        if action == "transition":
            import random
            return random.choice(TRANSITIONS)

        if action == "recent":
            return self._recent_themes()

        seed = self._find_seed(theme, passage)
        if not seed:
            available = ", ".join(s["theme"] for s in SERMON_SEEDS)
            return (
                f"No sermon seed found for theme='{theme}' passage='{passage}'.\n"
                f"Available themes: {available}"
            )

        outline = self._build_outline(seed)

        if action == "sermon_intro":
            return f"SERMON: {outline.title}\nPassage: {outline.passage}\n\nHOOK\n{outline.hook}"

        if action == "outline":
            return (
                f"SERMON: {outline.title}\n"
                f"Passage: {outline.passage}\n\n"
                f"BIG IDEA: {outline.big_idea}\n\n"
                f"I. HOOK\n{outline.hook[:150]}...\n\n"
                f"II. THE TEXT — {outline.passage}\n"
                f"    Claim: {outline.theological_claim}\n\n"
                f"III. THE TURN\n{outline.application[:150]}...\n\n"
                f"IV. CLOSING\n{outline.altar_call[:100]}..."
            )

        if action == "altar_call":
            return f"ALTAR CALL / CLOSING\n\n{outline.altar_call}"

        # Default: full draft
        return outline.format()

    def _build_outline(self, seed: dict) -> SermonOutline:
        return SermonOutline(
            title=seed["title"],
            series=seed.get("series", ""),
            passage=seed["passage"],
            big_idea=seed["big_idea"],
            hook=seed["hook"],
            text_main=seed["text_main"],
            text_word_study=seed["text_word_study"],
            text_context=seed["text_context"],
            theological_claim=seed["theological_claim"],
            application=seed["application"],
            altar_call=seed["altar_call"],
            date=datetime.now().strftime("%B %d, %Y"),
        )

    def _find_seed(self, theme: str, passage: str) -> Optional[dict]:
        if not theme and not passage:
            idx = datetime.now().day % len(SERMON_SEEDS)
            return SERMON_SEEDS[idx]
        theme_lower = theme.lower()
        passage_lower = passage.lower()
        for seed in SERMON_SEEDS:
            if theme_lower and theme_lower in seed["theme"].lower():
                return seed
            if passage_lower and passage_lower in seed["passage"].lower():
                return seed
        return None

    def _illustration(self, theme: str) -> str:
        theme_lower = theme.lower().strip()
        for key, text in ILLUSTRATIONS.items():
            if theme_lower in key:
                return text
        # Return all if theme not found
        available = ", ".join(ILLUSTRATIONS.keys())
        return (
            f"No illustration found for theme '{theme}'.\n"
            f"Available: {available}"
        )

    def _recent_themes(self) -> str:
        try:
            from memory.supabase_backend import AxisMemoryBackend
            from memory.lanes import MemoryLane
            backend = AxisMemoryBackend()
            results = backend.recent(MemoryLane.FAITH, hours=720, limit=10)
            if results:
                lines = ["Recent Faith lane entries (last 30 days):"]
                for r in results[:8]:
                    preview = r.content[:100].replace("\n", " ")
                    lines.append(f"  • {preview}…")
                return "\n".join(lines)
        except Exception:
            pass

        lines = ["Available sermon themes:"]
        for seed in SERMON_SEEDS:
            lines.append(f"  • {seed['theme']} ({seed['passage']}) — \"{seed['title']}\"")
        return "\n".join(lines)
