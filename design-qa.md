# Design QA — UX option 3

Date: 2026-07-18

Reference: `outputs/ux-concepts-2026-07-18/selected-option-3.png`

Implementation evidence:

- `outputs/ux-implementation-2026-07-18/compare-1440.png`
- `outputs/ux-implementation-2026-07-18/task-1440.png`
- `outputs/ux-implementation-2026-07-18/compare-mobile.png`
- `outputs/ux-implementation-2026-07-18/task-mobile.png`
- `outputs/ux-implementation-2026-07-18/side-by-side.png`

## Target flow

Compare: application loads -> user changes a model or profile -> old result disappears -> user starts a new comparison -> current result becomes visible and receives focus.

Task: user selects a work profile -> old result disappears -> user requests costs -> the first three complete, verified cost results appear in the shared model-card structure.

## Visual comparison ledger

| Check | Reference evidence | Rendered evidence | Result |
|---|---|---|---|
| Overall composition | Compact header, single-line title, contained input panel, immediate two-column result | Same hierarchy and approximately the same vertical anchors at 1440 × 1024 | passed |
| Color and atmosphere | Graphite canvas with green and violet ambient accents | Existing project tokens retained and tightened to the same green/violet split | passed |
| Input hierarchy | A/B selectors, centered primary CTA, one-line usage profile, collapsed advanced settings | Same hierarchy and interaction order; API IDs remain visible as useful technical context | passed |
| Result hierarchy | Two equal columns and five identical fields in the same order | Shared `modelResultCard` renders the same five fields in compare and task routes | passed |
| Cost and freshness | Large price, clear current status | Price prominence matches; record-level verification date is additionally visible because freshness is a product requirement | passed |
| Technical disclosure | Technical details and sources collapsed below results | Same progressive-disclosure pattern, with official source and API-key links inside | passed |
| Mobile first viewport | Reference has no mobile variant; CTA must remain easy to reach | At 390 × 844 the CTA bottom is 600.7 px, with no horizontal overflow | passed |

## Intentional deviations

- Decorative icons from the generated concept were omitted. They are not required for meaning, and the project does not ship an icon dependency.
- The header shows current result coverage instead of only a global date. Every result still shows its own official verification date.
- API IDs remain below selectors because the initial audience is technical and the IDs are useful when connecting an API.

## Interaction and accessibility verification

- Model change: stale notice visible, previous canvas hidden, CTA enabled.
- Compare submit: result canvas visible, notice hidden, `comparisonHeading` focused.
- Task profile change: stale notice visible, previous canvas hidden.
- Task submit: three immediate cards, five fields per card, `taskResultsHeading` focused.
- API-key links are current verified HTTPS links and open in a new tab with `noopener noreferrer`.
- Desktop and mobile had no relevant console warning or error.
- Body width equalled viewport width at 390 px; no horizontal overflow was detected.
- Reduced-motion preference is respected by the scroll/focus routine.

## Severity review

- P0: none
- P1: none
- P2: none remaining after the title and control-panel compaction pass

final result: passed
