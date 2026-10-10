import type { View } from 'obsidian';
import { layoutStack, probeLine, slotAfterCollapse } from './layout.ts';
import type { Level, Slot } from './layout.ts';
import type { StickySettings } from './settings.ts';

/** The parts of Obsidian's (unexported) file explorer view this plugin touches. */
interface FolderItem {
	setCollapsed?: (collapsed: boolean, animate?: boolean) => unknown;
}
export interface ExplorerView extends View {
	fileItems?: Record<string, FolderItem | undefined>;
	tree?: { infinityScroll?: { rootEl?: { childrenEl?: HTMLElement } } };
}

interface Pinned {
	/** The real `.tree-item.nav-folder` element. Ancestors of rendered rows always stay in the DOM. */
	item: HTMLElement;
	self: HTMLElement;
	children: HTMLElement | null;
	path: string;
	name: string;
}

/** px either side of an indent guide that still counts as hovering it. */
const GUIDE_TOLERANCE = 5;

/**
 * Pins the open ancestor folders of the top of one file explorer.
 *
 * The pinned rows are clones of the real folder rows, drawn in a zero-height sticky host
 * that is the first child of the scroll container, so wheel, trackpad and touch scrolling
 * keep working over them. Clicks on them act on the real folder.
 */
export class StickyController {
	private container: HTMLElement | null = null;
	private host!: HTMLElement;
	private frame = 0;
	private key = '';
	private rows: HTMLElement[] = [];
	private chain: Pinned[] = [];
	private slots: Slot[] = [];
	private rowH = 0;
	private stackBottom = 0;
	private hovered: HTMLElement | null = null;
	private hoverFromGuide = false;
	private disposers: (() => void)[] = [];

	constructor(readonly view: ExplorerView, private settings: () => StickySettings) {}

	attach(): boolean {
		const container = this.view.containerEl.querySelector<HTMLElement>('.nav-files-container');
		if (!container) return false;
		this.container = container;
		this.host = createDiv({ cls: 'sf-host' });
		container.prepend(this.host);

		this.listen(container, 'scroll', () => this.schedule(), { passive: true });
		this.listen(container, 'mousemove', e => this.onMouseMove(e as MouseEvent));
		this.listen(container, 'mouseleave', () => this.setHover(null, false));
		// Capture phase: a click on an indent guide must not also open the row under it.
		this.listen(container, 'mousedown', e => this.onGuidePress(e as MouseEvent), true);
		this.listen(container, 'click', e => this.onGuideClick(e as MouseEvent), true);

		this.listen(this.host, 'click', e => this.onPinnedClick(e as MouseEvent));
		this.listen(this.host, 'contextmenu', e => this.onPinnedMenu(e as MouseEvent));
		// Keep Obsidian's own explorer handlers (selection, drag, drop onto the vault root)
		// away from the clones. Not calling preventDefault on dragover refuses the drop.
		for (const type of ['mousedown', 'dblclick', 'auxclick', 'dragstart', 'dragenter', 'dragover', 'drop']) {
			this.listen(this.host, type, e => e.stopPropagation());
		}

		const resize = new ResizeObserver(() => { this.key = ''; this.schedule(); });
		resize.observe(container);
		this.disposers.push(() => resize.disconnect());
		// Folders opening or closing elsewhere move the subtree ends without a scroll event.
		const mutations = new MutationObserver(records => {
			if (records.some(r => r.target !== container && !this.host.contains(r.target))) this.schedule();
		});
		mutations.observe(container, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
		this.disposers.push(() => mutations.disconnect());

		this.refreshStyle();
		return true;
	}

	detach(): void {
		if (this.frame) cancelAnimationFrame(this.frame);
		this.frame = 0;
		this.disposers.forEach(d => d());
		this.disposers = [];
		this.hovered?.removeClass('sf-hl');
		this.hovered = null;
		this.container?.removeClass('sf-guide-hover');
		this.host?.remove();
		this.container = null;
	}

	isAlive(): boolean {
		return !!this.container && this.container.isConnected && this.view.containerEl.contains(this.container);
	}

	/** Settings changed: rebuild the rows. */
	refresh(): void {
		this.key = '';
		this.setHover(null, false);
		this.schedule();
	}

	/** Theme or font changed: re-measure rows and the background the clones paint over. */
	refreshStyle(): void {
		if (!this.container) return;
		this.rowH = 0;
		this.key = '';
		this.host.style.setProperty('--sf-bg', this.backgroundOf(this.container));
		this.schedule();
	}

	/** Auto-reveal can scroll the active file to the very top, under the pinned rows. */
	keepActiveVisible(): void {
		const container = this.container;
		if (!container) return;
		this.update();
		const active = this.rootChildren()?.querySelector<HTMLElement>('.tree-item-self.is-active');
		if (!active) return;
		const r = active.getBoundingClientRect();
		const top = container.getBoundingClientRect().top + container.clientTop;
		if (r.bottom <= top || r.top >= this.stackBottom) return;
		container.scrollTop -= this.stackBottom - r.top;
		this.schedule();
	}

	private listen(el: HTMLElement, type: string, fn: (e: Event) => void, options?: boolean | AddEventListenerOptions): void {
		el.addEventListener(type, fn, options);
		this.disposers.push(() => el.removeEventListener(type, fn, options));
	}

	private schedule(): void {
		if (this.frame || !this.container) return;
		this.frame = requestAnimationFrame(() => {
			this.frame = 0;
			this.update();
		});
	}

	private rootChildren(): HTMLElement | null {
		const container = this.container;
		if (!container) return null;
		const root = this.view.tree?.infinityScroll?.rootEl?.childrenEl;
		if (root && container.contains(root)) return root;
		return Array.from(container.children).find((el): el is HTMLElement => el !== this.host) as HTMLElement ?? null;
	}

	private rowHeight(): number {
		if (!this.rowH) this.rowH = this.rootChildren()?.querySelector<HTMLElement>('.tree-item-self')?.offsetHeight ?? 0;
		return this.rowH;
	}

	private backgroundOf(el: HTMLElement): string {
		for (let node: HTMLElement | null = el; node; node = node.parentElement) {
			const bg = getComputedStyle(node).backgroundColor;
			if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') return bg;
		}
		return 'var(--background-secondary)';
	}

	private update(): void {
		const container = this.container;
		if (!container) return;
		// Hidden sidebar or collapsed view: nothing to measure.
		if (!container.isConnected || container.offsetParent === null) return;
		if (container.firstElementChild !== this.host) container.prepend(this.host);

		const settings = this.settings();
		const h = this.rowHeight();
		const root = this.rootChildren();
		if (!h || !root) return;
		const cRect = container.getBoundingClientRect();
		const top0 = cRect.top + container.clientTop;

		// The chain of open folders whose subtree crosses each probe line, outermost first.
		const chain: Pinned[] = [];
		const levels: Level[] = [];
		let parent: Element | null = root;
		while (parent) {
			const line = top0 + probeLine(chain.length, h, settings.maxRows);
			let found: HTMLElement | null = null;
			let bottom = 0;
			for (const el of Array.from(parent.children) as HTMLElement[]) {
				if (!el.classList.contains('nav-folder') || el.classList.contains('is-collapsed')) continue;
				const r = el.getBoundingClientRect();
				if (r.top >= line) break;
				if (r.bottom > line) {
					found = el;
					bottom = r.bottom;
					break;
				}
			}
			if (!found) break;
			const self = found.querySelector<HTMLElement>(':scope > .tree-item-self');
			const children = found.querySelector<HTMLElement>(':scope > .tree-item-children');
			if (!found.classList.contains('mod-root')) {
				if (!self) break;
				const path = self.getAttribute('data-path') ?? '';
				const name = self.querySelector('.tree-item-inner')?.textContent || path.split('/').pop() || path;
				chain.push({ item: found, self, children, path, name });
				levels.push({ bottom: bottom - top0 });
			}
			parent = children;
		}

		const slots = layoutStack(levels, h, settings.maxRows, settings.mergeMode);
		const key = slots.map(s => s.levels.map(i => chain[i].path).join('\n')).join('\n\n');
		this.chain = chain;
		this.slots = slots;
		if (key !== this.key) {
			this.key = key;
			this.render();
		}

		// Rows span the whole list width, so nothing drawn around a real row (the focus ring
		// reaches past the row's edges) shows beside them; the clone sits where the real row does.
		const hostRect = this.host.getBoundingClientRect();
		const innerLeft = cRect.left + container.clientLeft;
		let stackBottom = top0;
		slots.forEach((slot, k) => {
			const row = this.rows[k];
			const wrap = row.firstElementChild as HTMLElement;
			const lead = chain[slot.levels[0]].self.getBoundingClientRect();
			row.style.top = `${top0 + slot.top - hostRect.top}px`;
			row.style.left = `${innerLeft - hostRect.left}px`;
			row.style.width = `${container.clientWidth}px`;
			row.style.height = `${h}px`;
			wrap.style.marginLeft = `${lead.left - innerLeft}px`;
			wrap.style.width = `${lead.width}px`;
			stackBottom = Math.max(stackBottom, top0 + slot.top + h);
		});
		this.stackBottom = stackBottom;
	}

	private render(): void {
		this.rows.forEach(r => r.remove());
		const container = this.container;
		const innerLeft = container ? container.getBoundingClientRect().left + container.clientLeft : 0;
		this.rows = this.slots.map((slot, k) => {
			const lead = this.chain[slot.levels[0]];
			const nearest = slot.levels[slot.levels.length - 1];
			const row = this.host.createDiv({ cls: 'sf-row' });
			row.style.zIndex = String(100 - k);
			row.toggleClass('sf-last', k === this.slots.length - 1);
			row.toggleClass('sf-merged-row', slot.merged);
			row.dataset.sfLevel = String(nearest);

			const wrap = row.createDiv({ cls: 'tree-item nav-folder sf-item' });
			const self = lead.self.cloneNode(true) as HTMLElement;
			self.classList.remove('is-active', 'has-focus', 'is-selected', 'is-being-dragged-over', 'is-being-dragged');
			// Other plugins look rows up by data-path; they must keep finding the real one.
			self.removeAttribute('data-path');
			self.removeAttribute('draggable');
			self.style.setProperty('margin-inline-start', '0px', 'important');
			self.dataset.sfLevel = String(nearest);
			wrap.appendChild(self);

			if (slot.merged) {
				const inner = self.querySelector<HTMLElement>('.tree-item-inner');
				if (inner) {
					inner.empty();
					inner.addClass('sf-merged');
					const path = inner.createSpan({ cls: 'sf-path' });
					for (const i of slot.levels.slice(0, -1)) {
						path.createSpan({ cls: 'sf-seg', text: this.chain[i].name }).dataset.sfLevel = String(i);
						path.createSpan({ cls: 'sf-sep', text: ' / ' });
					}
					inner.createSpan({ cls: 'sf-seg sf-name', text: this.chain[nearest].name }).dataset.sfLevel = String(nearest);
				}
			}

			// Indent guides of the levels above this row, where the real ones would run.
			for (let j = 0; j < slot.levels[0]; j++) {
				const kids = this.chain[j].children;
				if (!kids) continue;
				const guide = row.createDiv({ cls: 'sf-guide' });
				guide.style.left = `${kids.getBoundingClientRect().left - innerLeft}px`;
				guide.dataset.sfGuide = String(j);
			}
			return row;
		});
		this.paintHover();
	}

	private levelOf(el: Element | null): number {
		const owner = el?.closest<HTMLElement>('[data-sf-level]');
		return owner ? Number(owner.dataset.sfLevel) : -1;
	}

	private onPinnedClick(e: MouseEvent): void {
		const pinned = this.chain[this.levelOf(e.target as Element)];
		e.preventDefault();
		e.stopPropagation();
		if (pinned && e.button === 0) void this.collapseInPlace(pinned.item);
	}

	/** Right-click a pinned row: Obsidian's own folder menu, as if on the real row. */
	private onPinnedMenu(e: MouseEvent): void {
		const pinned = this.chain[this.levelOf(e.target as Element)];
		e.preventDefault();
		e.stopPropagation();
		if (!pinned) return;
		pinned.self.dispatchEvent(new MouseEvent('contextmenu', {
			bubbles: true, cancelable: true, view: e.view,
			clientX: e.clientX, clientY: e.clientY, screenX: e.screenX, screenY: e.screenY,
			button: 2, buttons: 2, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey,
		}));
	}

	private onMouseMove(e: MouseEvent): void {
		if (!this.settings().guideHover) return this.setHover(null, false);
		const target = e.target as Element;
		if (this.host.contains(target)) {
			const pinned = this.chain[this.levelOf(target)];
			return this.setHover(pinned?.item ?? null, false);
		}
		this.setHover(this.guideAt(e), true);
	}

	/** The folder whose indent guide is under the pointer. Guides are the left border of `.tree-item-children`. */
	private guideAt(e: MouseEvent): HTMLElement | null {
		const container = this.container;
		if (!container) return null;
		let best: Element | null = null;
		let bestDistance = GUIDE_TOLERANCE + 0.01;
		let kids = (e.target as Element).closest('.tree-item-children');
		while (kids && container.contains(kids)) {
			const distance = Math.abs(e.clientX - (kids.getBoundingClientRect().left + 0.5));
			if (distance < bestDistance) {
				bestDistance = distance;
				best = kids;
			}
			kids = kids.parentElement?.closest('.tree-item-children') ?? null;
		}
		const item = best?.parentElement;
		return item && item.classList.contains('nav-folder') && !item.classList.contains('mod-root') ? item : null;
	}

	private guideClickTarget(e: MouseEvent): HTMLElement | null {
		const s = this.settings();
		if (!s.guideHover || !s.guideClick || e.button !== 0) return null;
		if (this.host.contains(e.target as Node)) return null;
		return this.guideAt(e);
	}

	private onGuidePress(e: MouseEvent): void {
		if (!this.guideClickTarget(e)) return;
		e.preventDefault();
		e.stopPropagation();
	}

	private onGuideClick(e: MouseEvent): void {
		const item = this.guideClickTarget(e);
		if (!item) return;
		e.preventDefault();
		e.stopPropagation();
		void this.collapseInPlace(item);
	}

	private setHover(item: HTMLElement | null, fromGuide: boolean): void {
		if (item === this.hovered && fromGuide === this.hoverFromGuide) return;
		this.hovered?.removeClass('sf-hl');
		this.hovered = item;
		this.hoverFromGuide = !!item && fromGuide;
		item?.addClass('sf-hl');
		this.container?.toggleClass('sf-guide-hover', this.hoverFromGuide && this.settings().guideClick);
		this.paintHover();
	}

	/**
	 * Hovering a folder (its guide, pinned row or grey name) names it in place: the real row's
	 * name (styles.css, `.sf-hl`) and its pinned row, grey name and guide inside the pinned rows.
	 */
	private paintHover(): void {
		const level = this.hovered ? this.chain.findIndex(p => p.item === this.hovered) : -1;
		this.rows.forEach((row, k) => {
			const slot = this.slots[k];
			row.toggleClass('sf-on', !!slot && !slot.merged && slot.levels[0] === level);
			row.querySelectorAll<HTMLElement>('.sf-seg').forEach(seg => seg.toggleClass('sf-on', Number(seg.dataset.sfLevel) === level));
			row.querySelectorAll<HTMLElement>('.sf-guide').forEach(g => g.toggleClass('sf-on', Number(g.dataset.sfGuide) === level));
		});
	}

	private depthOf(item: HTMLElement): number {
		let depth = 0;
		for (let p = item.parentElement; p && p !== this.container; p = p.parentElement) {
			if (p.classList.contains('nav-folder') && !p.classList.contains('mod-root')) depth++;
		}
		return depth;
	}

	/** Collapse a folder and scroll so its row sits right under the rows still pinned above it. */
	private async collapseInPlace(item: HTMLElement): Promise<void> {
		const container = this.container;
		if (!container) return;
		const self = item.querySelector<HTMLElement>(':scope > .tree-item-self');
		const path = self?.getAttribute('data-path');
		const folder = path != null ? this.view.fileItems?.[path] : undefined;
		const slot = slotAfterCollapse(this.depthOf(item), this.settings().maxRows);
		this.setHover(null, false);

		const place = () => {
			if (!this.container) return;
			const top0 = container.getBoundingClientRect().top + container.clientTop;
			container.scrollTop += item.getBoundingClientRect().top - (top0 + slot * this.rowHeight());
			this.schedule();
		};
		if (typeof folder?.setCollapsed === 'function') {
			await folder.setCollapsed(true, false);
			place();
			requestAnimationFrame(place);
		} else {
			// Unknown Obsidian internals: fall back to a real click, which animates.
			self?.click();
			window.setTimeout(place, 250);
		}
	}
}
