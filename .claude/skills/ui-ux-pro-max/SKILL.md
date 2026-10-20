---
name: ui-ux-pro-max
description: >
  Use when a project needs a visual language invented from nothing: no tokens,
  no palette, no type choices, and deliberately not a sibling of the projects
  around it. Generate the design system once and write it into the project's
  code.
  Use it also whenever you are about to invent a concrete value you have no
  source for: a color, a font, an icon name, a shadow or radius, an
  animation duration and easing, the section order of a landing page, or a
  rule for the framework you are in. It holds real values with import lines
  and working snippets, so search for one instead of making it up. Do not
  generate a second design system for a project that already has a visual
  language; read that language and look up only what it leaves open. Do not
  use it to review an interface or to judge whether a design is working: it
  recommends from a database and cannot tell whether a recommendation suits
  the product.
---

# UI/UX Pro Max - Design Intelligence

Searchable database of design rules across styles, color palettes, font pairings, product types, UX guidelines, icons, GSAP motion presets, chart types, and technology stacks.

## When to Apply

### Establish a design system

Confirm first that the project has no visual language of its own and is deliberately not a sibling of the projects around it.

Then read what the project has already said about how it should look — its agent instructions, the preferences recorded for it, the UI libraries already in its dependencies. Take those as the starting point and use this database for what they leave open: a palette built around a stated brand color, body type that pairs with a chosen heading face, motion values for the library already installed. Generate from nothing only where nothing has been stated.

Run `--design-system` and write the result into the code as CSS custom properties named for their role, with the OKLCH values the output gives. Those tokens are the project's visual language from then on. On every later task read them from the code instead of regenerating, and keep no copy of them anywhere else.

### Look something up

You are about to write a value you have no source for — a color, a font, an icon name, a duration and easing, a section order, a framework rule. Search for it here and use what comes back, rather than inventing it and having it disagree with everything around it. The tables carry import lines and working snippets, so the answer is usually close to pasteable. They store colors as hex; write a color in whatever form the project writes colors. Take it and go back to what you were doing.

### When not to use it

Do not generate one for a small tool that needs no visual language of its own — a personal utility, an internal page outside any product. Take the defaults of the stack it is built in, and look up only what they leave open.

Do not generate a design system for a project that already has one. Read the project's own tokens instead, and come back here only for what they leave open — generating beside an implemented system leaves the project with two.

Stop if the question is whether a design is working. This database recommends; it cannot judge. Hand that question back to whoever settles what the interface has to communicate.

## Running the search tool

The search script lives inside this skill's own directory, not the project directory. Always invoke it by its full path — do not assume a particular working directory. The commands below start from this skill's directory; if one shows a variable where that path should be, put in the directory this SKILL.md is in:

```bash
python3 "${CLAUDE_SKILL_DIR}/scripts/search.py" "<query>" --domain <domain>
```

Requires Python 3.x, no external dependencies.

## Workflow

### Step 1: Analyze User Requirements

Extract from the user request:
- **Product type**: SaaS, e-commerce, portfolio, dashboard, entertainment, tool, productivity, or hybrid
- **Target audience & context**: age group, usage context (commute, leisure, work)
- **Style keywords**: playful, vibrant, minimal, dark mode, content-first, immersive, etc.
- **Stack**: detect it from the surface you are building, since one repository can hold several. A server-rendered template styled with Tailwind is `html-tailwind`, even where the repository also has React. Otherwise check `package.json` deps (react/next/vue/svelte/nuxt/@angular), `pubspec.yaml` (Flutter), `*.xcodeproj`/`Package.swift` (SwiftUI), `composer.json` (Laravel), or React Native markers (`app.json` + `react-native` dep). If nothing is detectable, ask the user or default to `html-tailwind`. **Never assume a stack** — a hardcoded default silently misroutes every recommendation.

### Step 2: Generate Design System (only when establishing one)

When establishing a design system, start with `--design-system` to get comprehensive recommendations with reasoning:

```bash
python3 "${CLAUDE_SKILL_DIR}/scripts/search.py" "<product_type> <industry> <keywords>" --design-system [-p "Project Name"]
```

This searches product/style/color/landing/typography domains in parallel, applies reasoning rules from `ui-reasoning.csv`, and returns pattern, style, colors, typography, effects, and anti-patterns to avoid. Colors come out in OKLCH, each paired with its CSS variable.

**Example:**
```bash
python3 "${CLAUDE_SKILL_DIR}/scripts/search.py" "beauty spa wellness service" --design-system -p "Serenity Spa"
```

### Step 2b: Design Dials (optional)

Three optional 1-10 sliders that tune `--design-system` output without changing your query. Add any combination of them to the same command:

```bash
python3 "${CLAUDE_SKILL_DIR}/scripts/search.py" "<query>" --design-system --variance <1-10> --motion <1-10> --density <1-10>
```

| Dial | Low (1-3) | Mid (4-7) | High (8-10) |
|------|-----------|-----------|-------------|
| `--variance` | Centered / minimal (biases toward Minimalism-style categories) | Balanced / modern | Bold / asymmetric (biases toward Brutalism, Bento Grids) |
| `--motion` | Subtle micro-interactions | Standard scroll/stagger motion | Complex choreography (pin, Flip, SplitText) |
| `--density` | Spacious (24-96px spacing scale) | Standard (16-64px, current default) | Dense/dashboard (8-32px spacing scale) |

- `--motion` attaches a ready-to-use GSAP snippet (with framework notes, Do/Don't, and performance notes) pulled from `--domain gsap`, matched to the resolved tier (Subtle/Standard/Complex).
- `--density` overrides the `--space-*` CSS variable table in the ASCII and markdown output — use it for dashboards (high) vs. marketing pages (low) without hand-editing tokens.
- Leaving a dial unset keeps that part of the output exactly as it was before (no behavior change).

**Example:**
```bash
python3 "${CLAUDE_SKILL_DIR}/scripts/search.py" "internal analytics dashboard" --design-system --variance 8 --motion 7 --density 8 -p "Ops Console"
```

### Step 3: Supplement with Detailed Searches (as needed)

```bash
python3 "${CLAUDE_SKILL_DIR}/scripts/search.py" "<keyword>" --domain <domain> [-n <max_results>]
```

| Need | Domain | Example |
|------|--------|---------|
| Product type patterns | `product` | `--domain product "entertainment social"` |
| More style options | `style` | `--domain style "glassmorphism dark"` |
| Color palettes | `color` | `--domain color "entertainment vibrant"` |
| Font pairings | `typography` | `--domain typography "playful modern"` |
| Individual Google Fonts | `google-fonts` | `--domain google-fonts "sans serif popular variable"` |
| Chart recommendations | `chart` | `--domain chart "real-time dashboard"` |
| UX best practices | `ux` | `--domain ux "animation accessibility"` |
| Landing page structure | `landing` | `--domain landing "hero social-proof"` |
| Icon recommendations | `icons` | `--domain icons "navigation outline"` |
| GSAP animation presets | `gsap` | `--domain gsap "scroll reveal stagger"` |
| React/Next.js performance | `react` | `--domain react "rerender memo list"` |
| App/native interface guidelines | `web` | `--domain web "accessibilityLabel touch safe-areas"` |

Domain is auto-detected from the query if `--domain` is omitted — but auto-detection can misroute overlapping terms (e.g. "font" matches both `typography` and `google-fonts`). If results look off-topic, pass `--domain` explicitly.

### Step 4: Stack Guidelines

```bash
python3 "${CLAUDE_SKILL_DIR}/scripts/search.py" "<keyword>" --stack <stack>
```

**Available stacks:** `react`, `nextjs`, `vue`, `svelte`, `astro`, `nuxtjs`, `nuxt-ui`, `angular`, `laravel`, `swiftui`, `react-native`, `flutter`, `jetpack-compose`, `html-tailwind`, `shadcn`, `threejs`, `javafx`, `wpf`, `winui`, `avalonia`, `uno`, `uwp`. Use the stack detected in Step 1.

---

## If a search returns 0 results

Do not fabricate output. Instead:
1. Retry once with broader or differently-worded keywords (try product + style separately rather than combined).
2. If still empty, say explicitly to the user that no database match was found, and that any recommendation you give is your own judgment rather than a database result (e.g. "no palette match for X, using general SaaS defaults").
3. Never present a 0-result search as if it returned data.

## Example Workflow

**User request:** "Make an AI search homepage." (stack detected as Next.js from `package.json`)

```bash
# Step 2: design system
python3 "${CLAUDE_SKILL_DIR}/scripts/search.py" "AI search tool modern minimal" --design-system -p "AI Search"

# Step 3: supplement
python3 "${CLAUDE_SKILL_DIR}/scripts/search.py" "search loading animation" --domain ux

# Step 4: stack guidelines
python3 "${CLAUDE_SKILL_DIR}/scripts/search.py" "suspense streaming bundle" --stack nextjs
```

Then synthesize the design system + detailed searches and implement.

## Output Formats

`--design-system` supports `-f ascii` (default, terminal display), `-f markdown` (documentation), and `--json` (machine-readable).

## Tips for Better Results

- Use **multi-dimensional keywords** — combine product + industry + tone + density: `"entertainment social vibrant content-dense"`, not just `"app"`
- Try different phrasings for the same need: `"playful neon"` → `"vibrant dark"` → `"content-first minimal"`
- Use `--design-system` first for full recommendations, then `--domain` to deep-dive any dimension you're unsure about
- Pass the detected stack explicitly for implementation-specific guidance

| Problem | What to Do |
|---------|------------|
| Can't decide on style/color | Re-run `--design-system` with different keywords |
| Dark mode contrast, form UX, navigation, responsive layout, jank | Not in this database. These are UX and implementation questions, not design-system or lookup questions — you are in the wrong place |
| The question is whether the design is right, rather than which option to take | Stop. This database recommends; it cannot judge. Go back to what the interface has to communicate |

## Before Delivering Native/Mobile App UI

Read `references/pro-rules.md` and run through its canonical Pre-Delivery Checklist. It covers icon/visual-element discipline, interaction feedback, light/dark contrast, safe-area layout, and accessibility — scoped to native/mobile app UI (iOS/Android/React Native/Flutter).
