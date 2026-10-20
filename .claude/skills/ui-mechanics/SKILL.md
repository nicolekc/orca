---
name: ui-mechanics
description: >
  Use when writing or changing UI code — building a component, adding a
  transition, wiring a dialog or a loading state, or smoothing something that
  feels janky. Check these rules before writing the markup, not
  after: which properties are safe to animate, which primitives own keyboard
  and focus behavior, which utility class to reach for, and where a project's
  tokens come from. Apply them whatever the design calls for — they describe
  how the browser behaves, not how an interface should look. They do not settle
  what the interface has to communicate, and they do not pick a project's
  libraries or tokens.
---

# UI Mechanics

Apply these whatever the design calls for. They describe how the browser behaves, so they hold for a dense dashboard and a spacious landing page alike, in React, server-rendered templates, or plain HTML. Where a rule names a utility class, it means the CSS behind the class. The React section applies only to React code.

Where a rule needs a value, take it from the project. Where the project has already settled a question these rules leave open — which primitive library, which tokens, which spacing scale — follow the project.

## Writing a value in the project's form

A value can come from anywhere: the project's tokens, a lookup, a reference snippet, a design you were handed. Its form comes from the project. Keep what the value means and write it the way the codebase already writes values:

- A color becomes the project's token for that role, where the project names colors by role. Where no token carries the role, the project's own convention decides whether one gets added; an inline literal is not the way around it.
- Raw CSS and inline styles become the project's utility classes.
- A component from another stack becomes the project's equivalent. An `AlertDialog` is whatever confirmation dialog the project already has.
- A pixel value becomes the nearest step of the project's scale.

For anything else, the project's linters and code rules decide the form.

## Stack

- MUST use the project's scale for spacing, radius, and shadows before custom values — Tailwind's defaults where the project uses Tailwind and has not set its own
- SHOULD use the project's own mechanism for entrance and micro-animations — its transition helpers or the keyframes in its theme — and `tw-animate-css` only in a Tailwind v4 project that has none
- MUST take tokens from the project's theme. Find it before introducing a value — a Tailwind `@theme` block or config file, a CSS variable block, or the component library's config. Where a project defines none, use defaults from the user's preferred UI libraries, or Tailwind's if none are specified

## Components

- MUST use accessible component primitives for anything with keyboard or focus behavior
- MUST use the project's existing component primitives first
- NEVER mix primitive systems within the same interaction surface
- MUST add an `aria-label` to icon-only buttons
- NEVER rebuild keyboard or focus behavior by hand unless explicitly requested

## Interaction

- MUST use a confirmation dialog for destructive or irreversible actions
- SHOULD use structural skeletons for loading states
- NEVER use `h-screen` (`100vh`), use `h-dvh` (`100dvh`)
- MUST respect `safe-area-inset` for fixed elements
- NEVER block paste in `input` or `textarea` elements

## Animation

- MUST animate only compositor props (`transform`, `opacity`)
- NEVER animate layout properties (`width`, `height`, `top`, `left`, `margin`, `padding`)
- SHOULD avoid animating paint properties (`background`, `color`) except for small, local UI (text, icons)
- SHOULD use `ease-out` on entrance
- NEVER exceed `200ms` for interaction feedback
- MUST pause looping animations when off-screen
- NEVER introduce custom easing curves unless explicitly requested
- SHOULD avoid animating large images or full-screen surfaces

## Typography

- MUST use `text-balance` for headings and `text-pretty` for body/paragraphs
- MUST use `tabular-nums` for data
- SHOULD use `truncate` or `line-clamp` for dense UI
- NEVER modify `letter-spacing` (`tracking-`) unless explicitly requested

## Layout

- MUST use a fixed `z-index` scale (no arbitrary `z-x`)
- SHOULD use `size-x` for square elements instead of `w-x` + `h-x`

## Performance

- NEVER animate large `blur()` or `backdrop-filter` surfaces
- NEVER apply `will-change` outside an active animation

## React

The libraries named here are for React code that has not already chosen one. Where the project has, use its choice.

- MUST use `motion/react` (formerly `framer-motion`) when JavaScript animation is required
- MUST use a `cn` utility (`clsx` + `tailwind-merge`) for class logic
- Where the project has no primitive library yet, take one of `Base UI`, `React Aria`, or `Radix`
- NEVER use `useEffect` for anything that can be expressed as render logic

---

> Forked from [`ui-skills`](https://github.com/edmundmiller/dotfiles/tree/HEAD/skills/catalog/ui-skills) (edmundmiller/dotfiles, MIT), fork point 2026-09-22. Changes and their reasons: [`.orca/perspectives/ux-designer/SOURCES.md`](../../../.orca/perspectives/ux-designer/SOURCES.md).
