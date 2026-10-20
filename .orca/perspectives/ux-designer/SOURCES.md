# Sources — UX designer skill hierarchy

Provenance for the skills the `ux-designer` perspective dispatches to, and every local
modification made to them. Forked files also carry a fork-point note in their own header.

The hierarchy itself is documented once, in the perspective beside this file. This file records
where each piece came from and what we changed.

Skills in this hierarchy do not name each other. The perspective maps a need to a skill; each
skill describes only what it owns. That keeps the dependency one-way, so a skill can be swapped
out or read on its own.

These skills hold attention; they do not teach. An agent already knows how to design and knows
current practice, often better than whoever writes the rules. What it loses, when a task points
it at something else, is the attention to apply that knowledge. A line earns its place by
choosing among good options the one this framework prefers, or by reminding the agent of
something it does well once reminded. A line that explains how to do what an agent already does
well when given that task is cut: it ages, drifts from practice, and costs every reader context.

Every rule has one owner. The perspective holds the routing and nothing else. The new-surface
rule and the intent-versus-mechanics tiebreak live in `product-ux-design`, where the agent that
hits them is already reading; the perspective's second copy of each is gone. What a project's
visual defaults are is `ui-ux-pro-max`'s, because that is what generates them; where a token
value comes from once they exist, and the form it is written in, is `ui-mechanics`'s. Which of a
product's surfaces may take values from outside its own language is `product-ux-design`'s, since
it turns on who sees the surface. Where two skills below the first disagree about one detail, the
perspective settles it: the skill written for that thing wins over `ui-mechanics`' general rule.
Where the project already has its own pattern for the job, such as how it confirms an action or
what a chart color means, the project's wins over every skill. A simulated admin page met the
modal decision tree against the project's own confirm attribute and structural skeletons against
its own result component, and a chart met `dataviz`'s first slot against the brand's chart color.
The value rule in `ui-mechanics` covers none of them.

The perspective's routing table reads action first and descends: each row names the skill, what
it decides, and what the agent is about to do. Read top to bottom, each row takes the ones above
it as settled and decides something narrower, which is the hierarchy the rest of this file
describes.

Each `description` opens with the condition that should fire the skill and closes with the
conditions that should not. The negative clauses stay in the descriptions, where they stop a
skill from firing on work it does not own; they are cut from the bodies, where the reader has
already arrived and needs to be told what to do instead.

---

## `product-ux-design`

**Source:** authored for this framework, 2026-09-22, from a design-session draft by the owner.
Not vendored from a public repository.

**Changes from the draft:**

- Cut the graph/network block from Information Visualization (stable node identity, edge
  ambiguity, hairball prevention, mental-map preservation on layout change). No project using
  this hierarchy had network visualization. Restore it if one appears.
- Cut the rest of Information Visualization down to the two paragraphs that are posture rather
  than chart mechanics; encoding choice, legends, and palette limits are the `dataviz` skill's.
- Cut "When many categories exist, consider focus-plus-context techniques…" as a restatement of
  the kept "Preserve context when highlighting subsets of data."
- Cut "When a visualization introduces a concept unfamiliar to most users, teach it through
  interaction…" as a restatement of Product Copy's "Teach unusual interactions at the moment
  they become relevant."
- Cut the Accessibility bullets, keeping the section's first sentence. Depth is in the reference library.
- Cut "Prioritize content and interaction based on importance" from Responsive Design as a
  restatement of the Visual Hierarchy section.
- Cut from Components and Controls: the accessible-primitives rule, the existing-component-system
  rule, the every-card and every-pill rules. The first two are the mechanics skill's; the second
  two restate Design Posture's list of generic AI-interface habits.
- Added "What to settle here": the decisions this skill owns, a one-line "look elsewhere for"
  that sets the extent without naming a destination, the precedence rule, and the new-surface
  rule. A first pass named the things the skill does not decide and linked up to the perspective;
  both were cut. Naming absences puts them in context in negative form and gives the reader
  nothing to do, and the up-link couples the skill to the file that dispatches it.
- Cut the new-surface rule down to the one thing about it that is a design-intent decision:
  inherit the visual language of the product you are extending. Everything else it accumulated is
  gone — a list of invented house defaults, a rule for where to find defaults when a project has
  none, and a "carry on and report what you chose" clause added to keep it from gating. A project
  with no visual language is `ui-ux-pro-max`'s case; not stopping to ask is `seed.md`'s.
- Added to Review Mode: use rendered verification when available and necessary, where necessary
  means once per significant change and any time appearance cannot be inferred from the code
  (layered or measured layout, interaction and state changes, motion, real content lengths).
  Batch the renders when several components on one view are changing. A first pass named one
  project's test harness.
- Added to the new-surface rule: who sees the surface decides how far inheritance goes. A
  customer-facing surface uses the product's own tokens for every role, found on its neighboring
  surfaces; an internal one, such as an admin panel, may take better values from established
  practice where the product's leave a gap, written in the codebase's form. A product's customers
  see only its colors; its admin panel is where values from this hierarchy earn their place.
- Made rendered verification explicit about the first look: necessary includes looking at the
  current interface before judging it. As written, "once per significant change" read as a check
  after the work, and a simulated "it feels cluttered" review judged the page from its JSX alone.
- Deleted from Review Mode: the five-finding cap, the no-exact-values rule, the no-fabrication
  rule, and the say-when-it-is-working rule. Deleted from Build Mode: the interaction-intent
  paragraph and the no-comprehensive-spec rule. Each states general reviewing and building
  conduct rather than anything about design, so each belongs to the working style, not here.
- Deleted the component-choice rule ("intervene only where it affects usability or hierarchy").
  What this skill settles is already stated positively above it.
- Rewrote the frontmatter description. The draft's topic list read as a scope limit, which would
  have kept the skill from firing on tasks it owns. It now states that this is the top of the
  hierarchy and gives the triggers, so the skill is reached even when the perspective is not
  loaded.
- Added that an owner asking for an expressive look has given it a purpose: build it from the
  product's own tokens, keep text readable over it, and say what it costs. In a simulated owner
  request for gradients and glow, the line against those patterns met the request head on, and the
  agent had to assemble an answer from preferences, a memory file, and `seed.md`.

---

## `ui-mechanics`

**Source:** fork of [`ui-skills`](https://github.com/edmundmiller/dotfiles/tree/HEAD/skills/catalog/ui-skills)
by Edmund Miller (edmundmiller/dotfiles), MIT. Fork point 2026-09-22. `LICENSE` in the skill
directory is upstream's.

**Why forked rather than used unchanged:** its animation section forbids motion outright, which
contradicts the design intent above it, where spatial transition carries meaning.

**What it is for.** The rules that survive any design: how the browser behaves, the idiom of the
utility-class and primitive libraries a project uses, and the form a value takes in the project's
code. Not taste, which is decided above it, and not library or token choice, which the project
decides in its own code and preferences. A project whose UI rules genuinely differ states them
there, not here.

**Changes:**

- Renamed from `ui-skills` to `ui-mechanics`, via a first pass as `ui-component-rules`. The
  upstream name gave no signal about when to fire, and "component rules" described the contents
  wrongly: most of the file is platform behavior, not component construction.
- Deleted the whole `## Design` section: `NEVER use purple or multicolor gradients`, the shadow
  scale rule, the empty-state rule, the one-accent-per-view rule, the theme-tokens-first rule.
  All taste, all decided above this skill, and each weaker than the version stated there.
- Deleted `NEVER add animation unless it is explicitly requested`. A direct contradiction of the
  motion intent above it, which decides when motion is warranted.
- Deleted `MUST respect prefers-reduced-motion`, and `NEVER use gradients unless explicitly
  requested` and `NEVER use glow effects as primary affordances` along with the Design section.
  Each is stated above with more specificity.
- Deleted `MUST show errors next to where the action happens` as a restatement of "feedback should
  appear where the action occurred."
- Deleted `SHOULD prefer Base UI for new primitives`. Which primitive library to use is the
  project's decision; the two rules above it — use the project's primitives, never mix systems —
  carry the load without picking a winner. It also read as a conflict with shadcn, which generates
  components on top of a primitive library rather than being one.
- Moved the three library names (`Base UI`, `React Aria`, `Radix`) off the accessible-primitives
  rule and into the React section as a fallback for a project with no primitive library yet. On
  the rule itself they read as a requirement, which a server-rendered component cannot meet.
- Added `## Writing a value in the project's form`. A value can come from a lookup, a reference
  snippet, or a handed design; its form comes from the project — a color becomes the role token,
  raw CSS becomes utility classes, a component from another stack becomes the project's
  equivalent, a pixel value becomes a scale step, and the project's linters decide the rest.
  A project may forbid hex and primitive colors and name colors by semantic role, while the
  references' snippets and this hierarchy's generated tokens are written in literals. The rule is
  stated for form in general, not color alone, because the same gap opens for CSS, components,
  and sizes.
- Moved the React-only rules (`motion/react`, the `cn` utility, the primitive-library fallback,
  the `useEffect` rule) into a `## React` section, and said in the intro that the rest hold in
  server-rendered templates and plain HTML, reading a utility class as the CSS behind it. Stated
  unconditionally, they left every agent in server-rendered code working out which MUSTs to drop.
- Generalized the lines that assumed one stack: the spacing scale is the project's, falling back
  to Tailwind's only where the project uses Tailwind; the destructive-action rule asks for a
  confirmation dialog rather than `AlertDialog`; `h-screen` is named with its CSS; the token line
  includes a Tailwind config file, which is where a Tailwind v3 project registers its color tokens.
- Replaced `SHOULD use tw-animate-css for entrance and micro-animations in Tailwind CSS` with the
  project's own mechanism first — its transition helpers or its theme's keyframes — and
  `tw-animate-css` only in a Tailwind v4 project with none. The package is built for Tailwind v4;
  a v3 project that animates through its framework's transition helpers and its config's
  keyframes was asked for a dependency it cannot use.
- Opened the React section with one line: its libraries are for React code that has not chosen
  one. React islands inside a larger app may already have Radix and a `cn` of their own, and no
  `motion`; a bare MUST read as an instruction to add dependencies there.
- Rewrote the token line to say where tokens come from in general — a Tailwind `@theme` block, a
  CSS variable block, or the component library's config — falling back to the defaults of the
  user's preferred UI libraries, and to Tailwind's where none are stated. A first pass named one
  project's files, which would rot and does not generalize; a second went straight to Tailwind,
  skipping the preferences the user has already recorded.
- Rewrote the frontmatter description. Upstream's "Use when explicitly requested" would have kept
  the skill from firing on ordinary UI work, leaving the hierarchy without its mechanics layer.
- Moved the fork-point note from the header to the footer, so the rules start the file.
- Cut "fixing layout, z-index" from the description. The body has nothing on clipping or
  stacking, so a simulated fix for a menu clipped inside a modal opened the skill on that promise.
  It found nothing on the bug, only two rules that pushed toward a bigger change. Agents already
  debug layering well, and nothing here needs reminding.
- Kept verbatim: `NEVER exceed 200ms for interaction feedback` (interaction feedback is not
  governed above) and `MUST use motion/react when JavaScript animation is required` (already
  conditional).

---

## `ux-designer`

**Source:** vendored, MIT, Copyright (c) 2026 Szilárd Hajba. `LICENSE` in the skill directory.
The 28 files in `references/` are the reason to keep it.

**Changes:**

- Rewrote the frontmatter description to advertise a topic reference library rather than a design
  authority, and to say when to reach for it. As written, it auto-invoked for tasks decided above
  it, loading a competing posture before the hierarchy could be consulted. It names the topics it
  holds and no other skill.
- Rewrote that description again to open on what the agent is about to do — "Read this once you
  know what you are building and need the established practice for building it" — rather than on
  an abstract need for established practice. "When one UX topic needs established practice rather
  than judgment" is not a condition an agent recognizes itself to be in, so the skill would
  almost never fire. The topic list now matches `references/`, and one line says to reach for it
  on any topic with accepted practice behind it, so an inexact match does not read as a no.
- Deleted `## Core Design Philosophy` (User-Centered Design, Calm & Clarity Over Complexity, the
  UX Hierarchy of Needs). Superseded by the design intent above it.
- Deleted `## Quick Reference Checklist` (~85 lines). A parallel checklist for topics the
  `references/` hold in depth, carrying its own conflicting durations.
- Deleted two rows from Key Numbers: `Animation | 300-500ms` and `Touch feedback | < 100ms`.
  Interaction durations belong to the mechanics skill.
- Replaced the 21-bullet "Use this skill when" list and the "You are a UX design expert" lede with
  a short "When to use": read one reference, never the library. The bullet list duplicated the
  `references/` index below it and claimed UI design and code review, which are decided above.
- Rewrote "When to use" to state the occasion and the cost of skipping it, then how to read.
  A first pass stated only how — which is not when, and left the agent no reason to open a file
  before writing the pattern from memory.
- Replaced "do not open a second reference to compare" with what it was guarding against: two
  references can give different numbers for the same thing, so take the one whose topic is closer
  to the work. The size of the library is stated as the reason to read narrowly.
- Added that the code in a reference shows the pattern and its colors and CSS are placeholders,
  while the numbers the text recommends are the practice. The references carry about a hundred
  hex literals at use sites; an agent copying a snippet into a project with its own tokens would
  otherwise copy those too.
- Relabeled the index line for `18-data-visualization.md` to dashboard layout, KPI cards,
  drill-down, and empty or stale data states. The old label indexed it as chart guidance, which
  is `dataviz`'s.
- Converted the token-definition snippets in `04-visual-design.md` and `11-design-systems.md` to
  OKLCH, and added to 11 why a scale is defined in it: its lightness is perceptual, so steps are
  even and equal lightness looks equal across hues. The use-site hex elsewhere is left to the
  placeholder line above.
- Scoped two Key Numbers rows: the touch target to touch screens, and 16px body text to long-form
  reading. Read as universal, they argued against the density of a desktop admin table.
- Dropped `role="grid"` from the basic table in `21-data-tables.md`. Grid is for tables with
  cell-by-cell keyboard navigation, as that file's keyboard section says. On a static table it
  announces a widget that is not there.

**Kept despite overlap:** `## Anti-Patterns to Avoid`. Each of its 25 entries is a pointer into
`references/`, so its value is navigation.

**Unused so far, left in place:** the canvas, presence/sync, user-research, and
voice/multimodal references (~3,400 lines). An unread reference costs nothing.

---

## `ui-ux-pro-max`

**Source:** vendored, MIT, Copyright (c) 2024 Next Level Builder. `LICENSE` in the skill directory.
Kept for the one thing nothing else does: generating a design system from nothing.

**Changes:**

- Rewrote the frontmatter description and the `## When to Apply` section down to two jobs —
  establish a design system, look something up — each stated as a condition and an action, plus
  a "when not to use it". Its previous scope covered essentially all UI work. Dropped the item
  counts from both: they say nothing about when to use the skill.
- Replaced "direction" with "design system" throughout. What this skill generates is tokens,
  palette, and type — an implemented system, not a mood.
- Rewrote the lookup job around the moment it is needed: you are about to write a concrete value
  you have no source for — a color (first written "a hex code"), a font, an icon name, a duration
  and easing, a section order, a framework rule — so search here instead of inventing it. Two
  earlier passes described the contents instead ("one concrete answer", then "which palette suits
  this product type"), and both stated the answer rather than the state the agent is in. An agent
  about to pick a color does not know that a palette for its product type exists to be asked for.
- Gave the generate step the project's stated intent as an input: read its agent instructions,
  the preferences recorded for it, and the UI libraries already in its dependencies, treat those
  as the starting point, and use the database for what they leave open. This is where a project's
  visual defaults get decided, so the rule lives here and nowhere above.
- Scoped "do not use it on a project that already has a visual language" to generation. As
  written it also blocked the lookups, which are exactly what an established project needs when
  its tokens leave a question open.
- Deleted `## Rule Categories by Priority` (the 10-row priority table). Every row is owned
  elsewhere in the hierarchy, and its durations and line-heights conflicted.
- Retitled Step 2 from "REQUIRED for new pages/projects" to "only when establishing one",
  and scoped "Always start with `--design-system`" to that case. Run against a project that already
  has tokens, `--design-system --persist` writes a second design system beside the implemented one.
- Repaired the "If a search returns 0 results" fallback, which pointed at the deleted priority
  table.
- Replaced six troubleshooting rows that routed to `references/quick-reference.md` with two that
  end the path instead of forwarding it: one says those questions are not in this database, the
  other says the database recommends and cannot judge.
- Retitled "Before Delivering App UI" to "Before Delivering Native/Mobile App UI", matching the
  scope notice already inside `references/pro-rules.md`.
- Replaced `python "${CLAUDE_PLUGIN_ROOT}/.claude/skills/ui-ux-pro-max/scripts/search.py"` in
  every command with `python3 "${CLAUDE_SKILL_DIR}/scripts/search.py"`. Here the skill is not a
  plugin, so the old variable was empty and the path resolved to `/.claude/...`; some machines
  have no `python`. `${CLAUDE_SKILL_DIR}` is filled in when the skill is loaded as a skill, and
  "Running the search tool" says what to put in when the file is read directly. A first pass
  wrote an absolute path, which held only in one checkout.
- `--design-system` output writes colors in OKLCH (`hex_to_oklch` in `design_system.py`, with
  tests), and the establish job says to write them into the code as role-named CSS custom
  properties. That is the current convention — Tailwind v4 and shadcn define tokens this way — and
  an established project's own form still wins, per `ui-mechanics`. `--json` converts its colors
  the same way (`colors_as_oklch`), after a simulated run found it giving hex where the default
  output gave OKLCH. The database tables keep hex; the lookup job says to write a color in the
  project's form.
- Added a small-tool case to "when not to use it": a personal utility or an internal page outside
  any product takes its stack's defaults and looks up only what they leave open. A simulated
  internal tool fitted neither existing case — it has no visual language, and nobody means it to
  be "deliberately not a sibling" — and reached lookup-only mode through `seed.md` rather than
  through anything here.
- Removed the persist step (`MASTER.md` and its page overrides). The tokens written into the
  code are the design system, and a file beside them restating them is a second copy that drifts.
  A simulated new project was told both to persist `MASTER.md` and to write tokens into code, and
  held its design system in two places.
- Step 1 detects the stack of the surface being built, not the repository. A server-rendered
  app with React islands lists React in its `package.json`, so detection from dependencies would
  send a server-rendered page to `--stack react`; a Tailwind-styled server template is
  `html-tailwind`.

---

## `dataviz`

**Source:** bundled with Claude Code, not vendored here. Unmodified.

Owns chart and dashboard construction: form heuristic, color formula and validator, mark specs,
interaction rules. The two encoding-versus-state rules that are posture rather than construction
stay with design intent.

---

## Considered and not taken

- **`web-component-design`** (wshobson/agents) — compound components, render props, a cva Button.
  A project using `cva` with shadcn already generates the pattern.
- **`design-code`** (plugin87/ux-ui-agent-skills) — its verification gates duplicate
  a project's own UI test harness, which knows the actual app. Its 8-state component checklist
  informed the state list kept in Components and Controls.
- **`ui-design`** (mblode/agent-skills) — well built, but a mode-dispatch system presuming a family
  of sibling skills (`product-design`, `ui-verification`, `ui-animation`, `typography-audit`,
  `ax-audit`, `ghostwriter`). Two ideas worth revisiting if Review Mode needs more teeth: its load
  contract (an audit that reads the build guidelines becomes a redesign) and its deslop ladder
  (delete, reduce, reconcile, restyle).
- **`frontend-design`** (dmmulroy) — directs the agent toward a bold, memorable aesthetic:
  unexpected layouts, asymmetry, atmospheric backgrounds. The inverse of the posture here.
