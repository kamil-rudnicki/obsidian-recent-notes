import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, WorkspaceLeaf, ItemView, ViewStateResult } from 'obsidian';
import { moment } from 'obsidian';

interface RecentNotesSettings {
	maxNotesToShow: number;
}

const DEFAULT_SETTINGS: RecentNotesSettings = {
	maxNotesToShow: 100
}

const VIEW_TYPE_RECENT_NOTES = "recent-notes-view";

class RecentNotesView extends ItemView {
	plugin: RecentNotesPlugin;
	private refreshTimeout: NodeJS.Timeout | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: RecentNotesPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	private debouncedRefresh = () => {
		if (this.refreshTimeout) {
			clearTimeout(this.refreshTimeout);
		}
		this.refreshTimeout = setTimeout(() => {
			this.refreshView();
			this.refreshTimeout = null;
		}, 100);
	};

	getViewType(): string {
		return VIEW_TYPE_RECENT_NOTES;
	}

	getDisplayText(): string {
		return "Recent Notes";
	}

	async getFirstLineOfFile(file: TFile): Promise<string> {
		const content = await this.app.vault.cachedRead(file);
		const firstLine = content.split('\n')[0].replace(/^#\s*/, ''); // Remove heading markers
		return firstLine || 'No additional text';
	}

	getTimeSection(date: moment.Moment): string {
		const now = moment();
		if (date.isSame(now, 'day')) return 'Today';
		if (date.isSame(now.subtract(1, 'day'), 'day')) return 'Yesterday';
		if (date.isAfter(now.subtract(7, 'days'))) return 'Previous 7 Days';
		if (date.isAfter(now.subtract(30, 'days'))) return 'Previous 30 Days';
		
		// For dates in current year, show month name
		if (date.isSame(now, 'year')) {
			return date.format('MMMM');
		}
		// For previous years, show year only
		return date.format('YYYY');
	}

	async refreshView() {
		const container = this.containerEl.children[1];
		container.empty();
		
		const files = this.app.vault.getFiles()
			.filter(file => file.extension === 'md')
			.sort((a, b) => b.stat.mtime - a.stat.mtime)
			.slice(0, this.plugin.settings.maxNotesToShow);

		let currentSection = '';
		const activeFile = this.app.workspace.getActiveFile();
		
		for (const file of files) {
			const fileDate = moment(file.stat.mtime);
			const section = this.getTimeSection(fileDate);
			
			if (section !== currentSection) {
				currentSection = section;
				container.createEl('h6', { text: section, cls: 'recent-notes-view'});
			}

			const fileContainer = container.createEl('div', { 
				cls: `recent-note-item ${activeFile && activeFile.path === file.path ? 'is-active' : ''}`
			});
			const titleEl = fileContainer.createEl('div', { 
				text: file.basename,
				cls: 'recent-note-title'
			});

			const infoContainer = fileContainer.createEl('div', { cls: 'recent-note-info' });
			
			const now = moment();
			let dateText;
			if (section === 'Today') {
				dateText = moment(file.stat.mtime).format('HH:mm');
			} else if (section === 'Yesterday') {
				dateText = moment(file.stat.mtime).format('HH:mm');
			} else if (moment(file.stat.mtime).isAfter(now.subtract(7, 'days'))) {
				dateText = moment(file.stat.mtime).format('dddd');
			} else {
				dateText = moment(file.stat.mtime).format('DD/MM/YYYY');
			}
				
			infoContainer.createEl('span', {
				text: dateText,
				cls: 'recent-note-date'
			});

			const firstLine = await this.getFirstLineOfFile(file);
			infoContainer.createEl('span', {
				text: firstLine,
				cls: 'recent-note-preview'
			});

			fileContainer.addEventListener('click', () => {
				this.app.workspace.getLeaf().openFile(file);
			});
		}
	}

	async onOpen() {
		await this.refreshView();
		
		// Register all events with the debounced refresh
		this.registerEvent(
			this.app.vault.on('modify', this.debouncedRefresh)
		);
		this.registerEvent(
			this.app.vault.on('create', this.debouncedRefresh)
		);
		this.registerEvent(
			this.app.vault.on('delete', this.debouncedRefresh)
		);
		this.registerEvent(
			this.app.vault.on('rename', this.debouncedRefresh)
		);
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', this.debouncedRefresh)
		);
		this.registerEvent(
			this.app.workspace.on('file-open', this.debouncedRefresh)
		);
	}

	async onClose() {
		if (this.refreshTimeout) {
			clearTimeout(this.refreshTimeout);
		}
	}
}

export default class RecentNotesPlugin extends Plugin {
	settings: RecentNotesSettings;
	view: RecentNotesView;

	async onload() {
		await this.loadSettings();

		this.registerView(
			VIEW_TYPE_RECENT_NOTES,
			(leaf) => (this.view = new RecentNotesView(leaf, this))
		);

		this.addRibbonIcon('clock', 'Recent Notes', () => {
			this.activateView();
		});

		this.addCommand({
			id: 'show-recent-notes',
			name: 'Show Recent Notes',
			callback: () => {
				this.activateView();
			},
		});

		this.addSettingTab(new RecentNotesSettingTab(this.app, this));
	}

	async activateView() {
		const { workspace } = this.app;
		
		let leaf: WorkspaceLeaf | null = workspace.getLeavesOfType(VIEW_TYPE_RECENT_NOTES)[0];
		
		if (!leaf) {
			leaf = workspace.getRightLeaf(false);
			if (leaf) {
				await leaf.setViewState({
					type: VIEW_TYPE_RECENT_NOTES,
					active: true,
				});
			}
		}
		
		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class RecentNotesSettingTab extends PluginSettingTab {
	plugin: RecentNotesPlugin;

	constructor(app: App, plugin: RecentNotesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Maximum notes to show')
			.setDesc('How many recent notes to display in the view')
			.addText(text => text
				.setPlaceholder('100')
				.setValue(this.plugin.settings.maxNotesToShow.toString())
				.onChange(async (value) => {
					const numValue = parseInt(value);
					if (!isNaN(numValue)) {
						this.plugin.settings.maxNotesToShow = numValue;
						await this.plugin.saveSettings();
						if (this.plugin.view) {
							await this.plugin.view.refreshView();
						}
					}
				}));
	}
}

