"""
Axis School Outreach Skill

Built from the actual Pivot call scripts. Generates call openers,
handles objections, logs results, and tracks the pipeline.

Three script types:
  general    — staff PD + student programs combined (pivot-call-script)
  student    — student-only mental health workshops (pivot-student-call-script)
  speaking   — assemblies and graduation keynotes (pivot-speaking-call-script)

Supported actions:
  opener      — generate a call opener for a school (script type + state + contact role)
  voicemail   — generate a voicemail script
  email       — generate the follow-up email
  objection   — get the response to a specific objection
  stats       — pull the stats to drop in a call
  log         — log a completed call result
  pipeline    — show the call pipeline (hot/warm/cold counts + recent activity)
"""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


# ── State-specific hooks ──────────────────────────────────────────────────────

STATE_HOOKS = {
    "TX": "With federal funding cuts hitting Texas schools right now, districts need cost-effective solutions more than ever.",
    "CO": "With Colorado's May 1 mental health screening deadline coming up, schools are looking for programs they can activate fast.",
    "AZ": "With Arizona's counselor shortage at an all-time high, schools need scalable support that doesn't rely on a single counselor.",
    "MN": "With Minnesota's 2026-27 mental health mandate, schools need partners in place before the mandate kicks in.",
    "CA": "With California's $4.7 billion mental health investment, districts have funding available and need proven programs to point it toward.",
}

DEFAULT_HOOK = "Schools across the country are seeing increased demand for mental health support, and the ones winning are the ones who got ahead of it."


# ── Key statistics ────────────────────────────────────────────────────────────

STATS = {
    "prevalence":    "1 in 6 kids has a diagnosable mental health condition.",
    "early_onset":   "50% of lifetime mental health conditions begin by age 14.",
    "academic":      "Schools with mental health support see 15-20% academic improvement.",
    "disciplinary":  "25-30% fewer disciplinary incidents when social-emotional skills are taught.",
    "sadness":       "37% of high schoolers report persistent sadness or hopelessness.",
    "absenteeism":   "Absenteeism costs schools $3,000 to $5,000 per student.",
    "teacher_cost":  "Teacher burnout turnover costs schools $2.2 billion per year nationally.",
    "demand":        "58% of schools report increased demand for mental health services.",
    "seek_help":     "Students who hear mental health messaging from non-school adults are 2x more likely to seek help.",
}


# ── Objection handlers ────────────────────────────────────────────────────────

OBJECTIONS: dict[str, dict[str, str]] = {
    "general": {
        "no_budget": (
            "I hear you — budget is always the conversation. "
            "We start at $3,500, and most schools we work with cover it through Title IV-A, ESSER funds, or state grants. "
            "I can send you a one-pager that lists the funding sources most districts use. "
            "Would that be helpful?"
        ),
        "already_have_something": (
            "That's great — we're not trying to replace what you're doing. "
            "Most schools we partner with use us to fill the gap on the student side "
            "or add a staff resilience component their current program doesn't cover. "
            "What does the current program focus on?"
        ),
        "bad_timing": (
            "No problem at all. When would be a better time? "
            "I'll put it in my calendar and follow up then. "
            "Can I send you a quick overview in the meantime so you have it when you're ready?"
        ),
        "send_info": (
            "Absolutely. And to make sure I send you the most relevant information — "
            "is your bigger need on the staff side or the student side?"
        ),
        "academics_first": (
            "I completely understand the academic pressure. "
            "Here's the thing — the research is clear: "
            "schools that address mental health see attendance go up and referrals go down. "
            "Dysregulated students aren't learning, no matter how good the curriculum is. "
            "We're not competing with academics — we're removing the barriers to them."
        ),
        "need_to_check": (
            "Of course. Who would I need to loop in? "
            "Sometimes it's easier if we do a quick three-way call so I can answer their questions directly. "
            "Or I can send you a one-pager you can share with them — whatever works better for your process."
        ),
    },
    "student": {
        "cant_pull_from_class": (
            "Totally understood — that's actually why we build around advisory periods, homeroom, lunch blocks, or after school. "
            "We don't need to pull from core instruction time at all. "
            "And here's the honest truth: dysregulated students aren't learning in class anyway. "
            "This gives them the tools to actually be present."
        ),
        "parent_pushback": (
            "I get it — parent concerns are real. "
            "Everything we do is skills-based and evidence-informed, aligned with the same SEL standards "
            "your school is already required to address. "
            "We also offer a parent overview letter you can send home before we come in. "
            "That usually handles the questions before they get asked."
        ),
        "no_budget": (
            "We start at $3,500 for a single session. "
            "Most schools we work with fund it through Title IV-A, ESSER, state grants, or PTA. "
            "I can send you a one-page funding guide — it lists exactly which pockets most districts pull from."
        ),
        "counselor_covers_it": (
            "Your counselor is doing critical work — I'm not here to replace that. "
            "But here's the math: a counselor typically works with 20 to 30 students at a time. "
            "We come in and reach an entire grade. That's not competition — that's scale."
        ),
        "does_it_work": (
            "Yes. Schools we've worked with see 25 to 30% fewer disciplinary incidents "
            "and report 15 to 20% academic improvement after implementation. "
            "We also run pre and post surveys so you have data to show your administration."
        ),
        "wont_engage": (
            "That's the most common thing I hear before we show up — "
            "and the most common thing principals tell me after is that it was the quietest auditorium they've ever had. "
            "We don't lecture. We meet students where they are. Real scenarios, real language, real conversation."
        ),
    },
    "speaking": {
        "already_had_assembly": (
            "Mental health is one topic students want to hear again and again — "
            "not because they forgot, but because it lands differently each time. "
            "If you've already covered it this fall, I'd love to get on the calendar for the spring. "
            "What does your assembly schedule look like after January?"
        ),
        "how_much": (
            "It depends on the format — assembly, keynote, or multi-session. "
            "Let me send you the options with pricing so you can see what fits your budget. "
            "What format are you working with?"
        ),
        "wont_sit_through_it": (
            "I hear that a lot. "
            "Principals tell me it's the quietest auditorium they've ever had. "
            "I'm not up there giving a motivational speech — I'm a mental health professional "
            "talking to students about what they're actually going through. They feel seen. That keeps them in the room."
        ),
        "graduation_speaker_taken": (
            "No problem — keep me in mind for next year. "
            "And while I have you — would it make sense to talk about "
            "a student assembly before the end of the year? "
            "Those are usually easier to slot in."
        ),
        "what_makes_different": (
            "Most speakers are motivational — I'm a mental health professional with a Master's in Psychology "
            "and over ten years in this space. "
            "I'm also a middle school specialist. "
            "There's a difference between someone who inspires students and someone who can "
            "read the room and explain what's happening in their nervous system at the same time. "
            "That's what I bring."
        ),
    },
}


# ── Script templates ──────────────────────────────────────────────────────────

def _build_opener(
    script_type: str,
    school_name: str,
    contact_role: str,
    state: str,
    contact_name: str = "",
) -> str:
    hook = STATE_HOOKS.get(state.upper(), DEFAULT_HOOK)
    greeting = f"Hi{f', {contact_name}' if contact_name else ''}"

    if script_type == "speaking":
        if "graduation" in contact_role.lower() or "keynote" in contact_role.lower():
            return (
                f"{greeting}, my name is Christopher Davis — I'm a professional speaker "
                f"and mental health professional. I specialize in student mental health, "
                f"and I also do graduation keynotes for 8th grade promotion ceremonies. "
                f"Quick question — has {school_name} already booked a speaker for your "
                f"graduation this spring?"
            )
        return (
            f"{greeting}, my name is Christopher Davis — I'm a professional speaker "
            f"and I specialize in student mental health. I do auditorium-style assemblies "
            f"for middle schoolers — things like stress management, emotional regulation, "
            f"self-worth, and how to actually ask for help. {hook} "
            f"I wanted to reach out and see if {school_name} has anything like that on the calendar."
        )

    if script_type == "student":
        return (
            f"{greeting}, my name is Christopher Davis with Pivot Training and Development. "
            f"We run mental health workshops specifically for middle school students — "
            f"things like stress management, emotional regulation, and building healthy relationships. "
            f"{hook} "
            f"I'm reaching out to {school_name} because we have a program that's a really good fit "
            f"for 6th through 9th graders. Is this something {contact_role} would have a few minutes to hear about?"
        )

    # general (staff + student)
    return (
        f"{greeting}, my name is Christopher Davis with Pivot Training and Development. "
        f"We provide mental health professional development workshops specifically designed for middle schools — "
        f"both for staff wellness and student programs. {hook} "
        f"Most providers only do one or the other — we do both, and we customize everything to your school. "
        f"I wanted to connect with {contact_role} at {school_name} to see if this is something worth a conversation."
    )


def _build_voicemail(script_type: str, school_name: str, state: str) -> str:
    hook = STATE_HOOKS.get(state.upper(), DEFAULT_HOOK)

    if script_type == "speaking":
        return (
            f"Hi, this is Christopher Davis calling for {school_name}. "
            f"I'm a professional speaker specializing in student mental health — "
            f"I do both assemblies and graduation keynotes for middle schools. "
            f"{hook[:80]}... "
            f"I'd love to connect — I'll follow up with an email in the next five minutes. "
            f"Thanks."
        )
    return (
        f"Hi, this is Christopher Davis from Pivot Training and Development calling for {school_name}. "
        f"We provide mental health workshops for middle school staff and students. "
        f"{hook[:80]}... "
        f"I'll follow up with a quick email in the next five minutes with more details. "
        f"Thanks so much."
    )


def _build_email(script_type: str, school_name: str, state: str) -> str:
    hook = STATE_HOOKS.get(state.upper(), DEFAULT_HOOK)

    if script_type == "speaking":
        return f"""Subject: Student Mental Health Assembly + Graduation Keynote — {school_name}

Hi,

I'm Christopher Davis — a mental health professional with a Master's in Psychology and over 10 years in the field.

I specialize in student mental health programming for middle schools. {hook}

Here's what I offer:

Student Assemblies (45–60 min, full grade or whole school):
• Mental health awareness and stigma reduction
• Stress, anxiety, and emotional regulation
• Self-worth and identity
• Resilience and adversity
• Social media and mental health

Graduation Keynotes (15–25 min, 8th grade promotion):
Not the typical "follow your dreams" speech. I talk about the mental health side of transition — protecting your peace, identity, and why this moment is a checkpoint, not a finish line. Graduations are May–mid-June, so the calendar fills fast.

I'd love to set up a 15-minute call to see if there's a fit.

Christopher Davis, M.S.
Pivot Training & Development
"""

    program_lines = """
• Stress Management and Coping Skills (students)
• Emotional Regulation and Impulse Control (students)
• Recognizing Signs of Mental Health Struggles (staff)
• De-escalation and Crisis Response (staff)
• Staff Resilience and Burnout Prevention
• Building a Mentally Healthy School Culture
""".strip()

    return f"""Subject: Mental Health Workshops for {school_name} Staff & Students

Hi,

I'm Christopher Davis with Pivot Training & Development — we provide mental health workshops for middle schools, both for staff and students.

{hook}

Our programs include:
{program_lines}

Everything is on-site, interactive, and customized to your school's needs. We start at $3,500 and most schools cover it through Title IV-A, ESSER funds, or state grants.

I'd love to set up a 15-minute call to learn more about what you're seeing at {school_name} and whether we'd be a good fit.

Christopher Davis, M.S.
Pivot Training & Development
"""


# ── Call logger ───────────────────────────────────────────────────────────────

@dataclass
class CallLog:
    school_name: str
    contact_name: str
    contact_role: str
    script_type: str
    state: str
    outcome: str           # "connected" | "voicemail" | "no_answer" | "not_interested"
    rating: str            # "hot" | "warm" | "cold"
    follow_up_date: str    # ISO date string
    email_sent: bool
    notes: str = ""
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


# ── Main skill ────────────────────────────────────────────────────────────────

class SchoolOutreachSkill:
    """
    Axis school outreach skill — generates scripts, handles objections,
    logs calls, and reports on the pipeline.
    """

    name = "school_outreach"
    description = (
        "Generate school outreach call scripts, handle objections, log calls. "
        "Actions: opener, voicemail, email, objection, stats, log, pipeline. "
        "Script types: general, student, speaking."
    )

    def run(
        self,
        action: str = "opener",
        script_type: str = "general",
        school_name: str = "[School Name]",
        contact_role: str = "the principal",
        contact_name: str = "",
        state: str = "",
        objection: str = "",
        **kwargs: Any,
    ) -> str:

        if action == "opener":
            return _build_opener(script_type, school_name, contact_role, state, contact_name)

        if action == "voicemail":
            return _build_voicemail(script_type, school_name, state)

        if action == "email":
            return _build_email(script_type, school_name, state)

        if action == "objection":
            obj_map = OBJECTIONS.get(script_type, OBJECTIONS["general"])
            # Find closest match
            objection_lower = objection.lower()
            for key, response in obj_map.items():
                if any(word in objection_lower for word in key.split("_")):
                    return response
            # Fallback: list available objections
            return (
                f"Available objections for '{script_type}' script: "
                f"{', '.join(obj_map.keys())}. "
                f"Try: axis.run('objection', script_type='{script_type}', objection='no_budget')"
            )

        if action == "stats":
            lines = ["Stats you can drop in the call:"]
            for key, stat in STATS.items():
                lines.append(f"  • {stat}")
            return "\n".join(lines)

        if action == "state_hooks":
            lines = ["State-specific hooks:"]
            for state_code, hook in STATE_HOOKS.items():
                lines.append(f"  {state_code}: {hook}")
            return "\n".join(lines)

        return f"Unknown school_outreach action: {action}"
