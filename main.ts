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
	showBaseFiles: boolean;
	excludedFolders: string[];
	excludedFiles: string[];
	excludedTags: string[];
	previewLines: number;
	showTime: boolean;
	showFolderName: boolean;
	pinnedNotes: string[];
	dateFormat: string;
	propertyModified: string;
	density: string;
	openInNewTab: string;
	showThumbnail: boolean;
	thumbnailProperty: string;
	thumbnailPosition: 'left' | 'right';
	pageStepSize: number;
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
	showBaseFiles: true,
	excludedFolders: [],
	excludedFiles: [],
	excludedTags: [],
	previewLines: 1,
	showTime: true,
	showFolderName: false,
	pinnedNotes: [],
	dateFormat: 'DD/MM/YYYY',
	propertyModified: '',
	density: 'comfortable',
	openInNewTab: 'new',
	showThumbnail: true,
	thumbnailProperty: 'image',
	thumbnailPosition: 'right',
	pageStepSize: 10
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
		moveToPreviousPage: "Move to previous page",
		moveToNextPage: "Move to next page",
		moveToStart: "Move to start",
		
		today: "Today",
		yesterday: "Yesterday",
		previous7days: "Previous 7 days",
		previous30days: "Previous 30 days",
		daysago: "days ago",
		density: "Density",
		comfortable: "Comfortable",
		compact: "Compact",
		densityDesc: "Choose between comfortable (default) or compact display",
		showThumbnail: "Show thumbnail",
		showThumbnailDesc: "Show the first image from the note as a thumbnail",
		thumbnailProperty: "Thumbnail property",
		thumbnailPropertyDesc: "Property name to use for the thumbnail image",
		thumbnailPosition: "Thumbnail position",
		thumbnailPositionDesc: "Choose whether the thumbnail should be on the left or right",
		left: "Left",
		right: "Right",
		thumbnails: "Thumbnails",
		pageStepSize: "Page step size",
		pageStepSizeDesc: "Number of notes to skip when using Ctrl+PageUp/PageDown",
		dateFormat: "Date format",
		dateFormatDesc: "Format for displaying dates older than 7 days",
		maxNotesToShow: "Maximum notes to show",
		maxNotesToShowDesc: "How many recent notes to display in the view",
		previewLines: "Preview lines",
		previewLinesDesc: "Number of text lines to show in the preview (0-3)",
		noPreview: "No preview",
		line: "line",
		lines: "lines",
		showTime: "Show time",
		showTimeDesc: "Show modification time next to files",
		excludedFolders: "Excluded folders",
		excludedFoldersDesc: "Folders to exclude (one per line)",
		excludedFiles: "Excluded files",
		excludedFilesDesc: "Files to exclude (one per line)",
		excludedTags: "Excluded tags",
		excludedTagsDesc: "Tags to exclude (one per line)",
		customProperty: "Custom Modified Date property",
		customPropertyDesc: "Frontmatter property for modification date",
		fileTypes: "File types to show",
		showMarkdown: "Show Markdown files",
		showImages: "Show Image files",
		showPDF: "Show PDF files",
		showAudio: "Show Audio files",
		showVideo: "Show Video files",
		showCanvas: "Show Canvas files",
		showCSV: "Show CSV files",
		showBase: "Show Base files"
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
		moveToPreviousPage: "Przejdź do poprzedniej strony",
		moveToNextPage: "Przejdź do następnej strony",
		moveToStart: "Przejdź do początku",
		
		today: "Dzisiaj",
		yesterday: "Wczoraj",
		previous7days: "Poprzednie 7 dni",
		previous30days: "Poprzednie 30 dni",
		daysago: "dni temu",
		density: "Zagęszczenie",
		comfortable: "Wygodny",
		compact: "Kompaktowy",
		densityDesc: "Wybierz między wygodnym (domyślnym) a kompaktowym wyświetlaniem",
		showThumbnail: "Pokaż miniaturkę",
		showThumbnailDesc: "Pokaż pierwszy obraz z notatki jako miniaturkę",
		thumbnailProperty: "Właściwość miniaturki",
		thumbnailPropertyDesc: "Nazwa właściwości używanej do obrazu miniaturki",
		thumbnailPosition: "Pozycja miniaturki",
		thumbnailPositionDesc: "Wybierz, czy miniaturka ma być po lewej, czy po prawej stronie",
		left: "Lewo",
		right: "Prawo",
		thumbnails: "Miniaturki",
		pageStepSize: "Rozmiar kroku strony",
		pageStepSizeDesc: "Liczba notatek do pominięcia przy użyciu Ctrl+PageUp/PageDown"
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
		moveToPreviousPage: "Ir a la página anterior",
		moveToNextPage: "Ir a la página siguiente",
		moveToStart: "Ir al principio",
		
		today: "Hoy",
		yesterday: "Ayer",
		previous7days: "Últimos 7 días",
		previous30days: "Últimos 30 días",
		daysago: "días atrás",
		density: "Densidad",
		comfortable: "Cómodo",
		compact: "Compacto",
		densityDesc: "Elige entre visualización cómoda (predeterminada) o compacta",
		showThumbnail: "Mostrar miniatura",
		showThumbnailDesc: "Muestra la primera imagen de la nota como miniatura",
		thumbnailProperty: "Propiedad de miniatura",
		thumbnailPropertyDesc: "Nombre de la propiedad a utilizar para la imagen de miniatura",
		thumbnailPosition: "Posición de la miniatura",
		thumbnailPositionDesc: "Elige si la miniatura debe estar a la izquierda o a la derecha",
		left: "Izquierda",
		right: "Derecha",
		thumbnails: "Miniaturas",
		pageStepSize: "Tamaño del paso de página",
		pageStepSizeDesc: "Número de notas a saltar al usar Ctrl+RePág/AvPág",
		dateFormat: "Formato de fecha",
		maxNotesToShow: "Máximo de notas a mostrar",
		previewLines: "Líneas de vista previa",
		showTime: "Mostrar hora",
		excludedFolders: "Carpetas excluidas",
		fileTypes: "Tipos de archivo a mostrar"
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
		moveToPreviousPage: "Aller à la page précédente",
		moveToNextPage: "Aller à la page suivante",
		moveToStart: "Aller au début",
		
		today: "Aujourd'hui",
		yesterday: "Hier",
		previous7days: "7 derniers jours",
		previous30days: "30 derniers jours",
		daysago: "jours",
		density: "Densité",
		comfortable: "Confortable",
		compact: "Compact",
		densityDesc: "Choisissez entre l'affichage confortable (par défaut) ou compact",
		showThumbnail: "Afficher la miniature",
		showThumbnailDesc: "Affiche la première image de la note comme miniature",
		thumbnailProperty: "Propriété de la miniature",
		thumbnailPropertyDesc: "Nom de la propriété à utiliser pour l'image miniature",
		thumbnailPosition: "Position de la miniature",
		thumbnailPositionDesc: "Choisissez si la miniature doit être à gauche ou à droite",
		left: "Gauche",
		right: "Droite",
		thumbnails: "Miniatures",
		pageStepSize: "Taille du pas de page",
		pageStepSizeDesc: "Nombre de notes à sauter lors de l'utilisation de Ctrl+PageUp/PageDown",
		dateFormat: "Format de date",
		maxNotesToShow: "Nombre maximal de notes",
		previewLines: "Lignes d'aperçu",
		showTime: "Afficher l'heure",
		excludedFolders: "Dossiers exclus",
		fileTypes: "Types de fichiers à afficher"
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
		moveToPreviousPage: "Eine Seite nach oben",
		moveToNextPage: "Eine Seite nach unten",
		moveToStart: "Zum Anfang springen",
		
		today: "Heute",
		yesterday: "Gestern",
		previous7days: "Letzte 7 Tage",
		previous30days: "Letzte 30 Tage",
		daysago: "Tage her",
		density: "Dichte",
		comfortable: "Komfortabel",
		showThumbnailDesc: "Zeigt das erste Bild der Notiz als Vorschaubild an",
		compact: "Kompakt",
		densityDesc: "Wählen Sie zwischen komfortabler (Standard) oder kompakter Anzeige",
		showThumbnail: "Vorschaubild anzeigen",
		thumbnailProperty: "Eigenschaft für Vorschaubild",
		thumbnailPropertyDesc: "Name der Frontmatter-Eigenschaft, die für das Vorschaubild verwendet werden soll",
		thumbnailPosition: "Position des Vorschaubildes",
		thumbnailPositionDesc: "Wählen Sie, ob das Vorschaubild links oder rechts stehen soll",
		left: "Links",
		right: "Rechts",
		thumbnails: "Vorschaubilder",
		pageStepSize: "Sprungdistanz",
		pageStepSizeDesc: "Anzahl der Notizen, die bei Verwendung von Strg+BildAuf/BildAb übersprungen werden",
		dateFormat: "Datumsformat",
		dateFormatDesc: "Format für die Anzeige von Daten, die älter als 7 Tage sind",
		maxNotesToShow: "Maximale Anzahl an Notizen",
		maxNotesToShowDesc: "Wie viele aktuelle Notizen in der Ansicht angezeigt werden sollen",
		previewLines: "Vorschauzeilen",
		previewLinesDesc: "Anzahl der Textzeilen in der Vorschau (0-3)",
		noPreview: "Keine Vorschau",
		line: "Zeile",
		lines: "Zeilen",
		showTime: "Zeit anzeigen",
		showTimeDesc: "Änderungszeitpunkt neben den Dateien anzeigen",
		excludedFolders: "Ausgeschlossene Ordner",
		excludedFoldersDesc: "Auszuschließende Ordner (einer pro Zeile)",
		excludedFiles: "Ausgeschlossene Dateien",
		excludedFilesDesc: "Auszuschließende Dateien (eine pro Zeile)",
		excludedTags: "Ausgeschlossene Tags",
		excludedTagsDesc: "Auszuschließende Tags (einer pro Zeile)",
		customProperty: "Eigene Eigenschaft für Änderungsdatum",
		customPropertyDesc: "Frontmatter-Eigenschaft, die für das Änderungsdatum verwendet werden soll",
		fileTypes: "Anzuzeigende Dateitypen",
		showMarkdown: "Markdown-Dateien anzeigen",
		showImages: "Bilddateien anzeigen",
		showPDF: "PDF-Dateien anzeigen",
		showAudio: "Audiodateien anzeigen",
		showVideo: "Videodateien anzeigen",
		showCanvas: "Canvas-Dateien anzeigen",
		showCSV: "CSV-Dateien anzeigen",
		showBase: "Base-Dateien anzeigen"
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
		moveToPreviousPage: "Vai alla pagina precedente",
		moveToNextPage: "Vai alla pagina successiva",
		moveToStart: "Vai all'inizio",
		
		today: "Oggi",
		yesterday: "Ieri",
		previous7days: "Ultimi 7 giorni",
		previous30days: "Ultimi 30 giorni",
		daysago: "giorni fa",
		density: "Densità",
		comfortable: "Comoda",
		compact: "Compatta",
		densityDesc: "Scegli tra la visualizzazione comoda (predefinita) o compatta",
		showThumbnail: "Mostra miniatura",
		showThumbnailDesc: "Mostra la prima immagine della nota come miniatura",
		thumbnailProperty: "Proprietà miniatura",
		thumbnailPropertyDesc: "Nome della proprietà da utilizzare per l'immagine in miniatura",
		thumbnailPosition: "Posizione miniatura",
		thumbnailPositionDesc: "Scegli se la miniatura deve essere a sinistra o a destra",
		left: "Sinistra",
		right: "Destra",
		thumbnails: "Miniature",
		pageStepSize: "Ampiezza salto pagina",
		pageStepSizeDesc: "Numero di note da saltare quando si usa Ctrl+PagSu/PagGiù",
		dateFormat: "Formato data",
		maxNotesToShow: "Note massime da mostrare",
		previewLines: "Linee di anteprima",
		showTime: "Mostra ora",
		excludedFolders: "Cartelle escluse",
		fileTypes: "Tipi di file da mostrare"
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
		moveToPreviousPage: "前のページへ",
		moveToNextPage: "次のページへ",
		moveToStart: "最初へ移動",
		
		today: "今日",
		yesterday: "昨日",
		previous7days: "過去7日間",
		previous30days: "過去30日間",
		daysago: "日前",
		density: "表示密度",
		comfortable: "標準",
		compact: "コンパクト",
		densityDesc: "標準（デフォルト）またはコンパクト表示を選択してください",
		showThumbnail: "サムネイルを表示",
		showThumbnailDesc: "ノートの最初の画像をサムネイルとして表示します",
		thumbnailProperty: "サムネイルのプロパティ",
		thumbnailPropertyDesc: "サムネイル画像に使用するプロパティ名",
		thumbnailPosition: "サムネイルの位置",
		thumbnailPositionDesc: "サムネイルを左側に表示するか右側に表示するかを選択します",
		left: "左",
		right: "右",
		thumbnails: "サムネイル",
		pageStepSize: "ページ移動幅",
		pageStepSizeDesc: "Ctrl+PageUp/PageDownを使用したときにスキップするノートの数"
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
		moveToPreviousPage: "이전 페이지로",
		moveToNextPage: "다음 페이지로",
		moveToStart: "처음으로 이동",
		
		today: "오늘",
		yesterday: "어제",
		previous7days: "지난 7일",
		previous30days: "지난 30일",
		daysago: "일 전",
		density: "표시 밀도",
		comfortable: "보통",
		compact: "조밀하게",
		densityDesc: "보통(기본값) 또는 조밀하게 표시 중에서 선택하십시오",
		showThumbnail: "썸네일 표시",
		showThumbnailDesc: "노트의 첫 번째 이미지를 썸네일로 표시합니다",
		thumbnailProperty: "썸네일 속성",
		thumbnailPropertyDesc: "썸네일 이미지에 사용할 속성 이름",
		thumbnailPosition: "썸네일 위치",
		thumbnailPositionDesc: "썸네일을 왼쪽이나 오른쪽에 표시할지 선택하십시오",
		left: "왼쪽",
		right: "오른쪽",
		thumbnails: "썸네일",
		pageStepSize: "페이지 이동 단계",
		pageStepSizeDesc: "Ctrl+PageUp/PageDown을 사용할 때 건너뛸 노트 수"
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
		moveToPreviousPage: "移至上一页",
		moveToNextPage: "移至下一页",
		moveToStart: "移至开头",
		
		today: "今天",
		yesterday: "昨天",
		previous7days: "最近7天",
		previous30days: "最近30天",
		daysago: "天前",
		density: "显示密度",
		comfortable: "舒适",
		compact: "紧凑",
		densityDesc: "选择舒适（默认）或紧凑显示",
		showThumbnail: "显示缩略图",
		showThumbnailDesc: "将笔记中的第一张图片显示为缩略图",
		thumbnailProperty: "缩略图属性",
		thumbnailPropertyDesc: "用于缩略图的属性名称",
		thumbnailPosition: "缩略图位置",
		thumbnailPositionDesc: "选择缩略图显示在左侧还是右侧",
		left: "左侧",
		right: "右侧",
		thumbnails: "缩略图",
		pageStepSize: "页面跳转步长",
		pageStepSizeDesc: "使用 Ctrl+PageUp/PageDown 时跳过的笔记数量"
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
		moveToPreviousPage: "На страницу вверх",
		moveToNextPage: "На страницу вниз",
		moveToStart: "В начало",
		
		today: "Сегодня",
		yesterday: "Вчера",
		previous7days: "Последние 7 дней",
		previous30days: "Последние 30 дней",
		daysago: "дней назад",
		density: "Плотность",
		comfortable: "Уютный",
		compact: "Компактный",
		densityDesc: "Выберите между уютным (по умолчанию) или компактным отображением",
		showThumbnail: "Показывать миниатюры",
		showThumbnailDesc: "Показывать первое изображение из заметки как миниатюру",
		thumbnailProperty: "Свойство миниатюры",
		thumbnailPropertyDesc: "Имя свойства для использования в качестве миниатюры",
		thumbnailPosition: "Положение миниатюры",
		thumbnailPositionDesc: "Выберите, должна ли миниатюра быть слева или справа",
		left: "Слева",
		right: "Справа",
		thumbnails: "Миниатюры",
		pageStepSize: "Шаг страницы",
		pageStepSizeDesc: "Количество заметок для пропуска при использовании Ctrl+PageUp/PageDown",
		dateFormat: "Формат даты",
		maxNotesToShow: "Максимум заметок для показа",
		previewLines: "Строк предпросмотра",
		showTime: "Показывать время",
		excludedFolders: "Исключенные папки",
		fileTypes: "Типы файлов для показа"
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
		moveToPreviousPage: "Ir para a página anterior",
		moveToNextPage: "Ir para a página seguinte",
		moveToStart: "Ir para o início",
		
		today: "Hoje",
		yesterday: "Ontem",
		previous7days: "Últimos 7 dias",
		previous30days: "Últimos 30 dias",
		daysago: "dias atrás",
		density: "Densidade",
		comfortable: "Confortável",
		compact: "Compacto",
		densityDesc: "Escolha entre a exibição confortável (padrão) ou compacta",
		showThumbnail: "Mostrar miniatura",
		showThumbnailDesc: "Mostrar a primeira imagem da nota como miniatura",
		thumbnailProperty: "Propriedade da miniatura",
		thumbnailPropertyDesc: "Nome da propriedade a utilizar para a imagem da miniatura",
		thumbnailPosition: "Posição da miniatura",
		thumbnailPositionDesc: "Escolha se a miniatura deve estar à esquerda ou à direita",
		left: "Esquerda",
		right: "Direita",
		thumbnails: "Miniaturas",
		pageStepSize: "Tamanho do passo de página",
		pageStepSizeDesc: "Número de notas a saltar ao usar Ctrl+PageUp/PageDown"
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
		moveToPreviousPage: "Ir para a página anterior",
		moveToNextPage: "Ir para a página seguinte",
		moveToStart: "Ir para o início",
		
		today: "Hoje",
		yesterday: "Ontem",
		previous7days: "Últimos 7 dias",
		previous30days: "Últimos 30 dias",
		daysago: "dias atrás",
		density: "Densidade",
		comfortable: "Confortável",
		compact: "Compacto",
		densityDesc: "Escolha entre a exibição confortável (padrão) ou compacta",
		showThumbnail: "Exibir miniatura",
		showThumbnailDesc: "Exibe a primeira imagem da nota como miniatura",
		thumbnailProperty: "Propriedade da miniatura",
		thumbnailPropertyDesc: "Nome da propriedade a ser usada para a imagem da miniatura",
		thumbnailPosition: "Posição da miniatura",
		thumbnailPositionDesc: "Escolha se a miniatura deve ficar à esquerda ou à direita",
		left: "Esquerda",
		right: "Direita",
		thumbnails: "Miniaturas",
		pageStepSize: "Tamanho do salto de página",
		pageStepSizeDesc: "Número de notas a saltar ao usar Ctrl+PageUp/PageDown"
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
		moveToPreviousPage: "Ugrás az előző oldalra",
		moveToNextPage: "Ugrás a következő oldalra",
		moveToStart: "Ugrás az elejére",
		
		today: "Ma",
		yesterday: "Tegnap",
		previous7days: "Utolsó 7 nap",
		previous30days: "Utolsó 30 nap",
		daysago: "napja",
		density: "Sűrűség",
		comfortable: "Kényelmes",
		compact: "Kompakt",
		densityDesc: "Válassz a kényelmes (alapértelmezett) vagy a kompakt megjelenítés között",
		showThumbnail: "Vorschaubild mutatása",
		showThumbnailDesc: "A jegyzet első képének megjelenítése miniatűrként",
		thumbnailProperty: "Vorschaubild tulajdonság",
		thumbnailPropertyDesc: "A miniatűrhöz használt tulajdonság neve",
		thumbnailPosition: "Vorschaubild pozíciója",
		thumbnailPositionDesc: "Válaszd ki, hogy a miniatűr bal vagy jobb oldalon legyen-e",
		left: "Bal",
		right: "Jobb",
		thumbnails: "Miniatűrök",
		pageStepSize: "Oldallépés mérete",
		pageStepSizeDesc: "A Ctrl+PageUp/PageDown billentyűkombinációval átugrandó jegyzetek száma"
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
	private thumbnailCache: Map<string, { url: string | null, timestamp: number }> = new Map();
	private readonly MAX_FILE_SIZE_FOR_PREVIEW = 100 * 1024; // 100 KB
	private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
	private lastEditedFile: string | null = null;
	private currentFileIndex: number = -1;
	private currentRefreshId: number = 0;

	constructor(leaf: WorkspaceLeaf, plugin: RecentNotesPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.containerEl.addClass('recent-notes-view');
	}

	public moveToAdjacentNote(direction: 'up' | 'down'): void {
		const files = this.getRecentFiles();
		if (files.length === 0) return;

		// Try to find current file index based on focused element first
		const focusedElement = document.activeElement;
		const focusedFilePath = focusedElement?.closest('.recent-note-item')?.getAttribute('data-path');
		
		let currentIndex = -1;
		if (focusedFilePath) {
			currentIndex = files.findIndex(f => f.path === focusedFilePath);
		}

		// If no focused element or not in list, fallback to active file
		if (currentIndex === -1) {
			const activeFile = this.app.workspace.getActiveFile();
			if (activeFile) {
				currentIndex = files.findIndex(f => f.path === activeFile.path);
			}
		}

		if (currentIndex === -1) {
			// If still not found, select first or last file depending on direction
			const targetFile = direction === 'up' ? files[files.length - 1] : files[0];
			this.openFile(targetFile, true);
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

		this.openFile(files[nextIndex], true);
	}

	public moveToAdjacentNotePage(direction: 'up' | 'down'): void {
		const files = this.getRecentFiles();
		if (files.length === 0) return;

		// Try to find current file index based on focused element first
		const focusedElement = document.activeElement;
		const focusedFilePath = focusedElement?.closest('.recent-note-item')?.getAttribute('data-path');
		
		let currentIndex = -1;
		if (focusedFilePath) {
			currentIndex = files.findIndex(f => f.path === focusedFilePath);
		}

		// If no focused element or not in list, fallback to active file
		if (currentIndex === -1) {
			const activeFile = this.app.workspace.getActiveFile();
			if (activeFile) {
				currentIndex = files.findIndex(f => f.path === activeFile.path);
			}
		}

		if (currentIndex === -1) {
			const targetFile = direction === 'up' ? files[files.length - 1] : files[0];
			this.openFile(targetFile, true);
			return;
		}

		// Skip notes based on setting for page up/down
		const pageSize = this.plugin.settings.pageStepSize;
		let nextIndex = direction === 'up' ? currentIndex - pageSize : currentIndex + pageSize;
		
		if (nextIndex < 0) {
			nextIndex = 0;
		} else if (nextIndex >= files.length) {
			nextIndex = files.length - 1;
		}

		if (nextIndex !== currentIndex) {
			this.openFile(files[nextIndex], true);
		}
	}

	public async moveToStart(): Promise<void> {
		const files = this.getRecentFiles();
		if (files.length === 0) return;
		await this.openFile(files[0]);
		
		// Also scroll to the very top to show the section header
		// Using a small timeout to ensure it happens after openFile's own scrolling
		setTimeout(() => {
			const container = this.containerEl.children[1];
			if (container) {
				container.scrollTo({ top: 0, behavior: 'smooth' });
			}
		}, 50);
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

	public async openFile(file: TFile, keepFocus: boolean = false, newTab: boolean = false): Promise<void> {
		const leaf = this.app.workspace.getLeaf(newTab);
		if (leaf) {
			await leaf.openFile(file, { active: !keepFocus });
			
			if (file.extension !== 'md') {
				setTimeout(() => {
					this.debouncedRefresh();
				}, 50);
			}
		}
	}

	private scrollToActiveNote() {
		const activeItem = this.containerEl.querySelector('.recent-note-item.is-active') as HTMLElement;
		if (activeItem) {
			const container = this.containerEl.children[1];
			const allItems = container?.querySelectorAll('.recent-note-item');
			if (container && allItems) {
				const itemIndex = Array.from(allItems).indexOf(activeItem);
				if (itemIndex >= 0 && itemIndex < 5) {
					// Scroll to top so time header or pinned section is visible
					container.scrollTo({ top: 0, behavior: 'smooth' });
				} else {
					activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
				}
			} else {
				activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
			}
		}
	}

	private clearOldCache() {
		const now = Date.now();
		for (const [path, data] of this.firstLineCache.entries()) {
			if (now - data.timestamp > this.CACHE_DURATION) {
				this.firstLineCache.delete(path);
			}
		}
		for (const [path, data] of this.thumbnailCache.entries()) {
			if (now - data.timestamp > this.CACHE_DURATION) {
				this.thumbnailCache.delete(path);
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
			(this.plugin.settings.showCSVFiles && ext === 'csv') ||
			(this.plugin.settings.showBaseFiles && ext === 'base')
		);
	}

	public clearCache(): void {
		this.firstLineCache.clear();
		this.thumbnailCache.clear();
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

	private async getThumbnail(file: TFile): Promise<string | null> {
		if (file.extension.toLowerCase() !== 'md') {
			if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg'].includes(file.extension.toLowerCase())) {
				return this.app.vault.adapter.getResourcePath(file.path);
			}
			return null;
		}

		const cached = this.thumbnailCache.get(file.path);
		if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
			return cached.url;
		}

		let thumbnailUrl: string | null = null;

		try {
			const fileCache = this.app.metadataCache.getFileCache(file);
			
			// 1. Check frontmatter property
			if (fileCache?.frontmatter && this.plugin.settings.thumbnailProperty) {
				const propertyValue = fileCache.frontmatter[this.plugin.settings.thumbnailProperty];
				if (propertyValue && typeof propertyValue === 'string') {
					const linkedFile = this.app.metadataCache.getFirstLinkpathDest(propertyValue, file.path);
					if (linkedFile) {
						thumbnailUrl = this.app.vault.adapter.getResourcePath(linkedFile.path);
					} else if (propertyValue.startsWith('http')) {
						thumbnailUrl = propertyValue;
					}
				}
			}

			// 2. Check for first image in content if not found in frontmatter
			if (!thumbnailUrl) {
				const content = await this.app.vault.cachedRead(file);
				
				// Match ![[image.png]] or ![] (image.png)
				const wikiMatch = content.match(/!\[\[(.*?)\]\]/);
				const mdMatch = content.match(/!\[.*?\]\((.*?)\)/);
				
				let firstImagePath: string | null = null;
				if (wikiMatch) {
					firstImagePath = wikiMatch[1].split('|')[0];
				} else if (mdMatch) {
					firstImagePath = mdMatch[1];
				}

				if (firstImagePath) {
					if (firstImagePath.startsWith('http')) {
						thumbnailUrl = firstImagePath;
					} else {
						const linkedFile = this.app.metadataCache.getFirstLinkpathDest(firstImagePath, file.path);
						if (linkedFile) {
							thumbnailUrl = this.app.vault.adapter.getResourcePath(linkedFile.path);
						}
					}
				}
			}
		} catch (e) {
			console.error("Error getting thumbnail", e);
		}

		this.thumbnailCache.set(file.path, { url: thumbnailUrl, timestamp: Date.now() });
		return thumbnailUrl;
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
			} else if (ext === 'base') {
				return `Base file • ${sizeStr}`;
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
		const todayText = this.plugin.translate('today');
		for (const section of sections) {
			if (section.textContent === todayText) {
				// Only scroll if current scroll position is more than 300px
				if (container.scrollTop > 300) {
					section.scrollIntoView({ behavior: 'smooth', block: 'start' });
				}
				break;
			}
		}
	}

	async refreshView() {
		const container = this.containerEl.children[1];
		if (!container) return;

		const refreshId = ++this.currentRefreshId;
		const scrollTop = container.scrollTop;
		const focusedElement = document.activeElement;
		const focusedFilePath = focusedElement?.closest('.recent-note-item')?.getAttribute('data-path');
		const oldActiveFilePath = this.lastActiveFile;
		
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
					cls: `recent-note-item ${activeFilePath === file.path ? 'is-active' : ''}`,
					attr: { 'data-path': file.path }
				});
				fileContainer.setAttribute('data-path', file.path);
				fileContainer.setAttribute('data-thumbnail-position', this.plugin.settings.thumbnailPosition);
				fileContainer.setAttribute('data-thumbnails-enabled', this.plugin.settings.showThumbnail.toString());
				fileContainer.tabIndex = 0;

				const itemWrapper = fileContainer.createEl('div', {
					cls: 'recent-note-item-wrapper'
				});

				// Get date text first
				const now = moment();
				let dateText;
				const modifiedTime = this.getModifiedTime(file, true);
				if (moment(modifiedTime).isSame(now, 'day') || moment(modifiedTime).isSame(now.clone().subtract(1, 'day'), 'day')) {
					dateText = moment(modifiedTime).format('HH:mm');
				} else if (moment(modifiedTime).isAfter(now.clone().subtract(7, 'days'))) {
					if (this.plugin.settings.dateFormat === 'RELATIVE') {
						const daysAgo = now.diff(moment(modifiedTime), 'days');
						dateText = daysAgo === 0 ? this.plugin.translate('today') : 
							   daysAgo === 1 ? this.plugin.translate('yesterday') : 
							   `${daysAgo} ${this.plugin.translate('daysago')}`;
					} else {
						dateText = moment(modifiedTime).format('dddd');
					}
				} else {
					if (this.plugin.settings.dateFormat === 'RELATIVE') {
						const daysAgo = now.diff(moment(modifiedTime), 'days');
						dateText = `${daysAgo} ${this.plugin.translate('daysago')}`;
					} else {
						dateText = moment(modifiedTime).format(this.plugin.settings.dateFormat);
					}
				}

				const isCompact = this.plugin.settings.density === 'compact';
				const showTime = this.plugin.settings.showTime;

		if (this.plugin.settings.showThumbnail) {
			const thumbnail = await this.getThumbnail(file);
			if (this.currentRefreshId !== refreshId) return;
			
			const thumbnailContainer = itemWrapper.createEl('div', {
				cls: 'recent-note-thumbnail-container'
			});

			if (thumbnail) {
				itemWrapper.addClass('has-thumbnail');
				thumbnailContainer.createEl('img', {
					attr: { src: thumbnail },
					cls: 'recent-note-thumbnail'
				});
			} else {
				itemWrapper.addClass('no-thumbnail');
				thumbnailContainer.addClass('hidden-thumbnail');
			}
		}

				const contentContainer = itemWrapper.createEl('div', {
					cls: 'recent-note-content'
				});

			// Handle compact mode differently
			if (isCompact) {
				// Create a header container for title
				const headerContainer = contentContainer.createEl('div', {
					cls: 'recent-note-header'
				});
				
				// Add title to the header
				headerContainer.createEl('div', { 
					text: this.getFileDisplayName(file),
					cls: 'recent-note-title'
				});
				
				// Add date to the right of title in compact mode
				if (showTime) {
					headerContainer.createEl('div', {
						text: dateText,
						cls: 'recent-note-date-compact'
					});
				}

				// Show folder name if enabled
				if (this.plugin.settings.showFolderName && file.parent && file.parent.path !== '/') {
					const folderEl = contentContainer.createEl('div', {
						cls: 'recent-note-folder'
					});
					const folderIcon = folderEl.createSpan({ cls: 'recent-note-folder-icon' });
					setIcon(folderIcon, 'folder');
					folderEl.createSpan({ text: file.parent.path });
				}
				
				// Add preview in compact mode if enabled
				if (this.plugin.settings.previewLines > 0) {
						const hasMultipleLines = this.plugin.settings.previewLines > 1;
						const firstLine = await this.getFirstLineOfFile(file);
						const previewContainer = contentContainer.createEl('div', {
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
					const titleEl = contentContainer.createEl('div', {
						text: this.getFileDisplayName(file),
						cls: 'recent-note-title'
					});

					// Show folder name if enabled
					if (this.plugin.settings.showFolderName && file.parent && file.parent.path !== '/') {
						const folderEl = fileContainer.createEl('div', {
							cls: 'recent-note-folder'
						});
						const folderIcon = folderEl.createSpan({ cls: 'recent-note-folder-icon' });
						setIcon(folderIcon, 'folder');
						folderEl.createSpan({ text: file.parent.path });
					}

					const hasMultipleLines = this.plugin.settings.previewLines > 1;
				const infoContainer = contentContainer.createEl('div', {
						cls: `recent-note-info ${hasMultipleLines ? 'has-multiple-lines' : ''}`
					});

					// Only show preview if previewLines > 0
					if (this.plugin.settings.previewLines > 0) {
						const firstLine = await this.getFirstLineOfFile(file);
						if (this.currentRefreshId !== refreshId) return;
						
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
					if (showTime) {
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
				cls: `recent-note-item ${activeFilePath === file.path ? 'is-active' : ''}`,
				attr: { 'data-path': file.path }
			});
			fileContainer.setAttribute('data-path', file.path);
			fileContainer.setAttribute('data-thumbnail-position', this.plugin.settings.thumbnailPosition);
			fileContainer.setAttribute('data-thumbnails-enabled', this.plugin.settings.showThumbnail.toString());
			fileContainer.tabIndex = 0;

			const itemWrapper = fileContainer.createEl('div', {
				cls: 'recent-note-item-wrapper'
			});

			// Get date text first
			const now = moment();
			let dateText;
			const modifiedTime = this.getModifiedTime(file, true);
			if (moment(modifiedTime).isSame(now, 'day') || moment(modifiedTime).isSame(now.clone().subtract(1, 'day'), 'day')) {
				dateText = moment(modifiedTime).format('HH:mm');
			} else if (moment(modifiedTime).isAfter(now.clone().subtract(7, 'days'))) {
				if (this.plugin.settings.dateFormat === 'RELATIVE') {
					const daysAgo = now.diff(moment(modifiedTime), 'days');
					dateText = daysAgo === 0 ? this.plugin.translate('today') : 
						   daysAgo === 1 ? this.plugin.translate('yesterday') : 
						   `${daysAgo} ${this.plugin.translate('daysago')}`;
				} else {
					dateText = moment(modifiedTime).format('dddd');
				}
			} else {
				if (this.plugin.settings.dateFormat === 'RELATIVE') {
					const daysAgo = now.diff(moment(modifiedTime), 'days');
					dateText = `${daysAgo} ${this.plugin.translate('daysago')}`;
				} else {
					dateText = moment(modifiedTime).format(this.plugin.settings.dateFormat);
				}
			}

			const isCompact = this.plugin.settings.density === 'compact';
			const showTime = this.plugin.settings.showTime;

			if (this.plugin.settings.showThumbnail) {
				const thumbnail = await this.getThumbnail(file);
				if (this.currentRefreshId !== refreshId) return;
				
				const thumbnailContainer = itemWrapper.createEl('div', {
					cls: 'recent-note-thumbnail-container'
				});

				if (thumbnail) {
					itemWrapper.addClass('has-thumbnail');
					thumbnailContainer.createEl('img', {
						attr: { src: thumbnail },
						cls: 'recent-note-thumbnail'
					});
				} else {
					itemWrapper.addClass('no-thumbnail');
					thumbnailContainer.addClass('hidden-thumbnail');
				}
			}

			const contentContainer = itemWrapper.createEl('div', {
				cls: 'recent-note-content'
			});

			// Handle compact mode differently
			if (isCompact) {
				// Create a header container for title
				const headerContainer = contentContainer.createEl('div', {
					cls: 'recent-note-header'
				});

				// Add title to the header
				headerContainer.createEl('div', {
					text: this.getFileDisplayName(file),
					cls: 'recent-note-title'
				});
				
				// Add date to the header in compact mode
				if (showTime) {
					headerContainer.createEl('div', {
						text: dateText,
						cls: 'recent-note-date-compact'
					});
				}

				// Show folder name if enabled
				if (this.plugin.settings.showFolderName && file.parent && file.parent.path !== '/') {
					const folderEl = contentContainer.createEl('div', {
						cls: 'recent-note-folder'
					});
					const folderIcon = folderEl.createSpan({ cls: 'recent-note-folder-icon' });
					setIcon(folderIcon, 'folder');
					folderEl.createSpan({ text: file.parent.path });
				}
				
				// Add preview in compact mode if enabled
				if (this.plugin.settings.previewLines > 0) {
					const hasMultipleLines = this.plugin.settings.previewLines > 1;
					const firstLine = await this.getFirstLineOfFile(file);
					if (this.currentRefreshId !== refreshId) return;
					
					const previewContainer = contentContainer.createEl('div', {
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
				const titleEl = contentContainer.createEl('div', {
					text: this.getFileDisplayName(file),
					cls: 'recent-note-title'
				});

				// Show folder name if enabled
				if (this.plugin.settings.showFolderName && file.parent && file.parent.path !== '/') {
					const folderEl = contentContainer.createEl('div', {
						cls: 'recent-note-folder'
					});
					const folderIcon = folderEl.createSpan({ cls: 'recent-note-folder-icon' });
					setIcon(folderIcon, 'folder');
					folderEl.createSpan({ text: file.parent.path });
				}

				const hasMultipleLines = this.plugin.settings.previewLines > 1;
				const infoContainer = contentContainer.createEl('div', {
					cls: `recent-note-info ${hasMultipleLines ? 'has-multiple-lines' : ''}`
				});

				// Only show preview if previewLines > 0
				if (this.plugin.settings.previewLines > 0) {
					const firstLine = await this.getFirstLineOfFile(file);
					if (this.currentRefreshId !== refreshId) return;
					
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
				if (showTime) {
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
		
		// Restore focus if it was on a file item
		if (focusedFilePath) {
			let itemPathToFocus = focusedFilePath;
			
			// If focus was on the previously active file, and the active file has changed,
			// follow the focus to the new active file.
			if (focusedFilePath === oldActiveFilePath && activeFilePath && activeFilePath !== oldActiveFilePath) {
				itemPathToFocus = activeFilePath;
			}

			const itemToFocus = container.querySelector(`.recent-note-item[data-path="${itemPathToFocus.replace(/"/g, '\\"')}"]`) as HTMLElement;
			if (itemToFocus) {
				itemToFocus.focus();
			}
		} else if (activeFilePath && this.containerEl.contains(document.activeElement)) {
			// If no specific item was focused but the view had focus, focus the active note
			const itemToFocus = container.querySelector(`.recent-note-item[data-path="${activeFilePath.replace(/"/g, '\\"')}"]`) as HTMLElement;
			if (itemToFocus) {
				itemToFocus.focus();
			}
		}

		// Ensure the active note is visible
		this.scrollToActiveNote();
		
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
				
				await this.openFile(file);
				lastTapTime = Date.now(); // Record when we opened the file
				
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
							await this.openFile(file, false, true);
							
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
			await this.openFile(file, false, openInNewTab);
		});

		// Add keydown listener for accessibility
		fileContainer.addEventListener('keydown', async (event: KeyboardEvent) => {
			if (event.key === 'Enter') {
				event.preventDefault();
				event.stopPropagation();

				const openInNewTab = event.metaKey || event.ctrlKey;
				await this.openFile(file, false, openInNewTab);
			}
			// } else if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home'].includes(event.key)) {
			// 	// If any modifier is pressed, let it bubble to Obsidian's command/hotkey system
			// 	if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
			// 		return;
			// 	}
			//
			// 	// Focus-only navigation when no modifiers are pressed
			// 	const items = Array.from(this.containerEl.querySelectorAll('.recent-note-item')) as HTMLElement[];
			// 	const currentIndex = items.indexOf(fileContainer);
			//
			// 	if (event.key === 'ArrowUp') {
			// 		event.preventDefault();
			// 		if (currentIndex > 0) items[currentIndex - 1].focus();
			// 	} else if (event.key === 'ArrowDown') {
			// 		event.preventDefault();
			// 		if (currentIndex < items.length - 1) items[currentIndex + 1].focus();
			// 	} else if (event.key === 'Home') {
			// 		event.preventDefault();
			// 		if (items.length > 0) items[0].focus();
			// 	} else if (event.key === 'PageUp') {
			// 		event.preventDefault();
			// 		const pageSize = this.plugin.settings.pageStepSize || 10;
			// 		const targetIndex = Math.max(0, currentIndex - pageSize);
			// 		if (items[targetIndex]) items[targetIndex].focus();
			// 	} else if (event.key === 'PageDown') {
			// 		event.preventDefault();
			// 		const pageSize = this.plugin.settings.pageStepSize || 10;
			// 		const targetIndex = Math.min(items.length - 1, currentIndex + pageSize);
			// 		if (items[targetIndex]) items[targetIndex].focus();
			// 	}
			// }
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
						await this.openFile(file, false, true);
						
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
					this.thumbnailCache.delete(file.path);
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
				if (activeFile && this.shouldRefreshForFile(activeFile)) {
					// Always refresh when active file changes to update .is-active class
					this.debouncedRefresh();
				} else {
					// Even if it shouldn't be in the list, refresh to remove .is-active from old file
					this.debouncedRefresh();
				}
			})
		);

		this.registerEvent(
			this.app.workspace.on('file-open', () => {
				this.debouncedRefresh();
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

		// For daily notes (YYYY-MM-DD format), append a relative date label
		const dailyNoteDate = moment(file.basename, 'YYYY-MM-DD', true);
		if (dailyNoteDate.isValid()) {
			const label = this.getRelativeDateLabel(dailyNoteDate);
			if (label) {
				return `${file.basename} (${label})`;
			}
		}

		// Default to basename if no title in frontmatter
		return file.basename;
	}

	private getRelativeDateLabel(date: moment.Moment): string {
		const today = moment().startOf('day');
		const diff = date.startOf('day').diff(today, 'days');

		if (diff === 0) return 'today';
		if (diff === -1) return 'yesterday';
		if (diff === 1) return 'tomorrow';

		const dayName = date.format('ddd');
		if (diff >= 2 && diff <= 7) return `next ${dayName}`;
		if (diff >= -7 && diff <= -2) return `last ${dayName}`;

		return dayName;
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
			checkCallback: (checking: boolean) => {
				if (this.isViewVisible()) {
					if (!checking) {
						this.view.moveToAdjacentNote('up');
					}
					return true;
				}
				return false;
			},
			hotkeys: [{ modifiers: ['Mod'], key: 'ArrowUp' }]
		});

		this.addCommand({
			id: 'move-to-next-recent-note',
			name: this.translate('moveToNext'),
			checkCallback: (checking: boolean) => {
				if (this.isViewVisible()) {
					if (!checking) {
						this.view.moveToAdjacentNote('down');
					}
					return true;
				}
				return false;
			},
			hotkeys: [{ modifiers: ['Mod'], key: 'ArrowDown' }]
		});

		this.addCommand({
			id: 'move-to-previous-page-recent-note',
			name: this.translate('moveToPreviousPage'),
			checkCallback: (checking: boolean) => {
				if (this.isViewVisible()) {
					if (!checking) {
						this.view.moveToAdjacentNotePage('up');
					}
					return true;
				}
				return false;
			},
			hotkeys: [{ modifiers: ['Mod'], key: 'PageUp' }]
		});

		this.addCommand({
			id: 'move-to-next-page-recent-note',
			name: this.translate('moveToNextPage'),
			checkCallback: (checking: boolean) => {
				if (this.isViewVisible()) {
					if (!checking) {
						this.view.moveToAdjacentNotePage('down');
					}
					return true;
				}
				return false;
			},
			hotkeys: [{ modifiers: ['Mod'], key: 'PageDown' }]
		});

		this.addCommand({
			id: 'move-to-start-recent-note',
			name: this.translate('moveToStart'),
			checkCallback: (checking: boolean) => {
				if (this.isViewVisible()) {
					if (!checking) {
						this.view.moveToStart();
					}
					return true;
				}
				return false;
			},
			hotkeys: [{ modifiers: ['Mod'], key: 'Home' }]
		});


		this.addSettingTab(new RecentNotesSettingTab(this.app, this));
	}

	isViewVisible(): boolean {
		const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_RECENT_NOTES)[0];
		return !!leaf && leaf.view.containerEl.isShown();
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
			await workspace.revealLeaf(leaf);
			
			// Get the active file to focus it
			const activeFile = this.app.workspace.getActiveFile();
			
			// Focus the active item in the list and the note itself
			setTimeout(() => {
				const activeItem = leaf?.view.containerEl.querySelector('.recent-note-item.is-active') as HTMLElement;
				if (activeItem) {
					// We focus the list item first
					activeItem.focus();
					
					// If there is an active file, we use openFile to simulate the 'Enter' logic
					// as requested by the user. This ensures correct navigation state.
					if (activeFile && activeFile.path === activeItem.getAttribute('data-path')) {
						if (leaf?.view instanceof RecentNotesView) {
							leaf.view.openFile(activeFile, false);
						}
					}
				}
			}, 150);
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
			.setName(this.plugin.translate('dateFormat'))
			.setDesc(this.plugin.translate('dateFormatDesc'))
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
			.setName(this.plugin.translate('maxNotesToShow'))
			.setDesc(this.plugin.translate('maxNotesToShowDesc'))
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
			.setName(this.plugin.translate('previewLines'))
			.setDesc(this.plugin.translate('previewLinesDesc'))
			.addDropdown(dropdown => dropdown
				.addOption('0', this.plugin.translate('noPreview'))
				.addOption('1', '1 ' + this.plugin.translate('line'))
				.addOption('2', '2 ' + this.plugin.translate('lines'))
				.addOption('3', '3 ' + this.plugin.translate('lines'))
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
			.setName(this.plugin.translate('showTime'))
			.setDesc(this.plugin.translate('showTimeDesc'))
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
			.setName('Show folder name')
			.setDesc('Show the folder path underneath the note title')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showFolderName)
				.onChange(async (value) => {
					this.plugin.settings.showFolderName = value;
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
			.setName(this.plugin.translate('pageStepSize'))
			.setDesc(this.plugin.translate('pageStepSizeDesc'))
			.addSlider(slider => slider
				.setLimits(1, 50, 1)
				.setValue(this.plugin.settings.pageStepSize)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.pageStepSize = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(this.plugin.translate('excludedFolders'))
			.setDesc(this.plugin.translate('excludedFoldersDesc'))
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
			.setName(this.plugin.translate('excludedFiles'))
			.setDesc(this.plugin.translate('excludedFilesDesc'))
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
			.setName(this.plugin.translate('excludedTags'))
			.setDesc(this.plugin.translate('excludedTagsDesc'))
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
			.setName(this.plugin.translate('customProperty'))
			.setDesc(this.plugin.translate('customPropertyDesc'))
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

		containerEl.createEl('h3', { text: this.plugin.translate('fileTypes') });

		new Setting(containerEl)
			.setName(this.plugin.translate('showMarkdown'))
			.setDesc(this.plugin.translate('showMarkdownDesc'))
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
			.setName(this.plugin.translate('showImages'))
			.setDesc(this.plugin.translate('showImagesDesc'))
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
			.setName(this.plugin.translate('showPDF'))
			.setDesc(this.plugin.translate('showPDFDesc'))
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
			.setName(this.plugin.translate('showAudio'))
			.setDesc(this.plugin.translate('showAudioDesc'))
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
			.setName(this.plugin.translate('showVideo'))
			.setDesc(this.plugin.translate('showVideoDesc'))
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
			.setName(this.plugin.translate('showCanvas'))
			.setDesc(this.plugin.translate('showCanvasDesc'))
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
			.setName(this.plugin.translate('showCSV'))
			.setDesc(this.plugin.translate('showCSVDesc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showCSVFiles)
				.onChange(async (value) => {
					this.plugin.settings.showCSVFiles = value;
					await this.plugin.saveSettings();
					if (this.plugin.view) {
						await this.plugin.view.refreshView();
					}
				}));

		new Setting(containerEl)
			.setName(this.plugin.translate('showBase'))
			.setDesc(this.plugin.translate('showBaseDesc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showBaseFiles)
				.onChange(async (value) => {
					this.plugin.settings.showBaseFiles = value;
					await this.plugin.saveSettings();
					if (this.plugin.view) {
						await this.plugin.view.refreshView();
					}
				}));

		containerEl.createEl('h3', { text: this.plugin.translate('thumbnails') });

		new Setting(containerEl)
			.setName(this.plugin.translate('showThumbnail'))
			.setDesc(this.plugin.translate('showThumbnailDesc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showThumbnail)
				.onChange(async (value) => {
					this.plugin.settings.showThumbnail = value;
					await this.plugin.saveSettings();
					if (this.plugin.view) {
						await this.plugin.view.refreshView();
					}
				}));

		new Setting(containerEl)
			.setName(this.plugin.translate('thumbnailProperty'))
			.setDesc(this.plugin.translate('thumbnailPropertyDesc'))
			.addText(text => text
				.setPlaceholder('image')
				.setValue(this.plugin.settings.thumbnailProperty)
				.onChange(async (value) => {
					this.plugin.settings.thumbnailProperty = value;
					await this.plugin.saveSettings();
					if (this.plugin.view) {
						this.plugin.view.clearCache();
						await this.plugin.view.refreshView();
					}
				}));

		new Setting(containerEl)
			.setName(this.plugin.translate('thumbnailPosition'))
			.setDesc(this.plugin.translate('thumbnailPositionDesc'))
			.addDropdown(dropdown => dropdown
				.addOption('left', this.plugin.translate('left'))
				.addOption('right', this.plugin.translate('right'))
				.setValue(this.plugin.settings.thumbnailPosition)
				.onChange(async (value: 'left' | 'right') => {
					this.plugin.settings.thumbnailPosition = value;
					await this.plugin.saveSettings();
					if (this.plugin.view) {
						await this.plugin.view.refreshView();
					}
				}));
	}
}
