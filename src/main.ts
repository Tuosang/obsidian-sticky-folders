import { Plugin } from 'obsidian';
import type { View } from 'obsidian';
import { StickyController } from './controller.ts';
import { DEFAULT_SETTINGS, StickySettingTab } from './settings.ts';
import type { StickySettings } from './settings.ts';

export default class StickyFoldersPlugin extends Plugin {
	settings: StickySettings = { ...DEFAULT_SETTINGS };
	private controllers = new Map<View, StickyController>();

	async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new StickySettingTab(this.app, this));

		this.app.workspace.onLayoutReady(() => this.sync());
		// File explorers can be opened, closed, moved between sidebars or loaded late (deferred views).
		this.registerEvent(this.app.workspace.on('layout-change', () => this.sync()));
		this.registerEvent(this.app.workspace.on('css-change', () => this.each(c => c.refreshStyle())));
		this.registerEvent(this.app.workspace.on('file-open', () => {
			window.setTimeout(() => this.each(c => c.keepActiveVisible()), 150);
		}));
	}

	onunload(): void {
		this.each(c => c.detach());
		this.controllers.clear();
	}

	async loadSettings(): Promise<void> {
		this.settings = { ...DEFAULT_SETTINGS, ...((await this.loadData()) as Partial<StickySettings> | null) };
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.each(c => c.refresh());
	}

	private each(fn: (c: StickyController) => void): void {
		this.controllers.forEach(fn);
	}

	private sync(): void {
		const views = new Set(this.app.workspace.getLeavesOfType('file-explorer').map(leaf => leaf.view));
		for (const [view, controller] of this.controllers) {
			if (!views.has(view) || !controller.isAlive()) {
				controller.detach();
				this.controllers.delete(view);
			}
		}
		for (const view of views) {
			if (this.controllers.has(view)) continue;
			const controller = new StickyController(view, () => this.settings);
			if (controller.attach()) this.controllers.set(view, controller);
		}
	}
}
