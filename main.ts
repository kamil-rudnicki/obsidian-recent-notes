import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, WorkspaceLeaf, ItemView, ViewStateResult, Menu, FileView, setIcon, getAllTags } from 'obsidian';
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
	excludedTags: string[];
	previewLines: number;
	showTime: boolean;
	pinnedNotes: string[];
	dateFormat: string;
	propertyModified: string;
	density: string;
	openInNewTab: string;
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
	excludedTags: [],
	previewLines: 1,
	showTime: true,
	pinnedNotes: [],
	dateFormat: 'DD/MM/YYYY',
	propertyModified: '',
	density: 'comfortable',
	openInNewTab: 'new'
}

// Insert localization translations
const LOCALES: Record<string, Record<string, string>> = {
	en: {
		recentNotes: "Recent notes",
		pinned: "Pinned",
		deleteFile: "Delete file",
		areYouSureDelete: 'Are you sure you want to delete "{filename}"?',
		delete: "Delete",
		cancel: "Cancel",
		open: "Open",
		openInNewTab: "Open in new tab",
		moveToPrevious: "Move to previous note",
		moveToNext: "Move to next note",
		today: "Today",
		yesterday: "Yesterday",
		previous7days: "Previous 7 days",
		previous30days: "Previous 30 days",
		daysago: "days ago",
		density: "Density",
		comfortable: "Comfortable",
		compact: "Compact",
		densityDesc: "Choose between comfortable (default) or compact display"
	},
	pl: {
		recentNotes: "Ostatnie notatki",
		pinned: "Przypięte",
		deleteFile: "Usuń plik",
		areYouSureDelete: 'Czy na pewno chcesz usunąć "{filename}"?',
		delete: "Usuń",
		cancel: "Anuluj",
		open: "Otwórz",
		openInNewTab: "Otwórz w nowej karcie",
		moveToPrevious: "Przejdź do poprzedniej notatki",
		moveToNext: "Przejdź do następnej notatki",
		today: "Dzisiaj",
		yesterday: "Wczoraj",
		previous7days: "Poprzednie 7 dni",
		previous30days: "Poprzednie 30 dni",
		daysago: "dni temu"
	},
	es: {
		recentNotes: "Notas recientes",
		pinned: "Fijadas",
		deleteFile: "Eliminar archivo",
		areYouSureDelete: '¿Estás seguro de que quieres eliminar "{filename}"?',
		delete: "Eliminar",
		cancel: "Cancelar",
		open: "Abrir",
		openInNewTab: "Abrir en nueva pestaña",
		moveToPrevious: "Ir a la nota anterior",
		moveToNext: "Ir a la siguiente nota",
		today: "Hoy",
		yesterday: "Ayer",
		previous7days: "Últimos 7 días",
		previous30days: "Últimos 30 días",
		daysago: "días atrás"
	},
	fr: {
		recentNotes: "Notes récentes",
		pinned: "Épinglées",
		deleteFile: "Supprimer le fichier",
		areYouSureDelete: 'Êtes-vous sûr de vouloir supprimer "{filename}" ?',
		delete: "Supprimer",
		cancel: "Annuler",
		open: "Ouvrir",
		openInNewTab: "Ouvrir dans un nouvel onglet",
		moveToPrevious: "Aller à la note précédente",
		moveToNext: "Aller à la note suivante",
		today: "Aujourd'hui",
		yesterday: "Hier",
		previous7days: "7 derniers jours",
		previous30days: "30 derniers jours",
		daysago: "jours"
	},
	de: {
		recentNotes: "Aktuelle Notizen",
		pinned: "Angeheftet",
		deleteFile: "Datei löschen",
		areYouSureDelete: 'Möchten Sie "{filename}" wirklich löschen?',
		delete: "Löschen",
		cancel: "Abbrechen",
		open: "Öffnen",
		openInNewTab: "In neuem Tab öffnen",
		moveToPrevious: "Zur vorherigen Notiz",
		moveToNext: "Zur nächsten Notiz",
		today: "Heute",
		yesterday: "Gestern",
		previous7days: "Letzte 7 Tage",
		previous30days: "Letzte 30 Tage",
		daysago: "Tage her"
	},
	it: {
		recentNotes: "Note recenti",
		pinned: "Appuntate",
		deleteFile: "Elimina file",
		areYouSureDelete: 'Sei sicuro di voler eliminare "{filename}"?',
		delete: "Elimina",
		cancel: "Annulla",
		open: "Apri",
		openInNewTab: "Apri in nuova scheda",
		moveToPrevious: "Vai alla nota precedente",
		moveToNext: "Vai alla nota successiva",
		today: "Oggi",
		yesterday: "Ieri",
		previous7days: "Ultimi 7 giorni",
		previous30days: "Ultimi 30 giorni",
		daysago: "giorni fa"
	},
	ja: {
		recentNotes: "最近のノート",
		pinned: "固定済み",
		deleteFile: "ファイルを削除",
		areYouSureDelete: '"{filename}"を削除してもよろしいですか？',
		delete: "削除",
		cancel: "キャンセル",
		open: "開く",
		openInNewTab: "新しいタブで開く",
		moveToPrevious: "前のノートへ",
		moveToNext: "次のノートへ",
		today: "今日",
		yesterday: "昨日",
		previous7days: "過去7日間",
		previous30days: "過去30日間",
		daysago: "日前"
	},
	ko: {
		recentNotes: "최근 노트",
		pinned: "고정됨",
		deleteFile: "파일 삭제",
		areYouSureDelete: '"{filename}"을(를) 삭제하시겠습니까?',
		delete: "삭제",
		cancel: "취소",
		open: "열기",
		openInNewTab: "새 탭에서 열기",
		moveToPrevious: "이전 노트로",
		moveToNext: "다음 노트로",
		today: "오늘",
		yesterday: "어제",
		previous7days: "지난 7일",
		previous30days: "지난 30일",
		daysago: "일 전"
	},
	zh: {
		recentNotes: "最近笔记",
		pinned: "已置顶",
		deleteFile: "删除文件",
		areYouSureDelete: '确定要删除"{filename}"吗？',
		delete: "删除",
		cancel: "取消",
		open: "打开",
		openInNewTab: "在新标签页中打开",
		moveToPrevious: "移至上一个笔记",
		moveToNext: "移至下一个笔记",
		today: "今天",
		yesterday: "昨天",
		previous7days: "最近7天",
		previous30days: "最近30天",
		daysago: "天前"
	},
	ru: {
		recentNotes: "Недавние заметки",
		pinned: "Закреплённые",
		deleteFile: "Удалить файл",
		areYouSureDelete: 'Вы уверены, что хотите удалить "{filename}"?',
		delete: "Удалить",
		cancel: "Отмена",
		open: "Открыть",
		openInNewTab: "Открыть в новой вкладке",
		moveToPrevious: "К предыдущей заметке",
		moveToNext: "К следующей заметке",
		today: "Сегодня",
		yesterday: "Вчера",
		previous7days: "Последние 7 дней",
		previous30days: "Последние 30 дней",
		daysago: "дней назад"
	},
	pt: {
		recentNotes: "Notas recentes",
		pinned: "Fixadas",
		deleteFile: "Eliminar ficheiro",
		areYouSureDelete: 'Tem a certeza que pretende eliminar "{filename}"?',
		delete: "Eliminar",
		cancel: "Cancelar",
		open: "Abrir",
		openInNewTab: "Abrir em novo separador",
		moveToPrevious: "Ir para a nota anterior",
		moveToNext: "Ir para a próxima nota",
		today: "Hoje",
		yesterday: "Ontem",
		previous7days: "Últimos 7 dias",
		previous30days: "Últimos 30 dias",
		daysago: "dias atrás"
	},
	"pt-br": {
		recentNotes: "Notas recentes",
		pinned: "Fixadas",
		deleteFile: "Excluir arquivo",
		areYouSureDelete: 'Tem certeza que deseja excluir "{filename}"?',
		delete: "Excluir",
		cancel: "Cancelar",
		open: "Abrir",
		openInNewTab: "Abrir em nova aba",
		moveToPrevious: "Ir para nota anterior",
		moveToNext: "Ir para próxima nota",
		today: "Hoje",
		yesterday: "Ontem",
		previous7days: "Últimos 7 dias",
		previous30days: "Últimos 30 dias",
		daysago: "dias atrás"
	},
	hu: {
		recentNotes: "Legutóbbi jegyzetek",
		pinned: "Kitűzve",
		deleteFile: "Fájl törlése",
		areYouSureDelete: 'Biztos, hogy törölni akarod ezt: "{filename}"?',
		delete: "Törlés",
		cancel: "Mégsem",
		open: "Megnyitás",
		openInNewTab: "Megnyitás új lapon",
		moveToPrevious: "Ugrás az előző jegyzetre",
		moveToNext: "Ugrás az következő jegyzetre",
		today: "Ma",
		yesterday: "Tegnap",
		previous7days: "Utolsó 7 nap",
		previous30days: "Utolsó 30 nap",
		daysago: "napja"
	}
};

// Helper functions to get current locale and translate keys
const getObsidianLanguage = (): string => {
	return localStorage.getItem('language')?.toLowerCase() || 'en';
};

function getLocale(app: App): string {
	return getObsidianLanguage();
}

function translateGlobal(app: App, key: string): string {
	const lang = getLocale(app);
	if (LOCALES[lang] && LOCALES[lang][key]) {
		return LOCALES[lang][key];
	}
	return LOCALES['en'][key];
}

const VIEW_TYPE_RECENT_NOTES = "recent-notes-view";

class RecentNotesView extends ItemView {
	plugin: RecentNotesPlugin;
	private refreshTimeout: NodeJS.Timeout | null = null;
	private lastActiveFile: string | null = null;
	private firstLineCache: Map<string, { line: string, timestamp: number }> = new Map();
	private readonly MAX_FILE_SIZE_FOR_PREVIEW = 100 * 1024; // 100 KB
	private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
	private lastEditedFile: string | null = null;
	private currentFileIndex: number = -1;

	constructor(leaf: WorkspaceLeaf, plugin: RecentNotesPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.containerEl.addClass('recent-notes-view');
	}

	public moveToAdjacentNote(direction: 'up' | 'down'): void {
		const files = this.getRecentFiles();
		if (files.length === 0) return;

		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			// If no file is active, select the first or last file depending on direction
			const targetFile = direction === 'up' ? files[files.length - 1] : files[0];
			this.openFile(targetFile);
			return;
		}

		// Find current file index
		const currentIndex = files.findIndex(f => f.path === activeFile.path);
		if (currentIndex === -1) {
			// Current file not in list, select first or last file
			const targetFile = direction === 'up' ? files[files.length - 1] : files[0];
			this.openFile(targetFile);
			return;
		}

		// Calculate next index
		let nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
		
		// Handle wrapping - only wrap when going down
		if (nextIndex < 0) {
			// When going up and at the first note, do nothing
			return;
		} else if (nextIndex >= files.length) {
			nextIndex = 0;
		}

		this.openFile(files[nextIndex]);
	}

	private static fileModifiedTimes = new Map<TFile, number>(); // UNIX timestamp, in milliseconds

	private getModifiedTime(file:TFile, shouldRenew:boolean=false): number {
		if (!shouldRenew && RecentNotesView.fileModifiedTimes.has(file)) {
			const time = RecentNotesView.fileModifiedTimes.get(file);
			return time !== undefined ? time : file.stat.mtime;
		}
		RecentNotesView.fileModifiedTimes.set(file, file.stat.mtime);

		if (this.plugin.settings.propertyModified) {
			const abstractFile = this.app.vault.getAbstractFileByPath(file.path);
			if (abstractFile instanceof TFile) {
				const fileMetadata = this.app.metadataCache.getFileCache(abstractFile);
				if (fileMetadata && fileMetadata.frontmatter) {
					const fileDateProperty = new Date(fileMetadata.frontmatter[this.plugin.settings.propertyModified]).getTime();
					if (fileDateProperty) {
						RecentNotesView.fileModifiedTimes.set(file, fileDateProperty);
					}
				}
			}
		}
		const time = RecentNotesView.fileModifiedTimes.get(file);
		return time !== undefined ? time : file.stat.mtime;
	}

	private getRecentFiles(): TFile[] {
		const files = this.app.vault.getFiles()
			.filter(file => this.shouldRefreshForFile(file));

		// Get all pinned files that still exist regardless of modification time
		const pinnedFiles = files
			.filter(file => this.plugin.settings.pinnedNotes.includes(file.path))
			.sort((a, b) => this.getModifiedTime(b,true) - this.getModifiedTime(a,true));

		// Get unpinned files sorted by modified time
		const unpinnedFiles = files
			.filter(file => !this.plugin.settings.pinnedNotes.includes(file.path))
			.sort((a, b) => this.getModifiedTime(b,true) - this.getModifiedTime(a,true))
			// Only limit the number of unpinned files to show
			.slice(0, this.plugin.settings.maxNotesToShow - pinnedFiles.length);

		// Combine pinned and unpinned files - pinned notes are always included
		return [...pinnedFiles, ...unpinnedFiles];
	}

	private async openFile(file: TFile): Promise<void> {
		const leaf = this.app.workspace.getMostRecentLeaf();
		if (leaf) {
			await leaf.openFile(file);
		}
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
		// Removed the lastActiveFile check to ensure the active file is not filtered out
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

		// Check if file has excluded tags
		if (this.plugin.settings.excludedTags.length > 0) {
			const fileCache = this.app.metadataCache.getFileCache(file);
			if (fileCache) {
				const fileTags = getAllTags(fileCache);
				if (fileTags && fileTags.length > 0) {
					const normalizedExcludedTags = this.plugin.settings.excludedTags
						.map(tag => tag.trim())
						.filter(tag => tag.length > 0)
						.map(tag => tag.toLowerCase());
					const hasExcludedTag = fileTags.some(fileTag => {
						const normalizedFileTag = fileTag.toLowerCase();
						return normalizedExcludedTags.includes(normalizedFileTag);
					});
					if (hasExcludedTag) return false;
				}
			}
		}

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

	public clearCache(): void {
		this.firstLineCache.clear();
	}

	getViewType(): string {
		return VIEW_TYPE_RECENT_NOTES;
	}

	getDisplayText(): string {
		return this.plugin.translate("recentNotes");
	}

	public getIcon(): string {
		return 'clock-10';
	}

	private cleanMarkdownFormatting(text: string): string {
		// Remove headers (#, ##, etc.)
		text = text.replace(/^#+\s+/g, '');
		
		// Remove bold/italic markers
		text = text.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1');
		
		// Remove strikethrough
		text = text.replace(/~~([^~]+)~~/g, '$1');
		
		// Remove horizontal rules
		text = text.replace(/^[-*_]{3,}\s*$/g, '');
		
		// Remove link formatting but keep text
		text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
		
		// Remove all backticks (including standalone)
		text = text.replace(/`+/g, '');
		
		// Remove blockquotes
		text = text.replace(/^>\s+/g, '');
		
		// Remove task list markers
		text = text.replace(/^- \[[x ]\]\s+/i, '');
		
		// Remove list markers
		text = text.replace(/^[-*+]\s+/g, '');
		text = text.replace(/^\d+\.\s+/g, '');

		// Remove URLs and web addresses
		text = text.replace(/https?:\/\//g, '');
		text = text.replace(/www\./g, '');
		
		return text.trim();
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
				if (line && line !== '---') {
					const cleanedLine = this.cleanMarkdownFormatting(line);
					if (cleanedLine) {
						previewLines.push(cleanedLine);
					}
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
		if (date.isSame(now, 'day')) return this.plugin.translate('today');
		if (date.isSame(now.clone().subtract(1, 'day'), 'day')) return this.plugin.translate('yesterday');
		if (date.isAfter(now.clone().subtract(7, 'days'))) return this.plugin.translate('previous7days');
		if (date.isAfter(now.clone().subtract(30, 'days'))) return this.plugin.translate('previous30days');
		
		// For dates in current year, show month name with the first letter uppercase
		if (date.isSame(now, 'year')) {
			let monthName = date.format('MMMM');
			return monthName.charAt(0).toUpperCase() + monthName.slice(1);
		}
		return date.format('YYYY');
	}

	private scrollToTodaySection() {
		const container = this.containerEl.children[1];
		const sections = Array.from(container.querySelectorAll('h6'));
		for (const section of sections) {
			if (section.textContent === 'Today') {
				// Only scroll if current scroll position is more than 1700px
				if (container.scrollTop > 300) {
					section.scrollIntoView({ behavior: 'smooth', block: 'start' });
				}
				break;
			}
		}
	}

	async refreshView() {
		const container = this.containerEl.children[1];
		const scrollTop = container.scrollTop;
		container.empty();
		
		// Apply density setting to body
		document.body.setAttribute('data-recent-notes-density', this.plugin.settings.density);
		
		// Get all files that match our filter criteria
		const allMatchingFiles = this.app.vault.getFiles()
			.filter(file => this.shouldRefreshForFile(file));
		
		// Get all pinned files that still exist
		const pinnedFiles = allMatchingFiles
			.filter(file => this.plugin.settings.pinnedNotes.includes(file.path))
			.sort((a, b) => this.getModifiedTime(b,true) - this.getModifiedTime(a,true));
		
		// Get unpinned files
		const unpinnedFiles = allMatchingFiles
			.filter(file => !this.plugin.settings.pinnedNotes.includes(file.path))
			.sort((a, b) => this.getModifiedTime(b,true) - this.getModifiedTime(a,true))
			.slice(0, this.plugin.settings.maxNotesToShow - pinnedFiles.length);
		
		// Combine for UI reference
		const files = [...pinnedFiles, ...unpinnedFiles];

		let currentSection = '';
		const activeFile = this.app.workspace.getActiveFile();
		const wasEditedFileMovedToTop = this.lastEditedFile && files[0]?.path === this.lastEditedFile;
		const isTopFilePinned = files[0] && this.plugin.settings.pinnedNotes.includes(files[0].path);
		if (activeFile) {
			this.lastActiveFile = activeFile.path;
		}
		const activeFilePath = activeFile ? activeFile.path : this.lastActiveFile;

		// Show pinned files first if any exist
		if (pinnedFiles.length > 0) {
			const pinnedHeader = container.createEl('h6');
			const iconSpan = pinnedHeader.createSpan({ cls: 'pin-icon-small' });
			setIcon(iconSpan, 'pin');
			pinnedHeader.createSpan({ text: this.plugin.translate('pinned') });
			
			for (const file of pinnedFiles) {
				const fileContainer = container.createEl('div', { 
					cls: `recent-note-item ${activeFilePath === file.path ? 'is-active' : ''}`
				});

				// Get date text first
				const now = moment();
				let dateText;
				if (moment(this.getModifiedTime(file,true)).isSame(now, 'day') || moment(this.getModifiedTime(file,true)).isSame(now.clone().subtract(1, 'day'), 'day')) {
					dateText = moment(this.getModifiedTime(file)).format('HH:mm');
				} else if (moment(this.getModifiedTime(file)).isAfter(now.clone().subtract(7, 'days'))) {
					if (this.plugin.settings.dateFormat === 'RELATIVE') {
						const daysAgo = now.diff(moment(this.getModifiedTime(file)), 'days');
						dateText = daysAgo === 0 ? this.plugin.translate('today') : 
							   daysAgo === 1 ? this.plugin.translate('yesterday') : 
							   `${daysAgo} ${this.plugin.translate('daysago')}`;
					} else {
						dateText = moment(this.getModifiedTime(file)).format('dddd');
					}
				} else {
					if (this.plugin.settings.dateFormat === 'RELATIVE') {
						const daysAgo = now.diff(moment(this.getModifiedTime(file)), 'days');
						dateText = `${daysAgo} ${this.plugin.translate('daysago')}`;
					} else {
						dateText = moment(this.getModifiedTime(file)).format(this.plugin.settings.dateFormat);
					}
				}

				// Handle compact mode differently
				if (this.plugin.settings.density === 'compact' && this.plugin.settings.showTime) {
					// Create a header container for title and date
					const headerContainer = fileContainer.createEl('div', {
						cls: 'recent-note-header'
					});
					
					// Add title to the header
					headerContainer.createEl('div', { 
						text: this.getFileDisplayName(file),
						cls: 'recent-note-title'
					});
					
					// Add date to the header
					headerContainer.createEl('span', {
						text: dateText,
						cls: 'recent-note-date'
					});
					
					// Add preview in compact mode if enabled
					if (this.plugin.settings.previewLines > 0) {
						const hasMultipleLines = this.plugin.settings.previewLines > 1;
						const firstLine = await this.getFirstLineOfFile(file);
						const previewContainer = fileContainer.createEl('div', {
							cls: `recent-note-preview ${hasMultipleLines ? 'has-multiple-lines' : ''}`
						});
						
						firstLine.split('\n').forEach(line => {
							previewContainer.createEl('div', {
								text: line,
								cls: 'recent-note-preview-line'
							});
						});
					}
				} else {
					// Original behavior for comfortable mode
					const titleEl = fileContainer.createEl('div', { 
						text: this.getFileDisplayName(file),
						cls: 'recent-note-title'
					});

					const hasMultipleLines = this.plugin.settings.previewLines > 1;
					const infoContainer = fileContainer.createEl('div', { 
						cls: `recent-note-info ${hasMultipleLines ? 'has-multiple-lines' : ''}`
					});
					
					// Only show preview if previewLines > 0
					if (this.plugin.settings.previewLines > 0) {
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
					}

					// Only show date if showTime is enabled
					if (this.plugin.settings.showTime) {
						const dateEl = infoContainer.createEl('span', {
							text: dateText,
							cls: this.plugin.settings.previewLines > 0 && hasMultipleLines ? 'recent-note-date recent-note-date-below' : 'recent-note-date'
						});
					}
				}

				this.addFileItemEventListeners(fileContainer, file);
			}
			currentSection = ''; // Reset section for unpinned files
		}
		
		// Show unpinned files grouped by date
		for (const file of unpinnedFiles) {
			const fileDate = moment(this.getModifiedTime(file,true));
			const section = this.getTimeSection(fileDate);
			
			if (section !== currentSection) {
				currentSection = section;
				container.createEl('h6', { text: section });
			}

			const fileContainer = container.createEl('div', { 
				cls: `recent-note-item ${activeFilePath === file.path ? 'is-active' : ''}`
			});

			// Get date text first
			const now = moment();
			let dateText;
			if (moment(this.getModifiedTime(file,true)).isSame(now, 'day') || moment(this.getModifiedTime(file,true)).isSame(now.clone().subtract(1, 'day'), 'day')) {
				dateText = moment(this.getModifiedTime(file)).format('HH:mm');
			} else if (moment(this.getModifiedTime(file)).isAfter(now.clone().subtract(7, 'days'))) {
				if (this.plugin.settings.dateFormat === 'RELATIVE') {
					const daysAgo = now.diff(moment(this.getModifiedTime(file)), 'days');
					dateText = daysAgo === 0 ? this.plugin.translate('today') : 
						   daysAgo === 1 ? this.plugin.translate('yesterday') : 
						   `${daysAgo} ${this.plugin.translate('daysago')}`;
				} else {
					dateText = moment(this.getModifiedTime(file)).format('dddd');
				}
			} else {
				if (this.plugin.settings.dateFormat === 'RELATIVE') {
					const daysAgo = now.diff(moment(this.getModifiedTime(file)), 'days');
					dateText = `${daysAgo} ${this.plugin.translate('daysago')}`;
				} else {
					dateText = moment(this.getModifiedTime(file)).format(this.plugin.settings.dateFormat);
				}
			}

			// Handle compact mode differently
			if (this.plugin.settings.density === 'compact' && this.plugin.settings.showTime) {
				// Create a header container for title and date
				const headerContainer = fileContainer.createEl('div', {
					cls: 'recent-note-header'
				});
				
				// Add title to the header
				headerContainer.createEl('div', { 
					text: this.getFileDisplayName(file),
					cls: 'recent-note-title'
				});
				
				// Add date to the header
				headerContainer.createEl('span', {
					text: dateText,
					cls: 'recent-note-date'
				});
				
				// Add preview in compact mode if enabled
				if (this.plugin.settings.previewLines > 0) {
					const hasMultipleLines = this.plugin.settings.previewLines > 1;
					const firstLine = await this.getFirstLineOfFile(file);
					const previewContainer = fileContainer.createEl('div', {
						cls: `recent-note-preview ${hasMultipleLines ? 'has-multiple-lines' : ''}`
					});
					
					firstLine.split('\n').forEach(line => {
						previewContainer.createEl('div', {
							text: line,
							cls: 'recent-note-preview-line'
						});
					});
				}
			} else {
				// Original behavior for comfortable mode
				const titleEl = fileContainer.createEl('div', { 
					text: this.getFileDisplayName(file),
					cls: 'recent-note-title'
				});

				const hasMultipleLines = this.plugin.settings.previewLines > 1;
				const infoContainer = fileContainer.createEl('div', { 
					cls: `recent-note-info ${hasMultipleLines ? 'has-multiple-lines' : ''}`
				});
				
				// Only show preview if previewLines > 0
				if (this.plugin.settings.previewLines > 0) {
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
				}

				// Only show date if showTime is enabled
				if (this.plugin.settings.showTime) {
					const dateEl = infoContainer.createEl('span', {
						text: dateText,
						cls: this.plugin.settings.previewLines > 0 && hasMultipleLines ? 'recent-note-date recent-note-date-below' : 'recent-note-date'
					});
				}
			}

			this.addFileItemEventListeners(fileContainer, file);
		}

		// After all files are rendered, handle scrolling
		if (wasEditedFileMovedToTop && !isTopFilePinned) {
			this.scrollToTodaySection();
		} else {
			container.scrollTop = scrollTop;
		}
		// Reset the last edited file after handling the scroll
		this.lastEditedFile = null;
	}

	private addFileItemEventListeners(fileContainer: HTMLElement, file: TFile) {
		// Track touch to differentiate between tap and long press
		let touchStartTime = 0;
		let isTouchDevice = false;
		let lastTapTime = 0;
		let touchStartY = 0;
		let touchStartX = 0;
		let isScrolling = false;
		
		// Create event handlers at the class level so they persist
		const preventClickHandler = (e: Event) => {
			e.preventDefault();
			e.stopPropagation();
		};
		
		const preventContextHandler = (e: Event) => {
			e.preventDefault();
			e.stopPropagation();
		};
		
		// Helper function to block events after file open
		const blockEventsTemporarily = () => {
			// Remove any existing handlers first
			window.removeEventListener('click', preventClickHandler, true);
			window.removeEventListener('contextmenu', preventContextHandler, true);
			
			// Add the handlers
			window.addEventListener('click', preventClickHandler, true);
			window.addEventListener('contextmenu', preventContextHandler, true);
			
			// Set timeout to remove them after 1 second
			setTimeout(() => {
				window.removeEventListener('click', preventClickHandler, true);
				window.removeEventListener('contextmenu', preventContextHandler, true);
			}, 1000);
		};
		
		// Touch start handler for mobile devices
		fileContainer.addEventListener('touchstart', (event: TouchEvent) => {
			// Don't do anything if we recently opened a file
			if (Date.now() - lastTapTime < 1000) {
				return;
			}
			
			isTouchDevice = true;
			touchStartTime = Date.now();
			
			// Store initial touch position to detect scrolling
			if (event.touches.length > 0) {
				touchStartY = event.touches[0].clientY;
				touchStartX = event.touches[0].clientX;
			}
			
			isScrolling = false;
		});
		
		// Track touch move to detect scrolling
		fileContainer.addEventListener('touchmove', (event: TouchEvent) => {
			// If it's a scroll gesture, mark it as scrolling
			if (event.touches.length > 0) {
				const yDiff = Math.abs(event.touches[0].clientY - touchStartY);
				const xDiff = Math.abs(event.touches[0].clientX - touchStartX);
				
				// If the user has moved more than 10px, it's probably a scroll
				if (yDiff > 10 || xDiff > 10) {
					isScrolling = true;
				}
			}
		});
		
		// Touch end handler for mobile devices
		fileContainer.addEventListener('touchend', async (event: TouchEvent) => {
			// Don't do anything if we recently opened a file
			if (Date.now() - lastTapTime < 1000) {
				return;
			}
			
			// Don't interfere if this was a scrolling gesture
			if (isScrolling) {
				return;
			}
			
			const touchDuration = Date.now() - touchStartTime;
			
			// Only handle as a tap if touch was quick (less than 500ms)
			if (touchDuration < 500) {
				event.preventDefault();
				event.stopPropagation();
				
				const leaf = this.app.workspace.getLeaf(false);
				await leaf.openFile(file);
				lastTapTime = Date.now(); // Record when we opened the file
				
				if (file.extension !== 'md') {
					setTimeout(() => {
						this.debouncedRefresh();
					}, 50);
				}
				
				// Block all clicks and context menus temporarily
				blockEventsTemporarily();
			} else {
				// This was a long press, show context menu
				event.preventDefault();
				event.stopPropagation();
				
				const touch = event.changedTouches[0];
				const menu = new Menu();
				
				// Add open in new tab option
				menu.addItem((item) => {
					item
						.setIcon('open-elsewhere-glyph')
						.setTitle(this.plugin.translate('openInNewTab'))
						.onClick(async () => {
							const leaf = this.app.workspace.getLeaf(true);
							await leaf.openFile(file);
							
							// Block all clicks and context menus temporarily after opening
							blockEventsTemporarily();
						});
				});
				
				// Add pin/unpin option
				const isPinned = this.plugin.settings.pinnedNotes.includes(file.path);
				menu.addItem((item) => {
					item
						.setIcon(isPinned ? 'pin-off' : 'pin')
						.setTitle(isPinned ? 'Unpin' : 'Pin')
						.onClick(async () => {
							if (isPinned) {
								this.plugin.settings.pinnedNotes = this.plugin.settings.pinnedNotes.filter(path => path !== file.path);
							} else {
								this.plugin.settings.pinnedNotes.push(file.path);
							}
							await this.plugin.saveSettings();
							this.refreshView();
						});
				});
				
				// Add delete option
				menu.addItem((item) => {
					item
						.setIcon('trash')
						.setTitle('Delete')
						.onClick(async () => {
							const exists = await this.app.vault.adapter.exists(file.path);
							if (!exists) return;
							
							const modal = new DeleteModal(this.app, file.path, async () => {
								await this.app.fileManager.trashFile(file);
								this.refreshView();
							});
							modal.open();
						});
				});
				
				menu.addSeparator();
				
				// Show standard file menu
				this.app.workspace.trigger('file-menu', menu, file, 'recent-notes-view', null);
				menu.showAtPosition({ x: touch.clientX, y: touch.clientY });
			}
		});

		// Add mousedown for desktop devices
		fileContainer.addEventListener('mousedown', async (event: MouseEvent) => {
			// Skip on touch devices - we'll handle with touch events
			if (isTouchDevice) return;
			
			// Handle left click (button 0) and middle click (button 1)
			if (event.button !== 0 && event.button !== 1) return;
			event.preventDefault();
			event.stopPropagation();

			// Middle mouse button click or Ctrl/Meta key pressed to open in new tab
			const openInNewTab = event.button === 1 || event.metaKey || event.ctrlKey;
			const leaf = this.app.workspace.getLeaf(openInNewTab);
			await leaf.openFile(file);
			
			if (file.extension !== 'md') {
				setTimeout(() => {
					this.debouncedRefresh();
				}, 50);
			}
		});

		// Add hover preview functionality
		fileContainer.addEventListener('mouseover', (event: MouseEvent) => {
			if (!file?.path) return;

			this.app.workspace.trigger('hover-link', {
				event,
				source: VIEW_TYPE_RECENT_NOTES,
				hoverParent: this.containerEl,
				targetEl: fileContainer,
				linktext: file.path,
			});
		});

		fileContainer.addEventListener('contextmenu', (event: MouseEvent) => {
			// On touch devices, we'll only show context menu on long press,
			// which is handled by the touchend event checking the duration
			if (isTouchDevice || (Date.now() - lastTapTime < 1000)) {
				// Don't prevent default on scrolling - let the browser handle it
				if (!isScrolling) {
					event.preventDefault();
					event.stopPropagation();
				}
				return;
			}
			
			event.preventDefault();
			const menu = new Menu();

			// Add open in new tab option
			menu.addItem((item) => {
				item
					.setIcon('open-elsewhere-glyph')
					.setTitle(this.plugin.translate('openInNewTab'))
					.onClick(async () => {
						const leaf = this.app.workspace.getLeaf(true);
						await leaf.openFile(file);
						
						// Block all clicks and context menus temporarily after opening
						blockEventsTemporarily();
					});
			});

			// Add pin/unpin option
			const isPinned = this.plugin.settings.pinnedNotes.includes(file.path);
			menu.addItem((item) => {
				item
					.setIcon(isPinned ? 'pin-off' : 'pin')
					.setTitle(isPinned ? 'Unpin' : 'Pin')
					.onClick(async () => {
						if (isPinned) {
							this.plugin.settings.pinnedNotes = this.plugin.settings.pinnedNotes.filter(path => path !== file.path);
						} else {
							this.plugin.settings.pinnedNotes.push(file.path);
						}
						await this.plugin.saveSettings();
						this.refreshView();
					});
			});

			// Add delete option
			menu.addItem((item) => {
				item
					.setIcon('trash')
					.setTitle('Delete')
					.onClick(async () => {
						const exists = await this.app.vault.adapter.exists(file.path);
						if (!exists) return;
						
						const modal = new DeleteModal(this.app, file.path, async () => {
							await this.app.fileManager.trashFile(file);
							this.refreshView();
						});
						modal.open();
					});
			});

			menu.addSeparator();

			// Show standard file menu
			this.app.workspace.trigger('file-menu', menu, file, 'recent-notes-view', null);
			menu.showAtPosition({ x: event.clientX, y: event.clientY });
		});
	}

	async onOpen() {
		// Clear old cache entries periodically
		this.registerInterval(window.setInterval(() => this.clearOldCache(), this.CACHE_DURATION));
		
		// Apply density setting to body
		document.body.setAttribute('data-recent-notes-density', this.plugin.settings.density);
		
		await this.refreshView();
		
		// Register all events with the debounced refresh
		this.registerEvent(
			this.app.vault.on('modify', (file) => {
				if (file instanceof TFile) {
					// Clear the cache for the modified file
					this.firstLineCache.delete(file.path);
					// Track the last edited file
					this.lastEditedFile = file.path;
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
		
		// Remove density setting from body when view is closed
		document.body.removeAttribute('data-recent-notes-density');
	}

	private getFileDisplayName(file: TFile): string {
		// For non-markdown files, just return the basename
		if (file.extension !== 'md') {
			return file.basename;
		}
		
		// For markdown files, check if there's a title in frontmatter
		const fileMetadata = this.app.metadataCache.getFileCache(file);
		if (fileMetadata && fileMetadata.frontmatter && fileMetadata.frontmatter.title) {
			return fileMetadata.frontmatter.title;
		}
		
		// Default to basename if no title in frontmatter
		return file.basename;
	}
}

class DeleteModal extends Modal {
	constructor(
		app: App,
		private readonly filename: string,
		private readonly onConfirm: () => void
	) {
		super(app);
	}

	onOpen() {
		const { contentEl, titleEl } = this;
		titleEl.setText(translateGlobal(this.app, 'deleteFile'));
		contentEl
			.createEl("p")
			.setText(translateGlobal(this.app, 'areYouSureDelete').replace('{filename}', this.filename));
		const div = contentEl.createDiv({ cls: "modal-button-container" });

		const deleteButton = div.createEl("button", {
			cls: "mod-warning",
			text: translateGlobal(this.app, 'delete'),
		});
		deleteButton.addEventListener("click", () => {
			this.onConfirm();
			this.close();
		});

		const cancelButton = div.createEl("button", {
			text: translateGlobal(this.app, 'cancel'),
		});
		cancelButton.addEventListener("click", () => {
			this.close();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
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

		// Trigger Style Settings plugin to parse our settings
		this.app.workspace.trigger('parse-style-settings');

		this.addRibbonIcon('clock-10', this.translate('recentNotes'), () => {
			this.activateView();
		});

		this.addCommand({
			id: 'show-recent-notes',
			name: this.translate('open'),
			callback: () => {
				this.activateView();
			},
		});

		this.addCommand({
			id: 'move-to-previous-recent-note',
			name: this.translate('moveToPrevious'),
			callback: () => {
				if (this.view) {
					this.view.moveToAdjacentNote('up');
				}
			},
		});

		this.addCommand({
			id: 'move-to-next-recent-note',
			name: this.translate('moveToNext'),
			callback: () => {
				if (this.view) {
					this.view.moveToAdjacentNote('down');
				}
			},
		});

		this.addSettingTab(new RecentNotesSettingTab(this.app, this));
	}

	async activateView() {
		const { workspace } = this.app;
		
		let leaf: WorkspaceLeaf | null = workspace.getLeavesOfType(VIEW_TYPE_RECENT_NOTES)[0];
		
		if (!leaf) {
			leaf = workspace.getLeftLeaf(false);
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

	// New translate method using the global translate function
	translate(key: string): string {
		return translateGlobal(this.app, key);
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
			.setName('Date format')
			.setDesc('Format for displaying dates older than 7 days')
			.addDropdown(dropdown => dropdown
				.addOption('RELATIVE', 'X days ago (relative)')
				.addOption('DD/MM/YYYY', '19/08/2025')
				.addOption('M/D/YY', '8/19/25')
				.addOption('D/M/YY', '19/8/25')
				.addOption('M/D/YYYY', '8/19/2025')
				.addOption('DD.MM.YYYY', '19.08.2025')
				.addOption('DD-MM-YYYY', '19-08-2025')
				.addOption('YYYY/M/D', '2025/8/19')
				.addOption('YYYY.MM.DD', '2025.08.19')
				.addOption('YYYY-MM-DD', '2025-08-19')
				.setValue(this.plugin.settings.dateFormat)
				.onChange(async (value) => {
					this.plugin.settings.dateFormat = value;
					await this.plugin.saveSettings();
					if (this.plugin.view) {
						await this.plugin.view.refreshView();
					}
				}));

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
			.setDesc('Number of text lines to show in the preview (0-3)')
			.addDropdown(dropdown => dropdown
				.addOption('0', 'No preview')
				.addOption('1', '1 line')
				.addOption('2', '2 lines')
				.addOption('3', '3 lines')
				.setValue(this.plugin.settings.previewLines.toString())
				.onChange(async (value) => {
					this.plugin.settings.previewLines = parseInt(value);
					await this.plugin.saveSettings();
					// Clear the entire cache when changing preview lines
					if (this.plugin.view) {
						this.plugin.view.clearCache();
						await this.plugin.view.refreshView();
					}
				}));

		new Setting(containerEl)
			.setName('Show time')
			.setDesc('Show modification time next to files (set both this and Preview lines to 0 for minimal view)')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showTime)
				.onChange(async (value) => {
					this.plugin.settings.showTime = value;
					await this.plugin.saveSettings();
					if (this.plugin.view) {
						await this.plugin.view.refreshView();
					}
				}));

		new Setting(containerEl)
			.setName(this.plugin.translate('density'))
			.setDesc(this.plugin.translate('densityDesc'))
			.addDropdown(dropdown => dropdown
				.addOption('comfortable', this.plugin.translate('comfortable'))
				.addOption('compact', this.plugin.translate('compact'))
				.setValue(this.plugin.settings.density)
				.onChange(async (value) => {
					this.plugin.settings.density = value;
					await this.plugin.saveSettings();
					if (this.plugin.view) {
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

		new Setting(containerEl)
			.setName('Excluded tags')
			.setDesc('List of tags to exclude from recent files (one per line)')
			.addTextArea(text => text
				.setPlaceholder('#archive\n#private')
				.setValue(this.plugin.settings.excludedTags.join('\n'))
				.onChange(async (value) => {
					const tags = value.split('\n')
						.map(tag => tag.trim())
						.filter(tag => tag.length > 0);
					this.plugin.settings.excludedTags = tags;
					await this.plugin.saveSettings();
					if (this.plugin.view) {
						await this.plugin.view.refreshView();
					}
				}));

		new Setting(containerEl)
			.setName('Custom Modified Date property')
			.setDesc('Specify a frontmatter property to use for modification date (leave empty to use file modification date)')
			.addText(text => text
				.setPlaceholder('modified')
				.setValue(this.plugin.settings.propertyModified.toString())
				.onChange(async (value) => {
					this.plugin.settings.propertyModified = value;
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
