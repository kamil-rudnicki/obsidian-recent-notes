import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, WorkspaceLeaf, ItemView, ViewStateResult, Menu, FileView } from 'obsidian';
import { moment } from 'obsidian';

interface RecentNotesSettings {
	maxNotesToShow: number;
	showMarkdownFiles: boolean;
	showImageFiles: boolean;
	showPDFFiles: boolean;
	showAudioFiles: boolean;
	showVideoFiles: boolean;
	showCanvasFiles: boolean;
	showCSVFiles: boolean;
	excludedFolders: string[];
	excludedFiles: string[];
	previewLines: number;
}

const DEFAULT_SETTINGS: RecentNotesSettings = {
	maxNotesToShow: 100,
	showMarkdownFiles: true,
	showImageFiles: true,
	showPDFFiles: true,
	showAudioFiles: true,
	showVideoFiles: true,
	showCanvasFiles: true,
	showCSVFiles: true,
	excludedFolders: [],
	excludedFiles: [],
	previewLines: 1
}

const VIEW_TYPE_RECENT_NOTES = "recent-notes-view";

class RecentNotesView extends ItemView {
	plugin: RecentNotesPlugin;
	private refreshTimeout: NodeJS.Timeout | null = null;
	private lastActiveFile: string | null = null;
	private firstLineCache: Map<string, { line: string, timestamp: number }> = new Map();
	private readonly MAX_FILE_SIZE_FOR_PREVIEW = 100 * 1024; // 100 KB
	private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

	constructor(leaf: WorkspaceLeaf, plugin: RecentNotesPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.containerEl.addClass('recent-notes-view');
	}

	private clearOldCache() {
		const now = Date.now();
		for (const [path, data] of this.firstLineCache.entries()) {
			if (now - data.timestamp > this.CACHE_DURATION) {
				this.firstLineCache.delete(path);
			}
		}
	}

	private debouncedRefresh = () => {
		if (this.refreshTimeout) {
			clearTimeout(this.refreshTimeout);
		}
		this.refreshTimeout = setTimeout(() => {
			this.refreshView();
			this.refreshTimeout = null;
		}, 20);
	};

	private shouldRefreshForFile(file: TFile | null): boolean {
		if (!file) return false;

		// Check if it's the same file as last time
		if (this.lastActiveFile === file.path) return false;
		this.lastActiveFile = file.path;

		// Check if file is in excluded folder
		const filePath = file.path.toLowerCase();
		const isExcluded = this.plugin.settings.excludedFolders.some(folder => {
			const normalizedFolder = folder.toLowerCase().trim();
			return normalizedFolder && filePath.startsWith(normalizedFolder + '/');
		});
		if (isExcluded) return false;

		// Check if file is in excluded files list
		const isExcludedFile = this.plugin.settings.excludedFiles.some(excludedFile => {
			const normalizedExcludedFile = excludedFile.toLowerCase().trim();
			return normalizedExcludedFile && filePath === normalizedExcludedFile;
		});
		if (isExcludedFile) return false;

		// Check if file type is enabled in settings
		const ext = file.extension.toLowerCase();
		return (
			(this.plugin.settings.showMarkdownFiles && ext === 'md') ||
			(this.plugin.settings.showImageFiles && ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg'].includes(ext)) ||
			(this.plugin.settings.showPDFFiles && ext === 'pdf') ||
			(this.plugin.settings.showAudioFiles && ['mp3', 'wav', 'm4a', 'ogg', '3gp', 'flac', 'webm', 'aac'].includes(ext)) ||
			(this.plugin.settings.showVideoFiles && ['mp4', 'webm', 'ogv', 'mov', 'mkv'].includes(ext)) ||
			(this.plugin.settings.showCanvasFiles && ext === 'canvas') ||
			(this.plugin.settings.showCSVFiles && ext === 'csv')
		);
	}

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
			} else if (ext === 'csv') {
				// Skip large CSV files
				if (file.stat.size > this.MAX_FILE_SIZE_FOR_PREVIEW) {
					return `CSV file • ${sizeStr}`;
				}

				// Check cache first
				const cached = this.firstLineCache.get(file.path);
				if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
					return cached.line;
				}

				// For CSV files, show first line (usually headers)
				try {
					const content = await this.app.vault.cachedRead(file);
					const firstLine = content.split('\n')[0]?.trim();
					if (firstLine) {
						// Truncate if too long
						const preview = firstLine.length > 50 ? firstLine.slice(0, 47) + '...' : firstLine;
						const result = `CSV • ${preview} • ${sizeStr}`;
						// Cache the result
						this.firstLineCache.set(file.path, { line: result, timestamp: Date.now() });
						return result;
					}
					return `CSV file • ${sizeStr}`;
				} catch {
					return `CSV file • ${sizeStr}`;
				}
			}
			return `${ext.toUpperCase()} file • ${sizeStr}`;
		}

		// Skip large markdown files
		if (file.stat.size > this.MAX_FILE_SIZE_FOR_PREVIEW) {
			return 'Large markdown file';
		}

		// Check cache first for markdown files
		const cached = this.firstLineCache.get(file.path);
		if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
			return cached.line;
		}

		// For markdown files, show first non-empty line
		try {
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
			let previewLines: string[] = [];
			for (let i = startIndex; i < lines.length && previewLines.length < this.plugin.settings.previewLines; i++) {
				const line = lines[i]?.trim();
				if (line && line !== '---' && !line.startsWith('# ')) {
					previewLines.push(line);
				}
			}
			
			if (previewLines.length > 0) {
				const preview = previewLines.join('\n');
				// Cache the result
				this.firstLineCache.set(file.path, { line: preview, timestamp: Date.now() });
				return preview;
			}
			
			return 'No additional text';
		} catch {
			return 'Error reading file';
		}
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
			.filter(file => this.shouldRefreshForFile(file))
			.sort((a, b) => b.stat.mtime - a.stat.mtime)
			.slice(0, this.plugin.settings.maxNotesToShow);

		let currentSection = '';
		const activeLeaf = this.app.workspace.activeLeaf;
		const activeState = activeLeaf?.getViewState();
		const activeFilePath = activeState?.state?.file;
		
		for (const file of files) {
			const fileDate = moment(file.stat.mtime);
			const section = this.getTimeSection(fileDate);
			
			if (section !== currentSection) {
				currentSection = section;
				container.createEl('h6', { text: section });
			}

			const fileContainer = container.createEl('div', { 
				cls: `recent-note-item ${activeFilePath === file.path ? 'is-active' : ''}`
			});
			const titleEl = fileContainer.createEl('div', { 
				text: file.basename,
				cls: 'recent-note-title'
			});

			const hasMultipleLines = this.plugin.settings.previewLines > 1;
			const infoContainer = fileContainer.createEl('div', { 
				cls: `recent-note-info ${hasMultipleLines ? 'has-multiple-lines' : ''}`
			});
			
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

			const firstLine = await this.getFirstLineOfFile(file);
			const previewContainer = infoContainer.createEl('div', {
				cls: `recent-note-preview ${hasMultipleLines ? 'has-multiple-lines' : ''}`
			});
			
			firstLine.split('\n').forEach(line => {
				previewContainer.createEl('div', {
					text: line,
					cls: 'recent-note-preview-line'
				});
			});

			// Add date after preview if multiple lines are shown
			const dateEl = infoContainer.createEl('span', {
				text: dateText,
				cls: hasMultipleLines ? 'recent-note-date recent-note-date-below' : 'recent-note-date'
			});

			fileContainer.addEventListener('click', async (event: MouseEvent) => {
				const leaf = this.app.workspace.getLeaf(
					// Create new leaf if CMD/CTRL is pressed
					event.metaKey || event.ctrlKey
				);
				await leaf.openFile(file);

				// For non-markdown files, give them a moment to become active
				if (file.extension !== 'md') {
					setTimeout(() => {
						this.debouncedRefresh();
					}, 50);
				}
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
							const exists = await this.app.vault.adapter.exists(file.path);
							if (!exists) return;
							
							const confirmation = confirm(`Are you sure you want to delete "${file.path}"?`);
							if (!confirmation) return;
							
							await this.app.fileManager.trashFile(file);
							this.refreshView();
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
		// Clear old cache entries periodically
		this.registerInterval(window.setInterval(() => this.clearOldCache(), this.CACHE_DURATION));
		await this.refreshView();
		
		// Register all events with the debounced refresh
		this.registerEvent(
			this.app.vault.on('modify', (file) => {
				if (file instanceof TFile) {
					// Clear the cache for the modified file
					this.firstLineCache.delete(file.path);
				}
				const activeFile = this.app.workspace.getActiveFile();
				if (this.shouldRefreshForFile(activeFile)) {
					this.debouncedRefresh();
				}
			})
		);

		// Only refresh on create/delete if it matches our criteria
		this.registerEvent(
			this.app.vault.on('create', (file) => {
				if (file instanceof TFile && this.shouldRefreshForFile(file)) {
					this.debouncedRefresh();
				}
			})
		);

		this.registerEvent(
			this.app.vault.on('delete', (file) => {
				if (file instanceof TFile && this.shouldRefreshForFile(file)) {
					this.debouncedRefresh();
				}
			})
		);

		this.registerEvent(
			this.app.vault.on('rename', (file) => {
				if (file instanceof TFile && this.shouldRefreshForFile(file)) {
					this.debouncedRefresh();
				}
			})
		);

		// Only refresh on leaf change if the active file changed
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (this.shouldRefreshForFile(activeFile)) {
					this.debouncedRefresh();
				}
			})
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

		new Setting(containerEl)
				.setName('Preview lines')
				.setDesc('Number of text lines to show in the preview (1-3)')
				.addDropdown(dropdown => dropdown
					.addOption('1', '1 line')
					.addOption('2', '2 lines')
					.addOption('3', '3 lines')
					.setValue(this.plugin.settings.previewLines.toString())
					.onChange(async (value) => {
						this.plugin.settings.previewLines = parseInt(value);
						await this.plugin.saveSettings();
						// Clear the entire cache when changing preview lines
						if (this.plugin.view) {
							this.plugin.view.firstLineCache.clear();
							await this.plugin.view.refreshView();
						}
					}));

		new Setting(containerEl)
			.setName('Excluded folders')
			.setDesc('List of folders to exclude from recent files (one per line)')
			.addTextArea(text => text
				.setPlaceholder('folder1\nfolder2/subfolder')
				.setValue(this.plugin.settings.excludedFolders.join('\n'))
				.onChange(async (value) => {
					const folders = value.split('\n')
						.map(folder => folder.trim())
						.filter(folder => folder.length > 0);
					this.plugin.settings.excludedFolders = folders;
					await this.plugin.saveSettings();
					if (this.plugin.view) {
						await this.plugin.view.refreshView();
					}
				}));

		new Setting(containerEl)
			.setName('Excluded files')
			.setDesc('List of specific files to exclude from recent files (one per line, full path required)')
			.addTextArea(text => text
				.setPlaceholder('folder1/note.md\nfolder2/image.png')
				.setValue(this.plugin.settings.excludedFiles.join('\n'))
				.onChange(async (value) => {
					const files = value.split('\n')
						.map(file => file.trim())
						.filter(file => file.length > 0);
					this.plugin.settings.excludedFiles = files;
					await this.plugin.saveSettings();
					if (this.plugin.view) {
						await this.plugin.view.refreshView();
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

		new Setting(containerEl)
			.setName('Show CSV files')
			.setDesc('Show .csv files in the recent list')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showCSVFiles)
				.onChange(async (value) => {
					this.plugin.settings.showCSVFiles = value;
					await this.plugin.saveSettings();
					if (this.plugin.view) {
						await this.plugin.view.refreshView();
					}
				}));
	}
}

