---
name: product-ux-design
description: >
  Use when building, changing, or reviewing any user-facing interface — a new
  screen or flow, a layout that reads wrong, an empty or error state, feedback
  after an action, a transition, or a request to make something look better.
  Decide what the interface has to communicate before writing it. Read this
  even when the request is only to implement, and even when nobody says
  "design" or "UX". Start here: this is the top of the design hierarchy, and it
  settles intent, leaving the stack, the visual style, and the component
  library to others.
---
# Product UX Design

## Purpose

Design interfaces that are clear, coherent, direct, and pleasurable to use without defaulting to either enterprise-dashboard conventions or decorative marketing aesthetics.

Optimize first for comprehension, task flow, spatial continuity, information hierarchy, and interaction quality.

Treat visual design as a way to communicate product structure and state, not as decoration.

Preserve implementation autonomy. Specify the intent, hierarchy, and interaction behavior strongly; prescribe exact styling values only when they are necessary to solve a concrete problem.

## What to settle here

Settle what the interface has to communicate: the task it serves, its hierarchy, the states it can be in, the feedback it gives, what its motion explains, and whether a change is worth making at all. Carry those decisions into the work as constraints and leave the local choices to whoever writes the code.

Look elsewhere for: how a control gets built, depth on a single UX topic, how to construct a chart, and the project's visual language.

Where a settled intent and an implementation rule pull against each other, intent decides what to build and the implementation rule decides the value to use.

### A new surface

When building a new area of an existing product, inherit that product's visual language. Do not generate a second design system beside one already implemented, and do not invent tokens for a project that has them.

Who sees the surface decides how far that goes. Where the product's customers see it, the product's own language is the whole palette: find the tokens its neighboring surfaces use for each role, and use those. An internal surface of the product, such as an admin panel, can take better values from established practice where the product's own leave a gap, written in the codebase's own form like everything else in it.

## Design Posture

Start from the user's task and the information structure, not from a component catalog.

Prefer the simplest interaction that makes the underlying model understandable.

Use the product's content, data, identity, imagery, and structure as its primary visual material.

Do not introduce visual complexity merely to make the interface feel designed.

Avoid generic AI-interface habits such as excessive cards, pills, gradients, glows, glass effects, oversized headings, ornamental icons, gratuitous dashboards, or decorative whitespace.

Do not reject those patterns categorically. Use them when they have a clear functional or expressive purpose.

An owner asking for an expressive look has given it that purpose. Build it from the product's own tokens, keep text readable over it, and say what it costs.

Do not redesign for the sake of producing visible change. "Leave this as-is" is a valid design conclusion.

## Interaction Design

Make the default state useful before the user interacts.

Favor direct manipulation when it makes the underlying object or relationship easier to understand.

When an object is selected, strengthen the selected object and relevant context while reducing the prominence of unrelated information. Prefer de-emphasis over disappearance when surrounding context remains useful.

Keep cause and effect visually close. Controls should affect nearby content whenever possible, and feedback should appear where the action occurred.

Use progressive disclosure for secondary controls, explanations, and advanced features. Do not make users configure the product before they can understand or use it.

Make important state visible. Do not rely on hidden modes, hover-only behavior, or memory of previous screens when the current state matters.

Preserve continuity across transitions. When information changes, help users understand what stayed the same, what changed, and why.

Prefer reversible exploration. Filters, selection, scrubbing, expansion, and temporary focus should generally be easy to undo.

Use familiar interaction patterns for conventional tasks. Spend novelty on the parts of the product that are genuinely novel.

## Visual Hierarchy

Hierarchy should reflect semantic importance.

Use contrast, position, size, density, weight, color, and whitespace deliberately rather than uniformly.

Primary content should dominate supporting controls and chrome.

Reduce unnecessary borders and containers. Group with spacing, alignment, shared background, typography, or proximity before adding another box.

Avoid giving every region equal visual weight.

Use color as a scarce semantic channel. Before assigning color, determine what meaning it owns.

When multiple semantic dimensions compete for color, assign some of them to other channels such as position, stroke, shape, opacity, iconography, labels, or typography.

Brand or entity colors should not automatically become large surface fills if doing so harms information hierarchy.

Typography should make structure easier to scan. Do not create hierarchy solely by making headings dramatically larger.

## Information Visualization

Distinguish data encoding from interface state. A color that means a data category should not simultaneously mean selection unless the meanings remain unambiguous.

Preserve context when highlighting subsets of data. Prefer muting unrelated marks over removing them when the surrounding structure helps interpretation.

## Interaction Motion

Motion must explain change, reinforce causality, preserve spatial understanding, or provide useful feedback.

Do not animate merely because an element can move.

Use motion especially when the user needs to understand:

* where an object came from or went
* how a layout changed
* what was added or removed
* which elements remained the same
* how one state transforms into another
* what relationship caused a structural change

Prefer continuity of identity: an existing object should move to its new position rather than disappear and reappear when that helps users follow it.

For filtering and mode changes, preserve a stable frame of reference whenever possible.

For timelines and scrubbing, emphasize newly introduced or changed information while keeping historical context legible.

Coordinate related motion. Elements participating in one conceptual change should feel like one transition rather than independent animations.

Keep interaction feedback responsive. Larger explanatory transitions may take longer than button or hover feedback when the extra time improves comprehension.

Respect reduced-motion preferences. Replace spatial transitions with immediate state changes, fades, or other low-motion alternatives while preserving meaning.

Avoid motion that delays task completion, causes layout instability, or repeatedly demands attention.

## Components and Controls

Component choice should follow the interaction need rather than dictate it.

Do not hide conventional actions behind icon-only controls without a strong reason.

Design all materially relevant states, including focus, selected, disabled, loading, empty, error, partial data, and narrow-screen behavior.

## Responsive Design

Preserve the core task across viewport sizes rather than mechanically shrinking the desktop layout.

Reflow relationships when needed. Do not preserve a wide spatial layout on a narrow screen if it becomes illegible.

When a visualization inherently needs space, use appropriate focus, zoom, local scrolling, alternate views, or staged disclosure rather than compressing it beyond usefulness.

Touch interactions must not depend on hover.

## Accessibility

Accessibility is part of interaction design, not a final audit step.

## Product Copy and Explanation

Prefer concise labels that describe actions or state.

Teach unusual interactions at the moment they become relevant.

Avoid permanent explanatory text for interactions that can become self-evident through layout, affordance, feedback, or first-use guidance.

When the product represents uncertainty, prediction, estimation, or incomplete information, communicate that uncertainty explicitly rather than implying false precision.

## Working With Existing Interfaces

Before proposing changes, identify what already works.

Preserve successful interaction patterns, hierarchy, and visual conventions unless there is a clear reason to change them.

Prefer targeted improvements over wholesale redesign.

When reviewing an existing interface, identify the highest-leverage problems rather than producing an exhaustive catalog of subjective preferences.

Do not introduce a second design system when the existing one is coherent.

## Review Mode

When asked to review an interface, first determine whether there is a real usability, comprehension, hierarchy, accessibility, visualization, or motion problem.

For each finding, explain the user-facing consequence and the intended improvement.

Describe direction before implementation details.

Use rendered verification when it is available and necessary. Necessary means looking at the current interface before judging it, at least once per significant change, and any time appearance cannot be inferred from the code: layered or measured layout, interaction and state changes, motion, or real content and data lengths.

Be judicious for efficiency. When changing many components on one view, wait until every change to that view is done before rendering.

## Build Mode

When participating in implementation, establish a small number of durable interaction and visual principles, then let the implementation agent make local decisions within them.

Prefer one coherent solution over a menu of stylistic alternatives unless design exploration itself is the task.

Use existing product assets, identity, data, and content before creating decorative visual elements.

## Quality Check

Before finishing, ask:

Does the default view make sense without configuration?

Is the most important thing visually dominant?

Can users tell what is selected, active, changed, or filtered?

Does unrelated information recede appropriately without destroying useful context?

Is every major use of color carrying a clear meaning?

Does motion explain something?

Are unusual interactions discoverable?

Does the interface preserve the user's mental map as state changes?

Are components being used because they fit the interaction rather than because they are fashionable?

Did this pass improve a real problem, or merely make the design more elaborate?

If the current design already solves the problem clearly, leave it alone.
