# Changelog

All notable changes to Sticky Folders are listed here. Versions follow [semantic versioning](https://semver.org/).

## 0.1.2 — 2026-10-10

- Styles no longer use `!important`: the hovered guide wins by specificity, and the pointer over a guide comes from Obsidian's `--cursor` variable.
- Release files carry GitHub artifact attestations, so anyone can verify they were built from this repository.

## 0.1.1 — 2026-10-10

- Settings use Obsidian's declarative settings, so they appear in the settings search and can be reset to their defaults. Requires Obsidian 1.13 or later.
- Passes the Obsidian community directory's ESLint rules (`npm run lint`): no styles set from code, popout-safe timers, language from Obsidian.
- When deeper levels merge into one row, the row now names the folders of the first row visible below it. Collapsing a folder from the merged row no longer shows its previous sibling.
- Settings: no duplicate slider value, shorter dropdown options.

## 0.1.0 — 2026-10-10

First release.

- Pins the open parent folders of the top of the file explorer while you scroll, one row per level, with the next folder pushing the previous one up.
- Row limit (1–8, default 4). Extra levels merge into one row of grey names, either the deeper levels into the last row or the outer levels into the first row.
- Indent guide hints: hovering a guide, pinned row or grey name highlights the folder's range and shows its name in bold, in the tree and in the pinned rows.
- Clicking a pinned row, grey name or indent guide collapses that folder and keeps it in place. Right-clicking a pinned row opens Obsidian's folder menu.
- Works with light and dark themes and on mobile.
- Settings in English and Chinese, following Obsidian's language.
