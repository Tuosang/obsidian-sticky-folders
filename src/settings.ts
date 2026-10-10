import { App, PluginSettingTab } from 'obsidian';
import type { SettingDefinitionItem } from 'obsidian';
import type { MergeMode } from './layout.ts';
import type StickyFoldersPlugin from './main.ts';
import { strings } from './i18n.ts';

export interface StickySettings {
	/** Most rows pinned at the top of the file list. */
	maxRows: number;
	/** Which end merges into one grey row once there are more levels than rows. */
	mergeMode: MergeMode;
	/** Hovering an indent guide, pinned row or grey name highlights that folder's range. */
	guideHover: boolean;
	/** Clicking an indent guide collapses its folder. */
	guideClick: boolean;
}

export const DEFAULT_SETTINGS: StickySettings = {
	maxRows: 4,
	mergeMode: 'deep',
	guideHover: true,
	guideClick: true,
};

type Key = keyof StickySettings;

/** Declarative settings (Obsidian 1.13+), so they also show up in the settings search. */
export class StickySettingTab extends PluginSettingTab {
	constructor(app: App, private plugin: StickyFoldersPlugin) {
		super(app, plugin);
	}

	getSettingDefinitions(): SettingDefinitionItem<Key>[] {
		const t = strings();
		const s = this.plugin.settings;
		return [
			{
				name: t.rowsName,
				desc: t.rowsDesc,
				control: { type: 'slider', key: 'maxRows', min: 1, max: 8, step: 1, defaultValue: DEFAULT_SETTINGS.maxRows },
			},
			{
				name: t.mergeName,
				desc: t.mergeDesc,
				control: {
					type: 'dropdown',
					key: 'mergeMode',
					options: { deep: t.mergeDeep, outer: t.mergeOuter },
					defaultValue: DEFAULT_SETTINGS.mergeMode,
				},
			},
			{
				name: t.guideName,
				desc: t.guideDesc,
				control: { type: 'toggle', key: 'guideHover', defaultValue: DEFAULT_SETTINGS.guideHover },
			},
			{
				name: t.clickName,
				desc: t.clickDesc,
				control: { type: 'toggle', key: 'guideClick', defaultValue: DEFAULT_SETTINGS.guideClick, disabled: () => !s.guideHover },
			},
		];
	}

	getControlValue(key: string): unknown {
		return this.plugin.settings[key as Key];
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		const s = this.plugin.settings;
		if (key === 'maxRows' && typeof value === 'number') s.maxRows = Math.min(8, Math.max(1, Math.round(value)));
		else if (key === 'mergeMode') s.mergeMode = value === 'outer' ? 'outer' : 'deep';
		else if (key === 'guideHover' && typeof value === 'boolean') s.guideHover = value;
		else if (key === 'guideClick' && typeof value === 'boolean') s.guideClick = value;
		else return;
		await this.plugin.saveSettings();
		// "Click a guide to collapse" is only available while guide hints are on.
		if (key === 'guideHover') this.update();
	}
}
