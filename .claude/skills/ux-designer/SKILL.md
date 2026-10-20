---
name: ux-designer
description: >
  Read this once you know what you are building and need the established
  practice for building it: forms and validation, accessibility and WCAG,
  data tables, search, onboarding, notifications, mobile, internationalization
  and RTL, AI and chat interfaces, loading and perceived performance,
  microcopy, information architecture, interaction and motion, visual design,
  emotional design, design systems, collaborative presence and sync, canvas
  apps, or user research. Reach for it on any UX topic with accepted practice
  behind it, not only the ones named here. Each has a reference file holding
  the pattern, the exact numbers, and the research — open the closest one
  rather than writing the pattern from memory. Do not use it to decide whether
  a change is worth making.
---

# UX Designer Skill

Established UX practice, organized as one file per topic.

## When to use

Before you build any topic listed below, read its reference. The accepted pattern and the exact numbers are in there, and writing one from memory is how a form loses its error recovery and a table loses its keyboard support.

Check the decision trees and key numbers first — they answer the most common questions without opening a file. Otherwise open the reference for the thing you are building, apply it, and move on. There are 25 files here and several thousand lines, so read only the one the task needs. Where two of them give different numbers for the same thing, take the one whose topic is closer to what you are building.

The code in a reference shows the pattern. Its colors and CSS are placeholders: take the values from the project and write them the way the project writes them. The numbers the text recommends — a touch target, a timeout, a contrast ratio — are the practice itself.

## Decision Trees

### Modal vs. Side Panel vs. Full Page

```
What is the user doing?
├── Quick confirmation or simple input (1-3 fields)?
│   └── → Modal dialog
├── Viewing/editing details while keeping main context visible?
│   ├── Content is narrow (form, properties, chat)?
│   │   └── → Side panel
│   └── Content needs significant width?
│       └── → Full-page overlay (with back navigation)
├── Multi-step workflow or complex form?
│   ├── Steps are short (2-3 fields each)?
│   │   └── → Modal with stepper
│   └── Steps are long or need reference to other content?
│       └── → Full page with stepper
└── Creating a new complex entity (document, project)?
    └── → Full page (dedicated creation flow)
```

### Notification Type Selection

```
What needs the user's attention?
├── Immediate action required?
│   ├── Blocking (must resolve before continuing)?
│   │   └── → Modal dialog (confirmation, error recovery)
│   └── Non-blocking but urgent?
│       └── → Banner (top of page, persistent until dismissed)
├── Feedback on a completed action?
│   ├── Success or low-importance info?
│   │   └── → Toast (auto-dismiss 4-8s)
│   └── Warning or error?
│       └── → Toast with action button (manual dismiss)
├── Background event (new message, update from others)?
│   ├── User is in the same context?
│   │   └── → Badge + subtle inline indicator
│   └── User is elsewhere in the app?
│       └── → Badge on nav item + optional push notification
└── System status (maintenance, connectivity)?
    └── → Persistent banner (top or bottom of viewport)
```

## Detailed Documentation

- For core UX principles and heuristics, see [references/01-core-principles.md](references/01-core-principles.md)
- For Laws of UX quick reference, see [references/02-laws-of-ux.md](references/02-laws-of-ux.md)
- For WCAG 2.2 accessibility compliance, see [references/03-accessibility.md](references/03-accessibility.md)
- For visual design patterns, see [references/04-visual-design.md](references/04-visual-design.md)
- For information architecture, see [references/05-information-architecture.md](references/05-information-architecture.md)
- For interaction design patterns, see [references/06-interaction-design.md](references/06-interaction-design.md)
- For form and input design, see [references/07-forms-and-inputs.md](references/07-forms-and-inputs.md)
- For mobile UX best practices, see [references/08-mobile-ux.md](references/08-mobile-ux.md)
- For UX writing and microcopy, see [references/09-ux-writing.md](references/09-ux-writing.md)
- For user research methods, see [references/10-user-research.md](references/10-user-research.md)
- For design system creation, see [references/11-design-systems.md](references/11-design-systems.md)
- For collaborative presence, live cursors, and awareness indicators, see [references/12a-presence-awareness.md](references/12a-presence-awareness.md)
- For conflict resolution, sync, sharing, and offline UX, see [references/12b-conflict-resolution-sync.md](references/12b-conflict-resolution-sync.md)
- For canvas navigation, zoom, pan, and object manipulation, see [references/13a-canvas-navigation.md](references/13a-canvas-navigation.md)
- For canvas elements, layers, performance, and whiteboard patterns, see [references/13b-canvas-objects-performance.md](references/13b-canvas-objects-performance.md)
- For AI and LLM interface design (chat, copilots, agents), see [references/14-ai-ux-patterns.md](references/14-ai-ux-patterns.md)
- For ethical design and dark pattern avoidance, see [references/15-ethical-design.md](references/15-ethical-design.md)
- For onboarding flows and user activation, see [references/16-onboarding.md](references/16-onboarding.md)
- For notification systems and attention management, see [references/17-notifications.md](references/17-notifications.md)
- For dashboard layout, KPI cards, drill-down, and empty or stale data states, see [references/18-data-visualization.md](references/18-data-visualization.md)
- For search interface design and autocomplete, see [references/19-search-ux.md](references/19-search-ux.md)
- For emotional design and trust-building patterns, see [references/20-emotional-design.md](references/20-emotional-design.md)
- For data tables, sortable lists, pagination, and bulk actions, see [references/21-data-tables.md](references/21-data-tables.md)
- For loading states, skeleton screens, optimistic updates, and perceived performance, see [references/22-performance-ux.md](references/22-performance-ux.md)
- For internationalization, localization, and RTL design, see [references/23-internationalization.md](references/23-internationalization.md)
- For voice, multimodal, and cross-device input patterns, see [references/24-voice-and-multimodal.md](references/24-voice-and-multimodal.md)

## Key Numbers to Remember

### Layout & Typography

| Metric | Value | Context |
|--------|-------|---------|
| Touch target | 44-48px | Minimum tappable area on a touch screen |
| Body text | 16px+ | Minimum for long-form reading |
| Line height | 1.2-1.45 | Optimal readability |
| Line length | 50-75 chars | Ideal for reading |
| Contrast ratio | 4.5:1 | WCAG AA for normal text |
| Contrast ratio | 3:1 | WCAG AA for large text |
| Working memory | 7±2 items | Miller's Law |
| Text expansion | ~30-40% | Translation growth (DE/FI/RU) |

### Interaction & Animation

| Metric | Value | Context |
|--------|-------|---------|
| Form abandonment | 81% | Users who start but don't finish |
| Canvas zoom range | 10%-4000% | Typical design tool range |
| Smart guide snap | 2-8px | Distance before snapping |
| Canvas render | 60fps | Target during pan/zoom |

### Collaboration

| Metric | Value | Context |
|--------|-------|---------|
| Cursor update rate | 50-100ms | Smooth live cursor movement |
| Cursor label max | 12 chars | Truncate longer usernames |
| Avatar stack | 3-5 visible | Use "+N" for overflow |

### AI Interfaces

| Metric | Value | Context |
|--------|-------|---------|
| AI first token | < 1s | Perceived responsiveness |
| AI streaming | 30-80 tok/s | Natural reading pace |
| Copilot accept rate | 25-35% | Suggestion usefulness |

### Engagement Metrics

| Metric | Value | Context |
|--------|-------|---------|
| Onboarding completion | > 65% | Checklist finish rate |
| Time to first value | < 5 min | Sign-up to activation |
| Toast duration | 4-8s | Auto-dismiss timing |
| Search success | > 70% | Users finding results |
| NPS | > 50 | User sentiment |

## Anti-Patterns to Avoid

1. **Dark patterns** - Deceptive UI that tricks users → see [15-ethical-design.md](references/15-ethical-design.md)
2. **Infinite scroll without context** - No sense of progress → see [21-data-tables.md](references/21-data-tables.md)
3. **Hidden navigation** - Hamburger menus on desktop → see [05-information-architecture.md](references/05-information-architecture.md)
4. **Autoplaying media** - Unexpected sound/video → see [03-accessibility.md](references/03-accessibility.md)
5. **Disabled buttons without explanation** - Confusing blocked states → see [06-interaction-design.md](references/06-interaction-design.md)
6. **Walls of text** - No visual hierarchy or chunking → see [04-visual-design.md](references/04-visual-design.md)
7. **Color-only feedback** - Excludes colorblind users → see [03-accessibility.md](references/03-accessibility.md)
8. **Tiny touch targets** - Frustrating on mobile → see [08-mobile-ux.md](references/08-mobile-ux.md)
9. **No loading states** - Users think system is broken → see [22-performance-ux.md](references/22-performance-ux.md)
10. **Popup/modal overuse** - Interrupts user flow → see [06-interaction-design.md](references/06-interaction-design.md)
11. **No presence indicators** - Users don't know who else is working → see [12a-presence-awareness.md](references/12a-presence-awareness.md)
12. **Silent sync failures** - Data loss without warning → see [12b-conflict-resolution-sync.md](references/12b-conflict-resolution-sync.md)
13. **Cursor overload** - Too many live cursors create visual noise → see [12a-presence-awareness.md](references/12a-presence-awareness.md)
14. **Screen-center zoom** - Disorienting; zoom at cursor instead → see [13a-canvas-navigation.md](references/13a-canvas-navigation.md)
15. **No offline indication** - Users think they're connected when not → see [12b-conflict-resolution-sync.md](references/12b-conflict-resolution-sync.md)
16. **Hidden AI** - Users should always know when interacting with AI → see [14-ai-ux-patterns.md](references/14-ai-ux-patterns.md)
17. **Over-automation** - AI changes applied without user awareness or consent → see [14-ai-ux-patterns.md](references/14-ai-ux-patterns.md)
18. **No AI undo** - AI-applied changes must be reversible → see [14-ai-ux-patterns.md](references/14-ai-ux-patterns.md)
19. **Confirmshaming** - Guilt-laden language on decline buttons → see [15-ethical-design.md](references/15-ethical-design.md)
20. **Asymmetric consent** - Big "Accept" button, tiny "Reject" link → see [15-ethical-design.md](references/15-ethical-design.md)
21. **Mandatory lengthy tours** - Forcing users through 10+ onboarding steps → see [16-onboarding.md](references/16-onboarding.md)
22. **Notification carpet bombing** - Every event as a push notification → see [17-notifications.md](references/17-notifications.md)
23. **Permission on first visit** - Asking for push permission before user sees value → see [17-notifications.md](references/17-notifications.md)
24. **Hardcoded/untranslatable strings** - Text baked into code/images, fixed-width containers, LTR-only layout → see [23-internationalization.md](references/23-internationalization.md)
25. **Voice-only flows / hidden mic** - No fallback modality, no recognition feedback, buried voice entry → see [24-voice-and-multimodal.md](references/24-voice-and-multimodal.md)

## Sources

This skill synthesizes best practices from:
- [Laws of UX](https://lawsofux.com/) - Jon Yablonski
- [Nielsen Norman Group](https://www.nngroup.com/) - Usability research
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) - Accessibility guidelines
- [Material Design](https://m3.material.io/) - Google's design system
- [Human Interface Guidelines](https://developer.apple.com/design/) - Apple
- [Interaction Design Foundation](https://www.interaction-design.org/)
- [Liveblocks](https://liveblocks.io/) - Real-time collaboration patterns
- [Figma Engineering Blog](https://www.figma.com/blog/category/engineering/) - Multiplayer & canvas
- [Ably](https://ably.com/blog/collaborative-ux-best-practices) - Collaborative UX
- [Google PAIR Guidebook](https://pair.withgoogle.com/guidebook) - AI design patterns
- [Microsoft HAX Toolkit](https://www.microsoft.com/en-us/haxtoolkit/) - Human-AI interaction
- [Deceptive Design](https://www.deceptive.design/) - Dark pattern catalog
- [EU Digital Services Act](https://digital-strategy.ec.europa.eu/en/policies/digital-services-act-package) - Platform regulation
- [EU Accessibility Act](https://ec.europa.eu/social/main.jsp?catId=1202) - EN 301 549 / WCAG 2.1 AA mandate
- [W3C Internationalization (i18n) Activity](https://www.w3.org/International/) - i18n/l10n standards
- [Baymard Institute](https://baymard.com/) - E-commerce UX research
- [Edward Tufte](https://www.edwardtufte.com/) - Data visualization
- [ColorBrewer](https://colorbrewer2.org/) - Colorblind-safe palettes
- [The A11y Project](https://www.a11yproject.com/) - Accessibility community resource
- [web.dev](https://web.dev/) - Core Web Vitals and performance UX
- [Smashing Magazine](https://www.smashingmagazine.com/) - Practical UX/UI patterns
