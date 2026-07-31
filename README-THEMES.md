# Themes

A theme is one CSS file that sets variables. It never contains layout —
`index.html` owns structure, the theme owns look.

## Making a new theme

1. Copy any file in this folder to `themes/yourname.css`.
2. Change the values. Do not add layout rules (no `display`, no `grid-template`,
   no positioning) — those belong to the renderer.
3. In `config.json`, set `"theme": "themes/yourname.css"`.

That's the whole process. Content is untouched.

## The token contract

Every theme must define all of these. The renderer reads only these names,
so as long as you set them, any theme works with any config.

### Color
| Token | Used for |
|---|---|
| `--bg` | Page background |
| `--surface` | Cards, panels |
| `--surface-alt` | Insets inside a card (wifi rows, step numbers) |
| `--brand` | Header, headings, primary emphasis |
| `--brand-soft` | Tinted fills, active-tab wash |
| `--on-brand` | Text sitting on `--brand` |
| `--accent` | The one highlight color (active tab, numbers, rule) |
| `--on-accent` | Text sitting on `--accent` |
| `--ink` | Body text |
| `--ink-muted` | Secondary text, labels |
| `--line` | Borders and dividers |

### Type
| Token | Used for |
|---|---|
| `--font-display` | Headings, property name |
| `--font-body` | Everything else |
| `--font-mono` | Wifi credentials, numbers, tab markers |
| `--h1-size` | Page headings |
| `--h1-weight` | Page heading weight |
| `--h1-tracking` | Page heading letter-spacing |
| `--body-size` | Base text size |

### Shape & space
| Token | Used for |
|---|---|
| `--radius` | Small elements (rows, chips) |
| `--radius-lg` | Cards, panels |
| `--pill` | Tab/toggle radius — set to `999px` for pills, `6px` for square tabs |
| `--border` | Border width, e.g. `1px`. Set `0` for a borderless look. |
| `--card-pad` | Padding inside cards |
| `--section-gap` | Vertical rhythm between blocks |
| `--elevation` | Box-shadow. Flat themes set this to `none`. |

### Font loading
If your theme needs webfonts, put the `@import` at the top of the theme file.
Nothing else in the project references font URLs.
