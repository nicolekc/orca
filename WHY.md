# The death spiral of AI-assisted product development

```
  "Build me a feature"
         ↓
  First result: impressive. 80% there.
         ↓
  "Fix this bug" → fixed, but broke something else
         ↓
  "Fix that too" → fixed, but subtle regression
         ↓
  "Be more specific" → follows instructions literally, stops thinking
         ↓
  Reactive patching. Whack-a-mole. Going in circles.
         ↓
  Weird warts buried 3 steps back. Don't know what depends on them.
         ↓
  Ship it broken   — or —   throw it away and start over.
```

**Your instinct is to give more detail. It makes things worse.**

```
  What you try             What actually happens
  ─────────────────────    ─────────────────────────────────────────
  More detailed prompts  → Worse results. Follows instructions off a cliff.
  More iterations        → More drift. Each fix breaks something else.
  More steering          → Less coherence. You break its long-horizon planning.
```

**This is not a skill issue. It's a structural one.** And it hits hardest when you're building product — not patching bugs in existing code, but generating significant new greenfield territory where every decision compounds and there's no existing architecture to anchor against.

| | What's happening | The effect |
|---|---|---|
| 🔄 **Context decay** | Every time you steer, you break its long-horizon planning | Loses the thread of what the system *should become*. Optimizes for what's on your screen right now. |
| 🔨 **Local optimization** | Bug → fix bug. Test fails → patch test. Repeat. | Whack-a-mole. Each swing makes the next mole harder to hit. Nobody asks "is this the right approach?" |
| 🌊 **Architecture drift** | No explicit phases. Everything is one long vibe session. | You optimize what you can see, not what the system needs. Decisions get buried in the diff. |
| 🪤 **The specification trap** | More detailed instructions → *worse* results | Detailed steps *replace* the agent's reasoning instead of informing it. Give it the gist and it uses judgment. Give it exact steps and it walks off a cliff. |

**This is the same problem that engineering teams solved decades ago with code review, design docs, and tech leads.** But those solutions assume human teams. You're working with AI agents that start fresh every session, don't remember what they decided yesterday, and are constitutionally inclined to be helpful rather than critical of their own work.

---

### ❌ The solutions people suggest don't help

| "Just use..." | Why it fails |
|---|---|
| **Jira / Linear** | Assumes persistent workers who remember. AI sessions are ephemeral. |
| **CI/CD pipelines** | Catches bugs *after* they're written. You need to prevent incoherent work from starting. |
| **Heavy agent frameworks** | 30 agents, custom vocabulary, mandatory installs. You wanted a tool, not a religion. |
| **Longer prompts** | *More detail → worse results.* The agent follows your steps off a cliff instead of using judgment. |
| **"Just keep iterating"** | This IS the death spiral. Each iteration drifts further. |

---

### ✅ This framework is four independent tools

| | Tool | What it does | Without it |
|---|---|---|---|
| 🌱 | **The Seed** | Engineering standards that persist across every session | Each session reinvents its own, or has none |
| 🎭 | **Perspectives** | Architect, reviewer, implementer — different lenses on the same work | One voice writes and approves its own code |
| 💾 | **Project Context** | A directory where preferences, background material and handoff notes accumulate across sessions | Every session starts from zero |
| 🎯 | **One-Shot Builds** | A whole app from a goal, through revertable milestones, using the other three | Work collapses into one long vibe session |

> **Use all four. Or just one. Nothing requires anything else.**
>
> Want the Seed to improve any Claude session? Copy one file.
> Want perspectives too? Copy one folder.
> Want a full build running autonomously? Still just files in a directory.

---

## The deeper story

### Why "just use Claude Code" isn't enough

| Scope | The gap |
|---|---|
| 🔬 **Single session** | Great first result, but the refinement loop is where quality collapses. No separate reviewer perspective. It patches locally instead of reconsidering globally. Helpful when it should be critical. |
| 🔗 **Across sessions** | Context doesn't persist. Design rationale, ruled-out approaches, discovered constraints — gone. Next session re-makes decisions the last one already disproved. |
| 🏗️ **Project scale** | Can't tell "code exists" from "actually works." Features accumulate without anyone verifying they cohere. |

This framework fills those gaps with lightweight structure — not process for the sake of process, but the minimum scaffolding that prevents the death spiral.

### 🧪 The counterintuitive insight

After 160+ tasks of real AI-assisted development:

> **The more detailed the task specification, the worse the results.**

| Give Claude... | It does... |
|---|---|
| The gist — intent, context, the "why" | Uses judgment. Walks around obstacles. Makes senior-engineer decisions. |
| Exact step-by-step instructions | Follows them off a cliff. Forces step 3 to work instead of reconsidering. Optimizes against your spec, not reality. |

**The sweet spot: rich context + trust.** Enough to understand the intent. Enough freedom to execute with judgment. This is how a good tech lead manages a strong team — and how you should manage AI agents.

### 🚫 What this is NOT

| | |
|---|---|
| Not a project management tool | No dashboards, burndowns, or sprint planning |
| Not an agent framework | No custom runtime, agent registry, or execution engine |
| Not a replacement for Claude Code | Makes it better at building real software. Doesn't compete with it. |
| Not all-or-nothing | The heaviest thing about it is choosing which parts you want |

### 👋 Who this is for

**You, if:**
- You're using AI to build *product* — new features, new systems, greenfield territory where decisions compound
- You've felt the excitement of the first AI result → then the frustration of the refinement death spiral
- You've abandoned a project because the codebase became untrusted spaghetti
- You want to tech-lead AI agents like a good tech lead manages humans

**Not you, if:**
- Fixing bugs or making isolated changes to a large existing codebase (Claude Code is already great at this)
- Building one-off scripts or throwaway prototypes
- Large human team with process that already works
