# Sticky Folders

[中文说明](#中文说明)

Keeps parent folders pinned at the top of Obsidian's file explorer while you scroll, so you always know which folder you are in.

- **One row per parent folder**, like VS Code's sticky scroll. When a folder ends, the next one pushes its row up.
- **Row limit** (default 4, adjustable 1–8). Deeper nesting merges the extra levels into one row of grey names, for example `Projects` / `2026` / `Meetings` / `2026-05 / 2026-05-21`. You choose which end merges:
  - outer folders keep their rows, deeper ones merge into the last row (default);
  - outer folders merge into the first row, the nearest ones keep their rows.
- **Indent guide hints**: hover an indent guide, a pinned row or a grey name and that folder's range is highlighted, with its name in bold accent colour.
- **Click** a pinned row or grey name to collapse that folder and stay in place. Click an indent guide to collapse its folder (can be turned off). Right-click a pinned row for Obsidian's own folder menu.
- Scrolling with the wheel, trackpad or touch works over the pinned rows. Settings follow Obsidian's language (English or Chinese).

## Install

Until it is in the community plugin list:

- **BRAT**: install [Obsidian42 - BRAT](https://github.com/TfTHacker/obsidian42-brat), choose *Add beta plugin* and enter `Tuosang/obsidian-sticky-folders`.
- **Manually**: download `main.js`, `manifest.json` and `styles.css` from the [latest release](https://github.com/Tuosang/obsidian-sticky-folders/releases/latest) into `<your vault>/.obsidian/plugins/sticky-folders/`, then enable *Sticky Folders* under *Settings → Community plugins*.

## Development

```bash
npm install
npm test          # layout logic (src/layout.ts)
npm run build     # type-check + bundle into dist/
npm run dev       # rebuild on change
```

To install each build into a vault, put the vault's path in a `.vault` file (git-ignored) or set `STICKY_VAULT`.

Release: `npm version patch` (updates `manifest.json` and `versions.json`), then push the commit and a tag equal to the version without `v` (`git push && git push origin 0.1.1`). The workflow drafts a GitHub release with the three plugin files.

### How it works

- Pinned rows are clones of the real folder rows inside a zero-height `position: sticky` element at the top of the explorer's scroll container, so scrolling over them still scrolls the list.
- The explorer only renders visible rows, but the ancestors of rendered rows always stay in the DOM; the plugin measures them directly.
- Collapsing uses the explorer's internal `fileItems[path].setCollapsed(true, false)` (no animation, so the row can stay in place) and falls back to clicking the real row if that internal API changes.

## License

[MIT](LICENSE)

---

## 中文说明

滚动 Obsidian 文件列表时，把上级文件夹钉在顶部，随时知道自己在哪个文件夹里。

- **每层上级各占一行**（类似 VS Code 的 sticky scroll），下一个文件夹滚上来时会把上一行顶走。
- **最多钉几行**可调（默认 4 行，1–8）。层数更多时，多出来的几层合并成一行灰字，例如 `Projects` / `2026` / `Meetings` / `2026-05 / 2026-05-21`。合并哪一端可选：
  - 外层各占一行，更深的并进最后一行（默认）；
  - 外层并进第一行，最近几层各占一行。
- **缩进线提示**：鼠标移到缩进竖线、钉住的行或灰字上，会高亮这个文件夹管到哪里，文件夹名加粗变蓝。
- **点击**钉住的行或灰字：收起这个文件夹并停在原位。点缩进竖线：收起对应文件夹（可关闭）。右键钉住的行：Obsidian 自己的文件夹菜单。
- 在钉住的行上用滚轮、触控板或手指滑动都照常滚动。设置界面跟随 Obsidian 的语言（中文或英文）。

### 安装

进入社区插件列表之前：

- **BRAT**：安装 [Obsidian42 - BRAT](https://github.com/TfTHacker/obsidian42-brat)，选 *Add beta plugin*，填入 `Tuosang/obsidian-sticky-folders`。
- **手动**：从[最新 Release](https://github.com/Tuosang/obsidian-sticky-folders/releases/latest) 下载 `main.js`、`manifest.json`、`styles.css`，放进 `<你的库>/.obsidian/plugins/sticky-folders/`，再到 *设置 → 第三方插件* 里启用 *Sticky Folders*。
