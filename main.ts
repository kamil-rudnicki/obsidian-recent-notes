import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, WorkspaceLeaf, ItemView, ViewStateResult, Menu } from 'obsidian';
import { moment } from 'obsidian';

interface RecentNotesSettings {
	maxNotesToShow: number;
	showMarkdownFiles: boolean;
	showImageFiles: boolean;
	showPDFFiles: boolean;
	showAudioFiles: boolean;
	showVideoFiles: boolean;
	showCanvasFiles: boolean;
}

const DEFAULT_SETTINGS: RecentNotesSettings = {
	maxNotesToShow: 100,
	showMarkdownFiles: true,
	showImageFiles: true,
	showPDFFiles: true,
	showAudioFiles: true,
	showVideoFiles: true,
	showCanvasFiles: true
}

const VIEW_TYPE_RECENT_NOTES = "recent-notes-view";

class RecentNotesView extends ItemView {
	plugin: RecentNotesPlugin;
	private refreshTimeout: NodeJS.Timeout | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: RecentNotesPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.containerEl.addClass('recent-notes-view');
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
		return "Recent notes";
	}

	public getIcon(): string {
		return 'clock-10';
	}

	async getFirstLineOfFile(file: TFile): Promise<string> {
		const ext = file.extension.toLowerCase();
		
		// For non-markdown files, return file type and size
		if (ext !== 'md') {
			const size = file.stat.size;
			let sizeStr = '';
			if (size < 1024) {
				sizeStr = `${size} B`;
			} else if (size < 1024 * 1024) {
				sizeStr = `${(size / 1024).toFixed(1)} KB`;
			} else {
				sizeStr = `${(size / (1024 * 1024)).toFixed(1)} MB`;
			}
			
			if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg'].includes(ext)) {
				return `Image file • ${sizeStr}`;
			} else if (ext === 'pdf') {
				return `PDF document • ${sizeStr}`;
			} else if (['mp3', 'wav', 'm4a', 'ogg', '3gp', 'flac', 'webm', 'aac'].includes(ext)) {
				return `Audio file • ${sizeStr}`;
			} else if (['mp4', 'webm', 'ogv', 'mov', 'mkv'].includes(ext)) {
				return `Video file • ${sizeStr}`;
			} else if (ext === 'canvas') {
				return 'Canvas file';
			}
			return `${ext.toUpperCase()} file • ${sizeStr}`;
		}

		// For markdown files, show first non-empty line
		const content = await this.app.vault.cachedRead(file);
		const lines = content.split('\n');
		
		// Skip YAML frontmatter if present
		let startIndex = 0;
		if (lines[0]?.trim() === '---') {
			for (let i = 1; i < lines.length; i++) {
				if (lines[i]?.trim() === '---') {
					startIndex = i + 1;
					break;
				}
			}
		}
		
		// Find first non-empty line after frontmatter
		for (let i = startIndex; i < lines.length; i++) {
			const line = lines[i]?.trim();
			if (line && line !== '---') {
				return line.replace(/^#\s*/, ''); // Remove heading markers
			}
		}
		
		return 'No additional text';
	}

	getTimeSection(date: moment.Moment): string {
		const now = moment();
		if (date.isSame(now, 'day')) return 'Today';
		if (date.isSame(now.subtract(1, 'day'), 'day')) return 'Yesterday';
		if (date.isAfter(now.subtract(7, 'days'))) return 'Previous 7 days';
		if (date.isAfter(now.subtract(30, 'days'))) return 'Previous 30 days';
		
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
			.filter(file => {
				const ext = file.extension.toLowerCase();
				return (
					(this.plugin.settings.showMarkdownFiles && ext === 'md') ||
					(this.plugin.settings.showImageFiles && ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg'].includes(ext)) ||
					(this.plugin.settings.showPDFFiles && ext === 'pdf') ||
					(this.plugin.settings.showAudioFiles && ['mp3', 'wav', 'm4a', 'ogg', '3gp', 'flac', 'webm', 'aac'].includes(ext)) ||
					(this.plugin.settings.showVideoFiles && ['mp4', 'webm', 'ogv', 'mov', 'mkv'].includes(ext)) ||
					(this.plugin.settings.showCanvasFiles && ext === 'canvas')
				);
			})
			.sort((a, b) => b.stat.mtime - a.stat.mtime)
			.slice(0, this.plugin.settings.maxNotesToShow);

		let currentSection = '';
		const activeFile = this.app.workspace.getActiveFile();
		
		for (const file of files) {
			const fileDate = moment(file.stat.mtime);
			const section = this.getTimeSection(fileDate);
			
			if (section !== currentSection) {
				currentSection = section;
				container.createEl('h6', { text: section });
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

			fileContainer.addEventListener('click', (event: MouseEvent) => {
				const leaf = this.app.workspace.getLeaf(
					// Create new leaf if CMD/CTRL is pressed
					event.metaKey || event.ctrlKey
				);
				leaf.openFile(file);
			});

			// Add context menu handler
			fileContainer.addEventListener('contextmenu', (event: MouseEvent) => {
				event.preventDefault();
				const menu = new Menu();

				// Add delete option at the top
				menu.addItem((item) => {
					item
						.setIcon('trash')
						.setTitle('Delete')
						.onClick(async () => {
							const confirmed = await this.app.vault.adapter.exists(file.path);
							if (confirmed) {
								await this.app.vault.trash(file, true);
								this.refreshView();
							}
						});
				});

				menu.addSeparator();

				// Show standard file menu
				this.app.workspace.trigger('file-menu', menu, file, 'recent-notes-view', null);
				menu.showAtPosition({ x: event.clientX, y: event.clientY });
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

		this.addRibbonIcon('clock-10', 'Recent notes', () => {
			this.activateView();
		});

		this.addCommand({
			id: 'show-recent-notes',
			name: 'Open',
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

		containerEl.createEl('h3', { text: 'File types to show' });

		new Setting(containerEl)
			.setName('Show Markdown files')
			.setDesc('Show .md files in the recent list')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showMarkdownFiles)
				.onChange(async (value) => {
					this.plugin.settings.showMarkdownFiles = value;
					await this.plugin.saveSettings();
					if (this.plugin.view) {
						await this.plugin.view.refreshView();
					}
				}));

		new Setting(containerEl)
			.setName('Show Image files')
			.setDesc('Show image files (png, jpg, gif, etc.) in the recent list')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showImageFiles)
				.onChange(async (value) => {
					this.plugin.settings.showImageFiles = value;
					await this.plugin.saveSettings();
					if (this.plugin.view) {
						await this.plugin.view.refreshView();
					}
				}));

		new Setting(containerEl)
			.setName('Show PDF files')
			.setDesc('Show .pdf files in the recent list')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showPDFFiles)
				.onChange(async (value) => {
					this.plugin.settings.showPDFFiles = value;
					await this.plugin.saveSettings();
					if (this.plugin.view) {
						await this.plugin.view.refreshView();
					}
				}));

		new Setting(containerEl)
			.setName('Show Audio files')
			.setDesc('Show audio files (mp3, wav, etc.) in the recent list')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showAudioFiles)
				.onChange(async (value) => {
					this.plugin.settings.showAudioFiles = value;
					await this.plugin.saveSettings();
					if (this.plugin.view) {
						await this.plugin.view.refreshView();
					}
				}));

		new Setting(containerEl)
			.setName('Show Video files')
			.setDesc('Show video files (mp4, webm, etc.) in the recent list')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showVideoFiles)
				.onChange(async (value) => {
					this.plugin.settings.showVideoFiles = value;
					await this.plugin.saveSettings();
					if (this.plugin.view) {
						await this.plugin.view.refreshView();
					}
				}));

		new Setting(containerEl)
			.setName('Show Canvas files')
			.setDesc('Show .canvas files in the recent list')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showCanvasFiles)
				.onChange(async (value) => {
					this.plugin.settings.showCanvasFiles = value;
					await this.plugin.saveSettings();
					if (this.plugin.view) {
						await this.plugin.view.refreshView();
					}
				}));
	}
}

