import { App, PluginSettingTab, Setting } from 'obsidian';
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

export class StickySettingTab extends PluginSettingTab {
	constructor(app: App, private plugin: StickyFoldersPlugin) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		const s = this.plugin.settings;
		const t = strings();
		containerEl.empty();

		new Setting(containerEl)
			.setName(t.rowsName)
			.setDesc(t.rowsDesc)
			.addSlider(slider => slider
				.setLimits(1, 8, 1)
				.setValue(s.maxRows)
				.setDynamicTooltip()
				.onChange(async value => {
					s.maxRows = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(t.mergeName)
			.setDesc(t.mergeDesc)
			.addDropdown(dropdown => dropdown
				.addOption('deep', t.mergeDeep)
				.addOption('outer', t.mergeOuter)
				.setValue(s.mergeMode)
				.onChange(async value => {
					s.mergeMode = value === 'outer' ? 'outer' : 'deep';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(t.guideName)
			.setDesc(t.guideDesc)
			.addToggle(toggle => toggle
				.setValue(s.guideHover)
				.onChange(async value => {
					s.guideHover = value;
					await this.plugin.saveSettings();
					this.display();
				}));

		new Setting(containerEl)
			.setName(t.clickName)
			.setDesc(t.clickDesc)
			.setDisabled(!s.guideHover)
			.addToggle(toggle => toggle
				.setValue(s.guideClick)
				.setDisabled(!s.guideHover)
				.onChange(async value => {
					s.guideClick = value;
					await this.plugin.saveSettings();
				}));
	}
}
