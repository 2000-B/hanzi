# DESIGN.md — Visual Direction for 汉字学习

## Aesthetic: Frosted Glass Dashboard

A light, airy, professional interface where the Chinese characters are the visual stars. The UI recedes; the content shines.

## Reference Summary

Inspired by modern SaaS dashboards with frosted-glass card surfaces, generous whitespace, and color used sparingly. The existing gradient hanzi text is the app's signature element and should be the most visually prominent thing on screen at all times.

---

## Color System

### Light Mode (primary — design for this first)

- **Page background:** warm light gray, not pure white. `#f0f1f3` or similar. Slight warmth, like matte paper.
- **Card/panel surfaces:** white or near-white (`#ffffff`) with very subtle box shadows and semi-transparent borders (`rgba(0,0,0,0.06)`). Cards should feel like they float slightly above the page.
- **Borders:** extremely subtle. `rgba(0,0,0,0.06)` to `rgba(0,0,0,0.1)`. Never harsh or dark. Some borders can be omitted entirely if the shadow provides enough separation.
- **Text primary:** dark gray, not pure black. `#1a1a2e` or `#111118`.
- **Text secondary:** medium gray. `#6b7280` range.
- **Text tertiary/labels:** light gray. `#9ca3af` range.
- **Accent color:** teal-green (`#10b981` or `#0d9488`) for status indicators, active states, and interactive highlights. Used sparingly.
- **Hanzi gradient:** preserve the existing signature gradient — blue → purple → cyan (`#4f7fff` → `#a78bff` → `#60c0ff`). This is the most important visual element. It should contrast boldly against the light background.
- **Status colors:** soft and muted, not saturated. Green for correct/success: `#34d399`. Red for wrong/error: `#f87171`. Orange for warnings/review: `#fbbf24`. These appear as text color or small pill backgrounds, never as large blocks.

### Dark Mode (secondary)

- Keep the current dark theme as a fallback. The light frosted-glass look is the primary design target.
- Dark mode should feel like a muted inversion, not a completely different app. Same spatial relationships, same component shapes, darker surfaces.

---

## Typography

- **Hanzi display:** 'Noto Sans SC' — large, generous sizing. The character is the hero. 48–72px on cards, 52px in the info panel header. Always rendered with the signature gradient.
- **UI font:** A clean sans-serif with good weight range. 'DM Sans', 'Inter', or system-ui. Not decorative — the UI text should be invisible infrastructure.
- **Size hierarchy matters more than font choice:**
  - Page/section headings: 18–20px, semibold (600)
  - Card content: 14px regular
  - Labels and captions: 10–11px, semibold, uppercase, wide letter-spacing (`0.06–0.1em`). These small labels are a key part of the aesthetic — they organize without competing.
  - Pinyin: 16–18px, regular weight, secondary text color
  - English definitions: 14px on cards, 13px in info panel

---

## Spacing & Layout

- **Generous padding.** Cards should breathe. Minimum 16px internal padding, 20px preferred.
- **Consistent gaps.** 8px between tight elements, 12–16px between related groups, 24px between sections.
- **Border radius:** Slightly rounded, not bubbly. 8px for cards and panels, 6px for buttons and inputs, 999px (pill) for badges and mode toggles. Never sharp corners.
- **The split-pane layout** should feel like two surfaces sitting side by side on the same desk, not like a divided screen. The divider is minimal (3px, barely visible).

---

## Cards & Surfaces

- **Cards float.** Use soft box-shadows rather than borders for separation: `0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)`. On hover, shadow deepens slightly.
- **Frosted glass effect (optional, for key panels):** `backdrop-filter: blur(12px)` with a semi-transparent white background (`rgba(255,255,255,0.7)`). Use this on the header, settings panel, or sidebar — not on every element.
- **The flashcard** is the most prominent card. It should have a slightly stronger shadow than other cards, feel tactile, and have the largest border-radius (16px). The flip animation should be smooth (0.5s cubic-bezier).
- **Info panel** should feel like a reference sheet — clean, scannable, with clear section dividers (thin lines or spacing, not heavy borders).

---

## Interactive Elements

- **Buttons:** Two styles. Primary (accent-colored fill, white text, slight shadow) and secondary (transparent background, subtle border, muted text). Both pill-shaped or with 6px radius.
- **Toggle pills (Study | Test):** Background recedes into the surface, active state pops with accent color fill. Small, compact, not dominant.
- **Hover states:** Subtle and consistent. Slight background shift, slight shadow increase, or border color change. Never dramatic color changes.
- **The sidebar accordion:** Quiet when collapsed, clear when expanded. Chevron rotation on open. Chunk pills are tiny and compact — they're controls, not features.
- **Selected/active states:** Accent color as text or a very faint accent background tint (`rgba(accent, 0.06)`). Not heavy highlight blocks.

---

## Iconography

- Simple, thin-line SVG icons. 1.3–1.5px stroke weight. Consistent 14–16px sizing.
- Icons are functional, not decorative. They label actions, not embellish.
- The ⓘ info button, shuffle icon, and navigation arrows should all share the same visual weight.

---

## Motion & Animation

- **Card flip:** 0.5s cubic-bezier(0.4, 0, 0.2, 1). Smooth, physical feeling.
- **Panel open/close:** 0.3s ease for the info panel width transition. Should feel like sliding a drawer, not teleporting.
- **Sidebar collapse:** 0.25s ease.
- **Hover transitions:** 0.15–0.2s. Quick and responsive, never sluggish.
- **The gradient title animation** (gradientShift on 汉字学习) is a nice touch — keep it subtle and slow (8s+).
- **No bouncing, no elastic overshoot, no flashy entrance animations.** Everything should feel like it belongs and moves with purpose.

---

## What to Avoid

- Pure white (`#fff`) as a page background — too clinical. Use warm gray.
- Heavy borders on everything — let shadows do the work.
- Saturated color blocks — color is for accents and status, not for filling large areas.
- Competing with the hanzi gradient — no other element should be as visually bold.
- Cluttered toolbars — every control should earn its space.
- Dark outlines on cards in light mode — the reference images achieve separation through shadow and spacing, not borders.

---

## Summary

The app should feel like a beautiful reference book sitting on a clean desk. The Chinese characters are ink on the page — vivid, expressive, the reason you opened it. Everything else — the controls, the panels, the labels — is the binding and margins: well-crafted, essential, but never competing for attention.
