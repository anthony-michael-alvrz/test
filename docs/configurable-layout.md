# Configurable structure & theme library

How the guide's **look** (theme) and **structure** (layout) are chosen from curated libraries,
and why it's built this way.

## The model: two curated libraries + free content

- **Content** (guest name, wifi, card text, rules text) — **free-form**, per property.
- **Theme** (visual look) — **curated**: pick one from the theme library.
- **Layout** (which tabs exist, what's in them) — **curated**: pick one from the layout library.

A property's config carries `theme` and `layout` fields; the customer picks both from dropdowns
in the dashboard. Absent fields default to the standard look/layout, so **old configs keep
working unchanged**.

## Why curated (not open-ended config)

Letting configs describe *arbitrary* layouts would be infinitely flexible but impossible to
verify — any layout × any theme is an unbounded set, and a malformed config could break a live
tablet. Instead, layouts and themes are **fixed, vetted lists**, so the shippable universe is a
small grid where every cell is tested:

| | yunque | slate |
|---|---|---|
| **standard** (rules in Guide) | ✓ | ✓ |
| **rules-as-tab** | ✓ | ✓ |

The invariant that keeps the grid clean: **themes style only, never lay out; layouts arrange
content only, never style.** Because the two axes are independent, any theme works with any
layout — the grid is a simple cross-product, not a tangle of special cases.

## Where each piece lives

- **Layouts:** the `LAYOUTS` registry in `index.html`. Each layout is an ordered list of tabs;
  each tab picks a label, heading, optional sub-line, and a body composed from shared section
  renderers (`bodyWelcome`, `bodyCards`, `bodyRulesCard`, `bodyCheckout`, `bodyLocal`).
- **Themes:** CSS files in `themes/` (variables only — see `themes/README-THEMES.md`).
- **The pick-lists:** `THEME_OPTIONS` / `LAYOUT_OPTIONS` in the dashboard
  (`dashboard/app/page.tsx`) — what the customer sees in the dropdowns.

## Adding to a library

Adding an option is deliberately a small dev task (build + verify), not a free-form config edit
— that's what keeps every shipped combination known-good.

**A new layout:**
1. Add an entry to `LAYOUTS` in `index.html`, composing existing section renderers (or add a
   new `bodyX` renderer if the content block is new).
2. Verify it against **each theme, both languages** in the local preview.
3. Add it to `LAYOUT_OPTIONS` in the dashboard.

**A new theme:**
1. Copy a file in `themes/` and change the token values (no layout rules).
2. Verify it against **each layout, both languages**.
3. Add it to `THEME_OPTIONS` in the dashboard.

After changing `index.html` or a theme, bump `CACHE_VERSION` in `service-worker.js` so tablets
refresh.
