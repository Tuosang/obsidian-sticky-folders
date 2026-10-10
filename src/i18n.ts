// Settings text in Chinese or English, following Obsidian's interface language.

const en = {
	rowsName: 'Max pinned rows',
	rowsDesc: 'How many parent folders stay pinned at the top while you scroll the file list. Deeper nesting merges the extra levels into one row of grey names.',
	mergeName: 'When there are more levels than rows',
	mergeDesc: 'Which levels share one row of grey names: the deeper ones (outer folders keep their own rows) or the outer ones (the nearest folders keep theirs).',
	mergeDeep: 'Merge deeper levels into the last row',
	mergeOuter: 'Merge outer levels into the first row',
	guideName: 'Indent guide hints',
	guideDesc: "Hovering an indent guide, a pinned row or a grey name highlights the folder's range and shows its name in bold.",
	clickName: 'Click a guide to collapse',
	clickDesc: 'Clicking an indent guide collapses its folder and keeps it in place.',
};

const zh: typeof en = {
	rowsName: '最多钉几行',
	rowsDesc: '滚动文件列表时，顶部最多固定几行上级文件夹。层数更多时，多出来的几层会合并成一行灰字。',
	mergeName: '层数超过上限时',
	mergeDesc: '哪几层合并成一行灰字：更深的几层（外层保持各占一行），或者外面的几层（最近几层保持各占一行）。',
	mergeDeep: '更深的层并进最后一行',
	mergeOuter: '外层并进第一行',
	guideName: '缩进线提示',
	guideDesc: '鼠标移到缩进竖线、钉住的行或灰字上时，高亮这个文件夹管到哪里，文件夹名加粗高亮。',
	clickName: '点竖线收起文件夹',
	clickDesc: '点击缩进竖线，收起对应的文件夹并停在原位。',
};

export type Strings = typeof en;

/** Obsidian's interface language. When it follows the system, only i18next knows the real value. */
function language(): string {
	const i18next = (window as unknown as { i18next?: { language?: string } }).i18next;
	return i18next?.language || window.localStorage.getItem('language') || navigator.language || 'en';
}

export function strings(): Strings {
	return language().toLowerCase().startsWith('zh') ? zh : en;
}
