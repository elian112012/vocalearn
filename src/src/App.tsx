import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Home,
  Camera,
  BookOpen,
  Play,
  Layers,
  AlertCircle,
  BarChart3,
  Settings,
  Volume2,
  Plus,
  Trash2,
  Edit3,
  Search,
  FolderPlus,
  Folder,
  Check,
  X,
  Upload,
  FileText,
  Download,
  Printer,
  Copy,
  RefreshCw,
  Flame,
  Trophy,
  Target,
  Clock,
  Sun,
  Moon,
  ChevronRight,
  ChevronLeft,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowLeftRight,
  ShieldCheck,
  Smartphone,
  Menu,
  RotateCcw,
  Award,
  Headphones,
  GraduationCap,
  Puzzle,
  Keyboard,
  ListChecks,
  Save,
  Filter,
  AlertTriangle,
  Crop,
  RotateCw,
} from 'lucide-react';

// ============================================================================
// 1. TYPDEFINITIONEN
// ============================================================================

type NavTab =
  | 'dashboard'
  | 'scanner'
  | 'library'
  | 'quiz-setup'
  | 'quiz-run'
  | 'flashcards'
  | 'mistakes'
  | 'stats'
  | 'settings';

type VocabStatus = 'new' | 'learning' | 'hard' | 'mastered';
type QuizDirection = 'de-fr' | 'fr-de' | 'mixed';
type QuizMode =
  | 'multiple-choice'
  | 'written'
  | 'flashcards'
  | 'matching'
  | 'listening'
  | 'exam'
  | 'mixed';
type SpellingStrictness = 'strict' | 'tolerant' | 'very-tolerant';

interface FolderItem {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

interface LessonItem {
  id: string;
  name: string;
  folderId: string | null;
  createdAt: number;
  updatedAt: number;
}

interface VocabItem {
  id: string;
  lessonId: string;
  de: string;
  fr: string;
  altDe: string[];
  altFr: string[];
  status: VocabStatus;
  correctCount: number;
  wrongCount: number;
  streak: number;
  easeFactor: number;
  interval: number;
  nextReview: number;
  lastReviewed: number | null;
}

interface DailyStat {
  studied: number;
  correct: number;
  wrong: number;
  seconds: number;
  points: number;
}

interface UserStats {
  points: number;
  streakDays: number;
  lastStudyDate: string | null;
  totalCorrect: number;
  totalWrong: number;
  dailyHistory: Record<string, DailyStat>;
}

interface AppSettings {
  theme: 'light' | 'dark';
  dailyGoal: number;
  defaultDirection: QuizDirection;
  requireArticle: boolean;
  requireAccents: boolean;
  spellingStrictness: SpellingStrictness;
  acceptAlternatives: boolean;
  speechRate: number;
  geminiApiKey?: string;
}

interface QuizConfig {
  lessonIds: string[];
  direction: QuizDirection;
  mode: QuizMode;
  count: number | 'all';
  filter: 'all' | 'wrong' | 'new';
  shuffle: boolean;
  timeLimitSeconds: number; // 0 = kein Limit
  requireArticle: boolean;
  requireAccents: boolean;
  spellingStrictness: SpellingStrictness;
  acceptAlternatives: boolean;
  listeningAnswerType: 'fr' | 'de';
}

interface QuizQuestion {
  vocab: VocabItem;
  direction: 'de-fr' | 'fr-de';
  mode: 'multiple-choice' | 'written' | 'listening';
  options?: string[];
}

interface QuizAnswerRecord {
  vocab: VocabItem;
  direction: 'de-fr' | 'fr-de';
  userAnswer: string;
  expectedAnswer: string;
  isCorrect: boolean;
}

interface ScannedPair {
  id: string;
  de: string;
  fr: string;
  altDe: string;
  altFr: string;
  confidence?: number;
  warning?: string;
  aiNote?: string;
}

interface ScannedPageItem {
  id: string;
  name: string;
  dataUrl: string;
  rotation: number; // 0, 90, 180, 270
  crop: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  colSplit1: number; // Trennlinie Spalte 1 | 2 (% innerhalb des Zuschnitts)
  colSplit2: number; // Trennlinie Spalte 2 | 3 (% bei 3-Spalten-Layout)
}

interface ScannerFilterOptions {
  strictness: 'strict' | 'medium' | 'loose';
  layoutMode: 'auto' | 'two-columns' | 'three-columns';
  removePhonetics: boolean;
  filterNoiseAndHeaders: boolean;
  filterExampleSentences: boolean;
  filterGrammarBoxes: boolean;
  onlyCompletePairs: boolean;
  deduplicate: boolean;
  columnOrder: 'auto' | 'fr-de' | 'de-fr';
  enhanceImageForOcr: boolean;
}

interface FilteredOutLine {
  id: string;
  raw: string;
  reason: string;
}

interface OcrParseResult {
  pairs: ScannedPair[];
  filteredOut: FilteredOutLine[];
}

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}

interface PersistedState {
  folders: FolderItem[];
  lessons: LessonItem[];
  vocabs: VocabItem[];
  stats: UserStats;
  settings: AppSettings;
}

// ============================================================================
// 2. KONSTANTEN, HILFSFUNKTIONEN & BEISPIELDATEN
// ============================================================================

const FRENCH_CHARS = [
  'é',
  'è',
  'ê',
  'ë',
  'à',
  'â',
  'ç',
  'î',
  'ï',
  'ô',
  'ù',
  'û',
  'ü',
  'œ',
  'æ',
];

const FOLDER_COLORS = [
  '#4f46e5',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#0ea5e9',
  '#ec4899',
];

const DEFAULT_STATS: UserStats = {
  points: 0,
  streakDays: 0,
  lastStudyDate: null,
  totalCorrect: 0,
  totalWrong: 0,
  dailyHistory: {},
};

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  dailyGoal: 20,
  defaultDirection: 'de-fr',
  requireArticle: true,
  requireAccents: true,
  spellingStrictness: 'tolerant',
  acceptAlternatives: true,
  speechRate: 0.95,
  geminiApiKey: '',
};

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getTodayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function shuffleArray<T>(list: T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function createInitialDemoState(): PersistedState {
  const now = Date.now();
  const folderId = 'folder-demo-1';
  const lessonId = 'lesson-demo-1';

  const starterPairs: { de: string; fr: string; altDe?: string[]; altFr?: string[] }[] = [
    { de: 'Guten Tag', fr: 'bonjour', altDe: ['Hallo'] },
    { de: 'das Haus', fr: 'la maison' },
    { de: 'die Schule', fr: "l'école" },
    { de: 'der Freund', fr: "l'ami", altFr: ['un ami'] },
    { de: 'die Freundin', fr: "l'amie", altFr: ['une amie'] },
    { de: 'essen', fr: 'manger' },
    { de: 'trinken', fr: 'boire' },
    { de: 'das Buch', fr: 'le livre' },
    { de: 'die Stadt', fr: 'la ville' },
    { de: 'das Herz', fr: 'le cœur' },
    { de: 'der Junge', fr: 'le garçon' },
    { de: 'auf Wiedersehen', fr: 'au revoir', altDe: ['Tschüss'] },
  ];

  const vocabs: VocabItem[] = starterPairs.map((item, idx) => ({
    id: `vocab-demo-${idx + 1}`,
    lessonId,
    de: item.de,
    fr: item.fr,
    altDe: item.altDe || [],
    altFr: item.altFr || [],
    status: 'new',
    correctCount: 0,
    wrongCount: 0,
    streak: 0,
    easeFactor: 2.5,
    interval: 0,
    nextReview: now,
    lastReviewed: null,
  }));

  return {
    folders: [{ id: folderId, name: 'Französisch Grundlagen', color: '#4f46e5', createdAt: now }],
    lessons: [
      {
        id: lessonId,
        name: 'Unité 1 – Begrüßung & Alltag (Beispiel)',
        folderId,
        createdAt: now,
        updatedAt: now,
      },
    ],
    vocabs,
    stats: DEFAULT_STATS,
    settings: DEFAULT_SETTINGS,
  };
}

// ============================================================================
// 3. DAUERHAFTE LOKALE SPEICHERUNG (INDEXEDDB MIT LOCALSTORAGE-FALLBACK)
// ============================================================================

const IDB_NAME = 'VocaLearnDB';
const IDB_VERSION = 1;
const IDB_STORE = 'appState';
const IDB_KEY = 'vocalearn_main_state';
const LS_FALLBACK_KEY = 'vocalearn_state_fallback_v1';

function openVocaLearnDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB nicht verfügbar'));
      return;
    }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB-Fehler'));
  });
}

async function loadPersistedState(): Promise<PersistedState | null> {
  try {
    const db = await openVocaLearnDb();
    const data = await new Promise<PersistedState | null>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const getReq = store.get(IDB_KEY);
      getReq.onsuccess = () => resolve((getReq.result as PersistedState) || null);
      getReq.onerror = () => reject(getReq.error);
    });
    db.close();
    if (data && Array.isArray(data.lessons) && Array.isArray(data.vocabs)) {
      return data;
    }
  } catch {
    // Fallback auf localStorage, falls IndexedDB blockiert ist
  }

  try {
    const raw = localStorage.getItem(LS_FALLBACK_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedState;
      if (parsed && Array.isArray(parsed.lessons) && Array.isArray(parsed.vocabs)) {
        return parsed;
      }
    }
  } catch {
    // Ignorieren
  }
  return null;
}

async function savePersistedState(state: PersistedState): Promise<void> {
  try {
    const db = await openVocaLearnDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(state, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Fallback auf localStorage
  }

  try {
    localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(state));
  } catch {
    // Ignorieren, falls Speicherlimit erreicht
  }
}

// ============================================================================
// 4. SPACED REPETITION (SM-2), ANTWORTPRÜFUNG & SPRACHAUSGABE
// ============================================================================

function applySpacedRepetition(vocab: VocabItem, isCorrect: boolean): VocabItem {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  let easeFactor = vocab.easeFactor || 2.5;
  let interval = vocab.interval || 0;
  let streak = vocab.streak || 0;
  let correctCount = vocab.correctCount || 0;
  let wrongCount = vocab.wrongCount || 0;
  let status: VocabStatus = vocab.status;

  if (isCorrect) {
    correctCount += 1;
    streak += 1;
    easeFactor = Math.min(3.0, Math.max(1.3, easeFactor + 0.1));
    if (streak === 1) interval = 1;
    else if (streak === 2) interval = 3;
    else interval = Math.max(4, Math.round(interval * easeFactor));

    if (streak >= 3 && correctCount >= 3) status = 'mastered';
    else status = 'learning';
  } else {
    wrongCount += 1;
    streak = 0;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
    interval = 0;
    status = 'hard';
  }

  return {
    ...vocab,
    correctCount,
    wrongCount,
    streak,
    easeFactor,
    interval,
    status,
    lastReviewed: now,
    nextReview: interval > 0 ? now + interval * dayMs : now + 10 * 60 * 1000,
  };
}

function stripDiacritics(input: string): string {
  return input
    .replace(/œ/gi, 'oe')
    .replace(/æ/gi, 'ae')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function stripLeadingArticle(input: string, lang: 'fr' | 'de'): string {
  const s = input.trim();
  if (lang === 'fr') {
    return s.replace(/^(le|la|les|un|une|des|du|de la|de l'|l')\s*/i, '').trim();
  }
  return s.replace(/^(der|die|das|ein|eine|einen|einem|einer)\s+/i, '').trim();
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = temp;
    }
  }
  return dp[n];
}

function normalizeForCompare(
  raw: string,
  lang: 'fr' | 'de',
  requireArticle: boolean,
  requireAccents: boolean
): string {
  let s = raw
    .trim()
    .toLowerCase()
    .replace(/[’`´‘]/g, "'")
    .replace(/[.,!?;:()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!requireArticle) {
    s = stripLeadingArticle(s, lang);
  }
  if (!requireAccents) {
    s = stripDiacritics(s);
  }
  return s;
}

function evaluateAnswer(
  submitted: string,
  vocab: VocabItem,
  targetLang: 'fr' | 'de',
  rules: {
    requireArticle: boolean;
    requireAccents: boolean;
    spellingStrictness: SpellingStrictness;
    acceptAlternatives: boolean;
  }
): boolean {
  const cleanSubmitted = submitted.trim();
  if (!cleanSubmitted) return false;

  const expectedCandidates = [
    targetLang === 'fr' ? vocab.fr : vocab.de,
    ...(rules.acceptAlternatives ? (targetLang === 'fr' ? vocab.altFr : vocab.altDe) : []),
  ].filter(Boolean);

  const normalizedInput = normalizeForCompare(
    cleanSubmitted,
    targetLang,
    rules.requireArticle,
    rules.requireAccents
  );

  for (const candidate of expectedCandidates) {
    const normalizedExpected = normalizeForCompare(
      candidate,
      targetLang,
      rules.requireArticle,
      rules.requireAccents
    );
    if (!normalizedExpected) continue;
    if (normalizedInput === normalizedExpected) return true;

    const dist = levenshteinDistance(normalizedInput, normalizedExpected);
    const len = normalizedExpected.length;
    if (rules.spellingStrictness === 'tolerant' && len >= 4 && dist <= 1) return true;
    if (rules.spellingStrictness === 'very-tolerant') {
      if (len >= 6 && dist <= 2) return true;
      if (len >= 3 && dist <= 1) return true;
    }
  }
  return false;
}

function speakFrench(text: string, rate: number = 0.95, onError?: (msg: string) => void): void {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onError?.('Sprachausgabe wird von diesem Browser leider nicht unterstützt.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = Math.min(1.4, Math.max(0.5, rate));
    const voices = window.speechSynthesis.getVoices();
    const frenchVoice =
      voices.find((v) => v.lang.toLowerCase().startsWith('fr-fr')) ||
      voices.find((v) => v.lang.toLowerCase().startsWith('fr'));
    if (frenchVoice) utterance.voice = frenchVoice;
    window.speechSynthesis.speak(utterance);
  } catch {
    onError?.('Sprachausgabe konnte nicht gestartet werden.');
  }
}

// ============================================================================
// 5. DYNAMISCHE LOADER FÜR KOSTENLOSE OPEN-SOURCE-BIBLIOTHEKEN (OCR, PDF, JSPDF)
// ============================================================================

const loadedScripts = new Map<string, Promise<void>>();

function loadExternalScript(src: string): Promise<void> {
  if (loadedScripts.has(src)) return loadedScripts.get(src)!;
  const promise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      if (existing.getAttribute('data-loaded') === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Konnte ${src} nicht laden`)), {
        once: true,
      });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.setAttribute('data-loaded', 'true');
      resolve();
    };
    script.onerror = () => {
      loadedScripts.delete(src);
      reject(new Error(`Skript konnte nicht geladen werden: ${src}`));
    };
    document.head.appendChild(script);
  });
  loadedScripts.set(src, promise);
  return promise;
}

async function getTesseract(): Promise<any> {
  if (!(window as any).Tesseract) {
    await loadExternalScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
  }
  if (!(window as any).Tesseract) {
    throw new Error('Tesseract.js konnte nicht initialisiert werden.');
  }
  return (window as any).Tesseract;
}

async function getPdfJs(): Promise<any> {
  if (!(window as any).pdfjsLib) {
    await loadExternalScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
  }
  const pdfjsLib = (window as any).pdfjsLib;
  if (!pdfjsLib) {
    throw new Error('PDF.js konnte nicht initialisiert werden.');
  }
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  return pdfjsLib;
}

async function getJsPdf(): Promise<any> {
  if (!(window as any).jspdf?.jsPDF) {
    await loadExternalScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  }
  const jsPDF = (window as any).jspdf?.jsPDF;
  if (!jsPDF) {
    throw new Error('jsPDF konnte nicht initialisiert werden.');
  }
  return jsPDF;
}

// ============================================================================
// 6. OCR-PARSER, ADAPTIVE BILDOPTIMIERUNG & STRENGER VOKABELFILTER (OHNE KI)
// ============================================================================

const DEFAULT_SCANNER_FILTERS: ScannerFilterOptions = {
  strictness: 'strict',
  layoutMode: 'two-columns',
  removePhonetics: true,
  filterNoiseAndHeaders: true,
  filterExampleSentences: true,
  filterGrammarBoxes: true,
  onlyCompletePairs: true,
  deduplicate: true,
  columnOrder: 'fr-de',
  enhanceImageForOcr: true,
};

function createDefaultPage(name: string, dataUrl: string): ScannedPageItem {
  return {
    id: generateId(),
    name,
    dataUrl,
    rotation: 0,
    crop: { top: 4, bottom: 96, left: 2, right: 98 },
    colSplit1: 48,
    colSplit2: 68,
  };
}

// Lädt ein Bild, dreht es bei Bedarf und schneidet den gewählten Vokabelbereich exakt aus
async function renderCroppedPageCanvas(page: ScannedPageItem): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const rot = ((page.rotation % 360) + 360) % 360;
        const swapDims = rot === 90 || rot === 270;
        const rotW = swapDims ? img.height : img.width;
        const rotH = swapDims ? img.width : img.height;

        const rotCanvas = document.createElement('canvas');
        rotCanvas.width = rotW;
        rotCanvas.height = rotH;
        const rCtx = rotCanvas.getContext('2d');
        if (!rCtx) {
          reject(new Error('Canvas konnte nicht initialisiert werden.'));
          return;
        }

        rCtx.fillStyle = '#ffffff';
        rCtx.fillRect(0, 0, rotW, rotH);
        rCtx.translate(rotW / 2, rotH / 2);
        rCtx.rotate((rot * Math.PI) / 180);
        rCtx.drawImage(img, -img.width / 2, -img.height / 2);

        const sx = Math.max(0, Math.round((page.crop.left / 100) * rotW));
        const sy = Math.max(0, Math.round((page.crop.top / 100) * rotH));
        const ex = Math.min(rotW, Math.round((page.crop.right / 100) * rotW));
        const ey = Math.min(rotH, Math.round((page.crop.bottom / 100) * rotH));
        const sw = Math.max(20, ex - sx);
        const sh = Math.max(20, ey - sy);

        // Für kleine Schulbuchschrift und französische Akzente auf optimale Auflösung skalieren
        const minTargetW = 1500;
        const maxTargetW = 2400;
        let scale = 1;
        if (sw < minTargetW) scale = Math.min(2.4, minTargetW / sw);
        else if (sw > maxTargetW) scale = maxTargetW / sw;

        const outCanvas = document.createElement('canvas');
        outCanvas.width = Math.round(sw * scale);
        outCanvas.height = Math.round(sh * scale);
        const oCtx = outCanvas.getContext('2d');
        if (!oCtx) {
          resolve(rotCanvas);
          return;
        }
        oCtx.fillStyle = '#ffffff';
        oCtx.fillRect(0, 0, outCanvas.width, outCanvas.height);
        oCtx.imageSmoothingEnabled = true;
        oCtx.imageSmoothingQuality = 'high';
        oCtx.drawImage(rotCanvas, sx, sy, sw, sh, 0, 0, outCanvas.width, outCanvas.height);
        resolve(outCanvas);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Bild konnte nicht geladen werden.'));
    img.src = page.dataUrl;
  });
}

// Adaptive lokale Beleuchtungskorrektur (Integralbild): entfernt Buchfalz-Schatten & farbige Kästen, bewahrt Akzente
function applyAdaptiveOcrEnhancement(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const outCanvas = document.createElement('canvas');
  outCanvas.width = w;
  outCanvas.height = h;
  const ctx = outCanvas.getContext('2d');
  if (!ctx) return sourceCanvas;

  ctx.drawImage(sourceCanvas, 0, 0);
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const total = w * h;

  const gray = new Uint8Array(total);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    // Rot- und Grünkanal leicht stärker gewichten, damit bläuliche Schulbuch-Boxen heller werden
    gray[p] = Math.round(0.35 * data[i] + 0.55 * data[i + 1] + 0.1 * data[i + 2]);
  }

  // 2D-Integralbild für schnellen lokalen Hintergrund-Mittelwert
  const stride = w + 1;
  const integral = new Float64Array(stride * (h + 1));
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    const srcOffset = y * w;
    const dstOffset = (y + 1) * stride;
    const prevOffset = y * stride;
    for (let x = 0; x < w; x++) {
      rowSum += gray[srcOffset + x];
      integral[dstOffset + x + 1] = integral[prevOffset + x + 1] + rowSum;
    }
  }

  const radius = Math.max(18, Math.min(42, Math.round(w / 48)));

  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(h - 1, y + radius);
    const rowTop = y0 * stride;
    const rowBot = (y1 + 1) * stride;

    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(w - 1, x + radius);
      const area = (x1 - x0 + 1) * (y1 - y0 + 1);
      const sum =
        integral[rowBot + x1 + 1] -
        integral[rowTop + x1 + 1] -
        integral[rowBot + x0] +
        integral[rowTop + x0];
      const localMean = sum / area;
      const lum = gray[y * w + x];
      const diff = localMean - lum;

      // Sanfte adaptive Schärfung statt harter Binarisierung -> dünne Akzente bleiben erhalten
      let v = 255;
      if (diff > 9) {
        v = Math.max(0, Math.round(255 - (diff - 7) * 5.0));
      } else if (lum < 75) {
        v = Math.max(0, Math.round(lum * 0.7));
      }

      const idx = (y * w + x) * 4;
      data[idx] = v;
      data[idx + 1] = v;
      data[idx + 2] = v;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return outCanvas;
}

// Schneidet eine vertikale Spalte aus dem vorbereiteten Seiten-Canvas aus
function sliceColumnCanvas(
  sourceCanvas: HTMLCanvasElement,
  startPct: number,
  endPct: number
): HTMLCanvasElement {
  const sx = Math.max(0, Math.round((startPct / 100) * sourceCanvas.width));
  const ex = Math.min(sourceCanvas.width, Math.round((endPct / 100) * sourceCanvas.width));
  const sw = Math.max(20, ex - sx);
  const pad = 16;

  const canvas = document.createElement('canvas');
  canvas.width = sw + pad * 2;
  canvas.height = sourceCanvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return sourceCanvas;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(sourceCanvas, sx, 0, sw, sourceCanvas.height, pad, 0, sw, sourceCanvas.height);
  return canvas;
}

// Erkennt vertikale Weißraum-Spaltentrenner automatisch im Bild
function autoDetectColumnSplits(
  canvas: HTMLCanvasElement,
  mode: 'two-columns' | 'three-columns'
): { colSplit1: number; colSplit2: number } {
  try {
    const w = canvas.width;
    const h = canvas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx || w < 100 || h < 100) {
      return { colSplit1: mode === 'three-columns' ? 32 : 48, colSplit2: 68 };
    }
    const data = ctx.getImageData(0, 0, w, h).data;
    const yStart = Math.round(h * 0.06);
    const yEnd = Math.round(h * 0.94);
    const bins = 100;
    const density = new Array<number>(bins).fill(0);

    for (let x = 0; x < w; x += 2) {
      const bin = Math.min(bins - 1, Math.floor((x / w) * bins));
      let darkCount = 0;
      for (let y = yStart; y < yEnd; y += 3) {
        const idx = (y * w + x) * 4;
        if (data[idx] < 175) darkCount++;
      }
      density[bin] += darkCount;
    }

    // Glättung über 3 benachbarte Prozent-Spalten
    const smooth = density.map((_, i) => {
      const a = density[Math.max(0, i - 1)];
      const b = density[i];
      const c = density[Math.min(bins - 1, i + 1)];
      return (a + b * 2 + c) / 4;
    });

    const findBestGutter = (minPct: number, maxPct: number, fallback: number): number => {
      let bestIdx = fallback;
      let minVal = Infinity;
      for (let p = minPct; p <= maxPct; p++) {
        // Bevorzuge Mitte bei gleichwertigem Weißraum
        const centerBias = Math.abs(p - fallback) * 0.15;
        const score = smooth[p] + centerBias;
        if (score < minVal) {
          minVal = score;
          bestIdx = p;
        }
      }
      return bestIdx;
    };

    if (mode === 'two-columns') {
      return { colSplit1: findBestGutter(26, 72, 48), colSplit2: 72 };
    }
    const split1 = findBestGutter(20, 46, 32);
    const split2 = findBestGutter(Math.max(split1 + 16, 54), 82, 68);
    return { colSplit1: split1, colSplit2: split2 };
  } catch {
    return { colSplit1: mode === 'three-columns' ? 32 : 48, colSplit2: 68 };
  }
}

interface PositionedOcrLine {
  text: string;
  yCenter: number;
  yTop: number;
  yBottom: number;
  height: number;
  confidence: number;
}

// Extrahiert Zeilen inklusive vertikaler Position (Y) aus einer einzelnen OCR-Spalte
function extractColumnLinesWithY(data: any): PositionedOcrLine[] {
  const rawWords: any[] =
    Array.isArray(data?.words) && data.words.length > 0
      ? data.words
      : Array.isArray(data?.lines)
      ? data.lines.flatMap((l: any) => (Array.isArray(l?.words) ? l.words : []))
      : [];

  if (rawWords.length === 0) return [];

  interface BoxWord {
    text: string;
    x0: number;
    x1: number;
    y0: number;
    y1: number;
    cy: number;
    h: number;
    conf: number;
  }

  const words: BoxWord[] = [];
  for (const w of rawWords) {
    const text = String(w?.text || '').trim();
    const b = w?.bbox;
    if (!text || !b) continue;
    const h = (b.y1 || 0) - (b.y0 || 0);
    const width = (b.x1 || 0) - (b.x0 || 0);
    const conf = typeof w?.confidence === 'number' ? w.confidence : 70;
    if (h < 6 || width < 2) continue;
    if (conf < 42 && !/[a-zA-ZÀ-ÿ]{2,}/.test(text)) continue;
    if (conf < 28) continue;
    words.push({
      text,
      x0: b.x0,
      x1: b.x1,
      y0: b.y0,
      y1: b.y1,
      cy: (b.y0 + b.y1) / 2,
      h,
      conf,
    });
  }

  if (words.length === 0) return [];

  const heights = words.map((w) => w.h).sort((a, b) => a - b);
  const medianH = heights[Math.floor(heights.length / 2)] || 22;

  const sortedByY = [...words].sort((a, b) => a.cy - b.cy);
  const rows: { avgY: number; items: BoxWord[] }[] = [];

  for (const word of sortedByY) {
    let targetRow: { avgY: number; items: BoxWord[] } | null = null;
    let bestDist = Infinity;
    for (const row of rows) {
      const dist = Math.abs(word.cy - row.avgY);
      if (dist <= medianH * 0.65 && dist < bestDist) {
        bestDist = dist;
        targetRow = row;
      }
    }
    if (targetRow) {
      targetRow.items.push(word);
      targetRow.avgY =
        targetRow.items.reduce((acc, it) => acc + it.cy, 0) / targetRow.items.length;
    } else {
      rows.push({ avgY: word.cy, items: [word] });
    }
  }

  rows.sort((a, b) => a.avgY - b.avgY);

  return rows
    .map((row) => {
      const sorted = row.items.sort((a, b) => a.x0 - b.x0);
      const text = sorted.map((w) => w.text).join(' ').replace(/\s+/g, ' ').trim();
      const yTop = Math.min(...sorted.map((w) => w.y0));
      const yBottom = Math.max(...sorted.map((w) => w.y1));
      const avgConf = sorted.reduce((acc, w) => acc + w.conf, 0) / sorted.length;
      return {
        text,
        yCenter: (yTop + yBottom) / 2,
        yTop,
        yBottom,
        height: Math.max(8, yBottom - yTop),
        confidence: avgConf,
      };
    })
    .filter((l) => l.text.length > 0);
}

// Koppelt linke und rechte Spaltenzeilen exakt über ihre vertikale Y-Position (inkl. 2-zeiliger Umbrüche)
function alignTwoColumnLinesToTabText(
  leftLines: PositionedOcrLine[],
  rightLines: PositionedOcrLine[]
): string {
  if (leftLines.length === 0 && rightLines.length === 0) return '';
  const allHeights = [...leftLines, ...rightLines].map((l) => l.height).sort((a, b) => a - b);
  const medianH = allHeights[Math.floor(allHeights.length / 2)] || 24;
  const pairTolerance = Math.max(medianH * 1.45, 22);
  const wrapGapLimit = Math.max(medianH * 0.95, 16);

  const usedRight = new Set<number>();
  const matchedEntries: { yCenter: number; yBottomLeft: number; yBottomRight: number; left: string; right: string }[] = [];

  for (const left of leftLines) {
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let rIdx = 0; rIdx < rightLines.length; rIdx++) {
      if (usedRight.has(rIdx)) continue;
      const dist = Math.abs(left.yCenter - rightLines[rIdx].yCenter);
      if (dist <= pairTolerance && dist < bestDist) {
        bestDist = dist;
        bestIdx = rIdx;
      }
    }

    if (bestIdx !== -1) {
      usedRight.add(bestIdx);
      const right = rightLines[bestIdx];
      matchedEntries.push({
        yCenter: (left.yCenter + right.yCenter) / 2,
        yBottomLeft: left.yBottom,
        yBottomRight: right.yBottom,
        left: left.text,
        right: right.text,
      });
    } else if (
      matchedEntries.length > 0 &&
      left.yTop - matchedEntries[matchedEntries.length - 1].yBottomLeft <= wrapGapLimit &&
      left.yTop >= matchedEntries[matchedEntries.length - 1].yBottomLeft - 4
    ) {
      // Umgebrochene 2. Zeile der linken Spalte anhängen
      const prev = matchedEntries[matchedEntries.length - 1];
      prev.left = `${prev.left} ${left.text}`.trim();
      prev.yBottomLeft = left.yBottom;
    } else {
      matchedEntries.push({
        yCenter: left.yCenter,
        yBottomLeft: left.yBottom,
        yBottomRight: left.yBottom,
        left: left.text,
        right: '',
      });
    }
  }

  // Ungepaarte rechte Zeilen als Fortsetzungszeile an den direkt darüberliegenden Eintrag anhängen
  for (let rIdx = 0; rIdx < rightLines.length; rIdx++) {
    if (usedRight.has(rIdx)) continue;
    const right = rightLines[rIdx];
    let attached = false;
    for (let mIdx = matchedEntries.length - 1; mIdx >= 0; mIdx--) {
      const entry = matchedEntries[mIdx];
      const gap = right.yTop - entry.yBottomRight;
      if (gap >= -6 && gap <= wrapGapLimit && entry.right) {
        entry.right = `${entry.right} ${right.text}`.trim();
        entry.yBottomRight = right.yBottom;
        attached = true;
        break;
      }
    }
    if (!attached) {
      matchedEntries.push({
        yCenter: right.yCenter,
        yBottomLeft: right.yBottom,
        yBottomRight: right.yBottom,
        left: '',
        right: right.text,
      });
    }
  }

  matchedEntries.sort((a, b) => a.yCenter - b.yCenter);
  return matchedEntries
    .map((e) => (e.left && e.right ? `${e.left}\t${e.right}` : e.left || e.right))
    .filter(Boolean)
    .join('\n');
}

// Rekonstruiert Tabellen-Zeilen & Spalten aus den Tesseract-Wortkoordinaten (für Auto-Layout)
function extractStructuredTextFromTesseract(data: any): string {
  const fallback = String(data?.text || '');
  try {
    const rawWords: any[] =
      Array.isArray(data?.words) && data.words.length > 0
        ? data.words
        : Array.isArray(data?.lines)
        ? data.lines.flatMap((l: any) => (Array.isArray(l?.words) ? l.words : []))
        : [];

    if (rawWords.length === 0) return fallback;

    interface BoxWord {
      text: string;
      x0: number;
      x1: number;
      y0: number;
      y1: number;
      cy: number;
      h: number;
      conf: number;
    }

    const words: BoxWord[] = [];
    for (const w of rawWords) {
      const text = String(w?.text || '').trim();
      const b = w?.bbox;
      if (!text || !b) continue;
      const h = (b.y1 || 0) - (b.y0 || 0);
      const width = (b.x1 || 0) - (b.x0 || 0);
      const conf = typeof w?.confidence === 'number' ? w.confidence : 70;
      if (h < 6 || width < 2) continue;
      if (conf < 42 && !/[a-zA-ZÀ-ÿ]{2,}/.test(text)) continue;
      if (conf < 28) continue;
      words.push({
        text,
        x0: b.x0,
        x1: b.x1,
        y0: b.y0,
        y1: b.y1,
        cy: (b.y0 + b.y1) / 2,
        h,
        conf,
      });
    }

    if (words.length < 2) return fallback;

    const heights = words.map((w) => w.h).sort((a, b) => a - b);
    const medianH = heights[Math.floor(heights.length / 2)] || 20;
    const avgCharW = Math.max(5, medianH * 0.52);
    const columnGapThreshold = Math.max(medianH * 1.45, avgCharW * 2.8);

    const sortedByY = [...words].sort((a, b) => a.cy - b.cy);
    const rows: { avgY: number; items: BoxWord[] }[] = [];

    for (const word of sortedByY) {
      let targetRow: { avgY: number; items: BoxWord[] } | null = null;
      let bestDist = Infinity;
      for (const row of rows) {
        const dist = Math.abs(word.cy - row.avgY);
        if (dist <= medianH * 0.62 && dist < bestDist) {
          bestDist = dist;
          targetRow = row;
        }
      }
      if (targetRow) {
        targetRow.items.push(word);
        targetRow.avgY =
          targetRow.items.reduce((acc, it) => acc + it.cy, 0) / targetRow.items.length;
      } else {
        rows.push({ avgY: word.cy, items: [word] });
      }
    }

    rows.sort((a, b) => a.avgY - b.avgY);

    const reconstructedLines = rows.map((row) => {
      const sorted = row.items.sort((a, b) => a.x0 - b.x0);
      let out = '';
      for (let i = 0; i < sorted.length; i++) {
        if (i > 0) {
          const gap = sorted[i].x0 - sorted[i - 1].x1;
          out += gap >= columnGapThreshold ? '\t' : ' ';
        }
        out += sorted[i].text;
      }
      return out.trim();
    });

    const joined = reconstructedLines.filter(Boolean).join('\n');
    return joined.split('\n').length >= 2 ? joined : fallback;
  } catch {
    return fallback;
  }
}

function detectFrenchScore(text: string): number {
  let score = 0;
  const trimmed = text.trim();
  const lower = ` ${trimmed.toLowerCase()} `;

  const frAccents = trimmed.match(/[éèêëàâçîïôùûœæ]/gi);
  if (frAccents) score += frAccents.length * 4;

  const deChars = trimmed.match(/[äöüß]/gi);
  if (deChars) score -= deChars.length * 5;

  if (/^(le|la|les|un|une|des|du|au|aux)\s+/i.test(trimmed)) score += 5;
  if (/\bl'|\bd'|\bs'|\bqu'|\bj'|\bn'/.test(lower)) score += 5;
  if (
    /\b(le|la|les|un|une|des|du|au|aux|je|tu|il|elle|nous|vous|ils|elles|être|avoir|faire|aller|avec|pour|dans|sur|sous|très|plus|pas|ne|se|de|en|et|ou|mais|qui|que|quoi|qc|qn|quelque|quelqu'un)\b/.test(
      lower
    )
  ) {
    score += 3;
  }

  if (/\b\w+(tion|ment|eux|euse|oir|eau|eaux|age|ique|isme|ette|ille|ance|ence)\b/i.test(lower)) {
    score += 2;
  }
  if (/\b[a-zà-ÿ]{3,}(er|ir|re)\b/.test(trimmed) && !/^[A-Z]/.test(trimmed)) {
    score += 1.5;
  }

  if (/^(der|die|das|ein|eine|einen|einem|einer|sich|etwas|jemand|jemanden|jemandem)\s+/i.test(trimmed)) {
    score -= 6;
  }
  if (
    /\b(der|die|das|ein|eine|und|oder|nicht|sein|haben|werden|mit|für|auf|aus|bei|nach|von|zu|zum|zur|sehr|immer|auch|sich|etw\.|jdn\.|jdm\.)\b/.test(
      lower
    )
  ) {
    score -= 3;
  }

  if (/\b\w+(ung|heit|keit|schaft|chen|lein|isch|lich|ig|ieren)\b/i.test(lower)) {
    score -= 3;
  }
  if (/(sch|tz|ck|pf|sp|st)/i.test(trimmed)) {
    score -= 1.5;
  }

  const words = trimmed.split(/\s+/);
  if (words.length >= 2 && /^[A-ZÄÖÜ][a-zäöüß]{2,}/.test(words[1])) {
    score -= 2.5;
  }
  if (words.length === 1 && /^[A-ZÄÖÜ][a-zäöüß]{2,}$/.test(trimmed) && !frAccents) {
    score -= 1.5;
  }

  return score;
}

const IPA_CHAR_REGEX = /[ɑɛɔøəʃʒʁɲɥː̃ˈˌɪʊʌθðŋ]/;

function cleanVocabToken(raw: string, removePhonetics: boolean): string {
  let s = raw;

  if (removePhonetics) {
    // Lautschrift in [ ... ], / ... / oder fehlerhaft erkannte Klammern mit IPA-Zeichen entfernen
    s = s.replace(/\[[^\]]{1,50}\]/g, ' ');
    s = s.replace(/(?:^|\s)\/[^/\s][^/]{1,40}\/(?=\s|$)/g, ' ');
    s = s.replace(/\([^)]*[ɑɛɔøəʃʒʁɲɥː̃ˈˌɪʊʌθðŋ][^)]*\)/g, ' ');
    // Einzelne freistehende IPA-Wörter entfernen
    s = s
      .split(/\s+/)
      .filter((tok) => !IPA_CHAR_REGEX.test(tok))
      .join(' ');
  }

  // Schulbuch-Querverweise wie (S. 14), (p. 22), → L2, → S. 12 entfernen
  s = s.replace(/\(\s*(?:s\.|p\.|seite|page|u|l)\s*\d{1,3}\s*\)/gi, ' ');
  s = s.replace(/[→⇒]\s*(?:s\.|p\.|l|u|g)?\s*\d{0,3}[a-z]?/gi, ' ');

  // Typografische Apostrophe vereinheitlichen & typische OCR-Leerzeichen nach Apostroph korrigieren
  s = s.replace(/[’`´‘]/g, "'");
  s = s.replace(/\b([ldsjncqm]|qu)'\s+([a-zà-ÿ])/gi, "$1'$2");

  // Führende Symbole, Sterne, Aufzählungen, Nummerierungen entfernen
  s = s.replace(/^[\s•·▪▫►▸▻➤➢★☆♦◆●○■□\-–—|_=*+~°©®§<>\\]+/, '');
  s = s.replace(/^\d{1,3}[.)\]]\s+/, '');
  s = s.replace(/^[a-z]\)\s+/i, '');

  // Abschließende Störzeichen entfernen
  s = s.replace(/[\s|_=•·▪►★☆♦◆●○<>\\]+$/, '');

  // Mehrfache Satzzeichen & Leerzeichen normalisieren
  s = s.replace(/\s+([,.;:!?])/g, '$1');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

function isNoiseOrHeaderLine(line: string, filterGrammarBoxes: boolean): string | null {
  const t = line.trim();
  if (t.length < 2) return 'Zu kurz / Rauschen';

  const letters = (t.match(/[a-zA-ZÀ-ÿ]/g) || []).length;
  const digits = (t.match(/\d/g) || []).length;
  const nonSpace = t.replace(/\s/g, '').length;

  if (letters < 2) return 'Keine Buchstaben / nur Symbole';
  if (nonSpace > 0 && letters / nonSpace < 0.5) return 'Zu viele Zahlen oder Sonderzeichen';
  if (digits > 2 && digits >= letters * 0.4) return 'Überwiegend Zahlen / Seitenzahlen';
  if (/^\d{1,4}\s*[-–/]\s*\d{1,4}$/.test(t)) return 'Seitenzahl / Bereich';
  if (
    /(https?:\/\/|www\.|@|isbn|©|®|klett|cornelsen|westermann|diesterweg|schöningh|découvertes|à plus|tous ensemble|\bp\.?\s*\d{1,3}$|\bs\.?\s*\d{1,3}$)/i.test(
      t
    )
  ) {
    return 'Verlags-/Fußzeile oder Seitenverweis';
  }

  // Schulbuch-Überschriften & Metazeilen
  if (
    /^(seite|page|kapitel|lektion|leçon|unité|volet|atelier|bilan|plateau|approches|séquence|module|vocabulaire|vokabeln|wortschatz|deutsch|französisch|français|allemand|grammaire|grammatik|exercice|übung|aufgabe|merke|achtung|remarque|attention|tipp|info|lernwortschatz|fakultativ|en plus|stratégie|méthode|cahier|hörverstehen|leseverstehen|partnerarbeit|tandem)\b/i.test(
      t
    ) &&
    t.split(/\s+/).length <= 7
  ) {
    return 'Überschrift / Kapitelangabe';
  }

  // Tabellenkopfzeile
  if (
    /^(französisch|français|deutsch|allemand|wort|vokabel)[\s\t|/-]+(beispiel|beispielsatz|exemple|deutsch|allemand|französisch|français|übersetzung)/i.test(
      t
    )
  ) {
    return 'Tabellenkopf';
  }

  // Grammatik- & Konjugationskästen
  if (
    filterGrammarBoxes &&
    /\b(präsens|passé composé|imparfait|futur|subjonctif|conditionnel|impératif|infinitif|participe|singular|plural|maskulin|feminin|unregelmäßig|irrégulier|konjugation|verben auf -er|verben auf -ir|verben auf -re|je\s*\/\s*tu|nous\s*\/\s*vous)\b/i.test(
      t
    )
  ) {
    return 'Grammatik- / Konjugationshinweis';
  }

  // Einzelne Register-Buchstaben oder römische Ziffern
  if (/^([A-Z0-9]{1,3}|[IVX]{1,4})$/.test(t)) return 'Abschnittsmarkierung';

  return null;
}

function isLikelyExampleSentence(text: string, strictness: ScannerFilterOptions['strictness']): boolean {
  const t = text.trim();
  const words = t.split(/\s+/).filter(Boolean);
  const maxWordsWithPunct = strictness === 'strict' ? 4 : strictness === 'medium' ? 6 : 9;
  const maxWordsAny = strictness === 'strict' ? 7 : strictness === 'medium' ? 9 : 13;

  // Abkürzungen am Ende (etw., jdn., jdm., qc., qn., m., f., pl., sg.) sind keine Satzpunkte
  const endsWithRealSentencePunct =
    /[!?»"]$/.test(t) ||
    (/\.$/.test(t) && !/\b(etw|jdn|jdm|jds|qc|qn|pl|sg|m|f|usw|bzw|etc|ca|z\.b|bsp)\.$/i.test(t));

  if (words.length >= maxWordsWithPunct && endsWithRealSentencePunct) return true;
  if (words.length >= maxWordsAny) return true;
  if (/^[A-ZÀ-Ÿ][a-zà-ÿ]{1,12}:\s+/.test(t) && words.length >= 3) return true;
  if (/[«»„“"]/.test(t) && words.length >= 4) return true;
  return false;
}

// Prüft eine einzelne Vokabelseite auf OCR-Müll und Plausibilität
function getPhraseRejectionReason(
  text: string,
  lang: 'de' | 'fr',
  strictness: ScannerFilterOptions['strictness']
): string | null {
  const t = text.trim();
  if (!t) return 'Leer';

  const letters = (t.match(/[a-zA-ZÀ-ÿ]/g) || []).length;
  const nonSpace = t.replace(/\s/g, '').length;

  // Einzelzeichen sind fast immer Rauschen (Ausnahme im Französischen: "à", "y")
  if (letters < 2 && !(lang === 'fr' && /^(à|y)$/i.test(t))) {
    return 'Zu kurzes Fragment';
  }

  // OCR-Müllzeichen (Balken, geschweifte Klammern, Währungen, Sonderzeichen)
  if (/[\\<>{}|^~§$€@#_•▪►]/.test(t)) {
    return 'Enthält OCR-Sonderzeichen/Müll';
  }

  // Zu geringer Buchstabenanteil
  const minLetterRatio = strictness === 'strict' ? 0.65 : strictness === 'medium' ? 0.55 : 0.4;
  if (nonSpace > 0 && letters / nonSpace < minLetterRatio) {
    return 'Zu wenig Buchstaben (OCR-Rauschen)';
  }

  // Gemischte Buchstaben-Zahlen-Wörter wie "m4ison", "12a", "v0ir"
  if (/[a-zA-ZÀ-ÿ]\d|\d[a-zA-ZÀ-ÿ]/.test(t)) {
    return 'Ziffern im Wort (OCR-Fehler)';
  }

  // 4+ identische Zeichen hintereinander (z.B. "llll", "....", "----")
  if (/(.)\1{3,}/.test(t)) {
    return 'Wiederholte Zeichen (OCR-Rauschen)';
  }

  const words = t.split(/\s+/).filter(Boolean);

  // Zu viele 1-Zeichen-Fragmente (typisches Rauschen von Bildern/Grafiken)
  const singleCharTokens = words.filter(
    (w) => w.replace(/[^a-zA-ZÀ-ÿ]/g, '').length === 1 && !/^(à|y|a)$/i.test(w)
  );
  if (singleCharTokens.length >= 2 && singleCharTokens.length / words.length >= 0.45) {
    return 'Zerstückelte Einzelbuchstaben (OCR-Rauschen)';
  }

  if (strictness === 'strict') {
    // Mitten im Wort plötzlich Großbuchstaben ("maIson", "sChule") -> fast immer OCR-Dreck
    const hasWeirdInternalCaps = words.some((w) => {
      const clean = w.replace(/^[^a-zA-ZÀ-ÿ]+|[^a-zA-ZÀ-ÿ]+$/g, '');
      if (clean.length < 3 || clean.includes("'") || clean.includes('-')) return false;
      if (/^[A-ZÄÖÜ]{2,4}$/.test(clean)) return false; // Gültige Kürzel wie TV, CD, USA
      return /^[a-zà-ÿ]+[A-ZÀ-Ÿ]/.test(clean);
    });
    if (hasWeirdInternalCaps) {
      return 'Fehlerhafte Groß-/Kleinschreibung (OCR-Rauschen)';
    }

    // Unmögliche Konsonantenketten (ohne gültige deutsche Cluster wie sch/ch/ck/tz/pf/ng/str)
    const strippedClusters = t
      .toLowerCase()
      .replace(/(tsch|schl|schr|schw|sch|chs|cht|str|spr|ck|tz|pf|ng|ch|ph|th|gn|ll|rr)/g, 'k');
    if (/[bcdfghjklmnpqrstvwxz]{5,}/.test(strippedClusters)) {
      return 'Unplausible Buchstabenfolge (OCR-Fehler)';
    }
  }

  return null;
}

// Erkennt Sprachgrenze, falls OCR zwei Spalten ohne Tab zusammengezogen hat (z.B. "la maison das Haus")
function splitByLanguageBoundary(line: string): [string, string] | null {
  const tokens = line.trim().split(/\s+/);
  if (tokens.length < 2 || tokens.length > 10) return null;

  const deStarters = new Set([
    'der', 'die', 'das', 'ein', 'eine', 'einen', 'einem', 'einer', 'sich', 'etw.', 'jdn.', 'jdm.',
  ]);
  const frStarters = new Set([
    'le', 'la', 'les', 'un', 'une', 'des', 'du', 'au', 'aux', 'se',
  ]);

  let bestSplit: { idx: number; contrast: number } | null = null;

  for (let i = 1; i < tokens.length; i++) {
    const left = tokens.slice(0, i).join(' ');
    const right = tokens.slice(i).join(' ');
    const rightFirst = tokens[i].toLowerCase();

    const leftScore = detectFrenchScore(left);
    const rightScore = detectFrenchScore(right);

    const oppositeSigns =
      (leftScore >= 2 && rightScore <= -2) || (leftScore <= -2 && rightScore >= 2);
    const hasBoundaryStarter =
      (leftScore > 0 && deStarters.has(rightFirst)) ||
      (leftScore < 0 && (frStarters.has(rightFirst) || /^(l'|s'|d')/i.test(rightFirst)));

    if (oppositeSigns || hasBoundaryStarter) {
      const contrast = Math.abs(leftScore - rightScore) + (hasBoundaryStarter ? 3 : 0);
      if (contrast >= 5 && (!bestSplit || contrast > bestSplit.contrast)) {
        bestSplit = { idx: i, contrast };
      }
    }
  }

  if (!bestSplit) return null;
  return [
    tokens.slice(0, bestSplit.idx).join(' '),
    tokens.slice(bestSplit.idx).join(' '),
  ];
}

function splitAlternatives(raw: string, removePhonetics: boolean): { main: string; alts: string[] } {
  const cleaned = cleanVocabToken(raw, removePhonetics);
  if (!cleaned) return { main: '', alts: [] };
  const parts = cleaned
    .split(/\s*[;/]\s*/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  return {
    main: parts[0] || '',
    alts: parts.slice(1),
  };
}

function parseOcrTextToVocab(
  rawText: string,
  partialOptions?: Partial<ScannerFilterOptions>
): OcrParseResult {
  const opts: ScannerFilterOptions = { ...DEFAULT_SCANNER_FILTERS, ...(partialOptions || {}) };
  const rawLines = rawText
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+$/g, ''))
    .filter((l) => l.trim().length > 0);

  const pairs: ScannedPair[] = [];
  const filteredOut: FilteredOutLine[] = [];
  const seenKeys = new Set<string>();

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();

    if (opts.filterNoiseAndHeaders) {
      const noiseReason = isNoiseOrHeaderLine(trimmed, opts.filterGrammarBoxes);
      if (noiseReason) {
        filteredOut.push({ id: generateId(), raw: trimmed, reason: noiseReason });
        continue;
      }
    }

    // 1. Spalten anhand von Tabs, expliziten Trennern oder größeren Abständen aufteilen
    let columns: string[] = [];
    if (trimmed.includes('\t')) {
      columns = trimmed
        .split(/\t+/)
        .map((c) => cleanVocabToken(c, opts.removePhonetics))
        .filter(Boolean);
    } else {
      const sepMatch =
        trimmed.match(/^(.+?)\s+[–—=|:]{1}\s+(.+)$/) ||
        trimmed.match(/^(.+?)\s+-\s+(.+)$/) ||
        trimmed.match(/^(.+?)\s{2,}(.+)$/);

      if (sepMatch) {
        columns = [sepMatch[1], sepMatch[2]]
          .map((c) => cleanVocabToken(c, opts.removePhonetics))
          .filter(Boolean);
      } else {
        const cleanedWhole = cleanVocabToken(trimmed, opts.removePhonetics);
        if (!cleanedWhole) {
          filteredOut.push({ id: generateId(), raw: trimmed, reason: 'Nur Lautschrift / Leer nach Bereinigung' });
          continue;
        }
        const boundary = splitByLanguageBoundary(cleanedWhole);
        if (boundary) {
          columns = boundary;
        } else {
          columns = [cleanedWhole];
        }
      }
    }

    // Spalten auf Beispielsätze prüfen (besonders wirksam bei 3-Spalten-Schulbuchseiten)
    if (opts.filterExampleSentences && columns.length >= 2) {
      const nonSentenceCols = columns.filter((c) => !isLikelyExampleSentence(c, opts.strictness));
      if (nonSentenceCols.length >= 2) {
        columns = nonSentenceCols;
      }
    }

    // Nur 1 Spalte erkannt -> kein Übersetzungspartner
    if (columns.length < 2) {
      const single = columns[0] || '';
      if (opts.filterExampleSentences && isLikelyExampleSentence(single, opts.strictness)) {
        filteredOut.push({ id: generateId(), raw: trimmed, reason: 'Beispielsatz / Fließtext' });
        continue;
      }
      if (opts.onlyCompletePairs) {
        filteredOut.push({
          id: generateId(),
          raw: trimmed,
          reason: 'Kein Übersetzungspartner erkannt',
        });
        continue;
      }

      const score = detectFrenchScore(single);
      const splitSingle = splitAlternatives(single, opts.removePhonetics);
      if (splitSingle.main) {
        pairs.push({
          id: generateId(),
          de: score > 0 ? '' : splitSingle.main,
          fr: score > 0 ? splitSingle.main : '',
          altDe: score > 0 ? '' : splitSingle.alts.join('; '),
          altFr: score > 0 ? splitSingle.alts.join('; ') : '',
          warning: 'Übersetzung fehlt – bitte ergänzen',
        });
      }
      continue;
    }

    // Bei >= 3 Spalten die beiden plausibelsten Vokabelspalten wählen (Mittelspalte = oft Beispielsatz)
    let leftRaw = columns[0];
    let rightRaw = columns[1];
    if (columns.length >= 3) {
      if (opts.columnOrder === 'auto') {
        const scored = columns.map((c) => ({ text: c, score: detectFrenchScore(c) }));
        const bestFr = [...scored].sort((a, b) => b.score - a.score)[0];
        const bestDe = [...scored].filter((s) => s !== bestFr).sort((a, b) => a.score - b.score)[0];
        if (bestFr && bestDe) {
          leftRaw = bestDe.text;
          rightRaw = bestFr.text;
        }
      } else {
        leftRaw = columns[0];
        rightRaw = columns[columns.length - 1];
      }
    }

    // Beispielsatz-Check für eine oder beide Seiten
    if (opts.filterExampleSentences) {
      const leftSent = isLikelyExampleSentence(leftRaw, opts.strictness);
      const rightSent = isLikelyExampleSentence(rightRaw, opts.strictness);
      if ((opts.strictness === 'strict' && (leftSent || rightSent)) || (leftSent && rightSent)) {
        filteredOut.push({ id: generateId(), raw: trimmed, reason: 'Beispielsatz / zu langer Satz' });
        continue;
      }
    }

    // Sprachzuordnung (Deutsch vs. Französisch)
    let deRaw = leftRaw;
    let frRaw = rightRaw;
    let warning: string | undefined;

    const leftScore = detectFrenchScore(leftRaw);
    const rightScore = detectFrenchScore(rightRaw);

    if (opts.columnOrder === 'fr-de') {
      frRaw = leftRaw;
      deRaw = rightRaw;
    } else if (opts.columnOrder === 'de-fr') {
      deRaw = leftRaw;
      frRaw = rightRaw;
    } else {
      if (leftScore > rightScore) {
        frRaw = leftRaw;
        deRaw = rightRaw;
      } else if (leftScore === rightScore) {
        warning = 'Sprache unsicher – bitte Zuordnung prüfen';
      }
    }

    // Im strengen Modus Paare aussortieren, bei denen BEIDE Seiten eindeutig dieselbe Sprache sind (z.B. geteilter Fließtext)
    if (
      opts.strictness === 'strict' &&
      opts.filterNoiseAndHeaders &&
      ((leftScore >= 5 && rightScore >= 5) || (leftScore <= -5 && rightScore <= -5))
    ) {
      filteredOut.push({
        id: generateId(),
        raw: trimmed,
        reason: 'Beide Spalten sind dieselbe Sprache (Fließtext/Beispiel)',
      });
      continue;
    }

    const deSplit = splitAlternatives(deRaw, opts.removePhonetics);
    const frSplit = splitAlternatives(frRaw, opts.removePhonetics);

    if (!deSplit.main && !frSplit.main) {
      filteredOut.push({ id: generateId(), raw: trimmed, reason: 'Leer nach Bereinigung' });
      continue;
    }

    if (opts.onlyCompletePairs && (!deSplit.main || !frSplit.main)) {
      filteredOut.push({ id: generateId(), raw: trimmed, reason: 'Unvollständiges Paar' });
      continue;
    }

    // Jede einzelne Seite nochmals auf Überschrift/Grammatik/OCR-Müll prüfen
    if (opts.filterNoiseAndHeaders) {
      const deNoise = isNoiseOrHeaderLine(deSplit.main, opts.filterGrammarBoxes);
      const frNoise = isNoiseOrHeaderLine(frSplit.main, opts.filterGrammarBoxes);
      if (deNoise || frNoise) {
        filteredOut.push({ id: generateId(), raw: trimmed, reason: deNoise || frNoise || 'Störtext' });
        continue;
      }

      const deReject = getPhraseRejectionReason(deSplit.main, 'de', opts.strictness);
      const frReject = getPhraseRejectionReason(frSplit.main, 'fr', opts.strictness);
      if (deReject || frReject) {
        filteredOut.push({ id: generateId(), raw: trimmed, reason: deReject || frReject || 'OCR-Rauschen' });
        continue;
      }
    }

    // Identische Wörter auf beiden Seiten (im strengen Modus filtern, sonst warnen)
    if (deSplit.main.toLowerCase() === frSplit.main.toLowerCase()) {
      if (opts.strictness === 'strict' && deSplit.main.length <= 4) {
        filteredOut.push({ id: generateId(), raw: trimmed, reason: 'Identisches Kurzfragment' });
        continue;
      }
      warning = warning || 'Beide Seiten identisch – bitte prüfen';
    }

    const dedupKey = `${deSplit.main.toLowerCase()}|${frSplit.main.toLowerCase()}`;
    if (opts.deduplicate && seenKeys.has(dedupKey)) {
      filteredOut.push({ id: generateId(), raw: trimmed, reason: 'Duplikat entfernt' });
      continue;
    }
    seenKeys.add(dedupKey);

    pairs.push({
      id: generateId(),
      de: deSplit.main,
      fr: frSplit.main,
      altDe: deSplit.alts.join('; '),
      altFr: frSplit.alts.join('; '),
      warning,
    });
  }

  return { pairs, filteredOut };
}

// ============================================================================
// 6B. OPTIONALE KI-ÜBERARBEITUNG (GEMINI) FÜR RECHTSCHREIBUNG & FEHLENDE VOKABELN
// ============================================================================

async function renderPageToCompactJpegBase64(
  page: ScannedPageItem,
  maxWidth: number = 1280
): Promise<string> {
  const croppedCanvas = await renderCroppedPageCanvas(page);
  const scale = croppedCanvas.width > maxWidth ? maxWidth / croppedCanvas.width : 1;
  const outCanvas = document.createElement('canvas');
  outCanvas.width = Math.max(1, Math.round(croppedCanvas.width * scale));
  outCanvas.height = Math.max(1, Math.round(croppedCanvas.height * scale));
  const ctx = outCanvas.getContext('2d');
  if (!ctx) {
    return croppedCanvas.toDataURL('image/jpeg', 0.8).split(',')[1] || '';
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);
  ctx.drawImage(croppedCanvas, 0, 0, outCanvas.width, outCanvas.height);
  return outCanvas.toDataURL('image/jpeg', 0.8).split(',')[1] || '';
}

async function fetchWithExponentialBackoff(
  url: string,
  options: RequestInit,
  maxRetries: number = 5
): Promise<Response> {
  let delayMs = 1000;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (response.status !== 429 && response.status < 500) {
        return response;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (err) {
      lastError = err;
    }
    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs *= 2;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('Anfrage an die KI-Überarbeitung fehlgeschlagen.');
}

async function reviewScannedVocabsWithAI(params: {
  pages: ScannedPageItem[];
  currentPairs: ScannedPair[];
  rawOcrText: string;
  filteredOut: FilteredOutLine[];
  filterOptions: ScannerFilterOptions;
  apiKey?: string;
}): Promise<{ pairs: ScannedPair[]; summary: string }> {
  const apiKey = (params.apiKey || '').trim();
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

  // Bis zu 6 Seiten als kompakte JPEGs mitschicken, damit fehlende Wörter direkt vom Foto ergänzt werden können
  const pagesToSend = params.pages.slice(0, 6);
  const maxImgWidth = pagesToSend.length > 3 ? 1024 : 1280;
  const imageParts: Array<{ inlineData: { mimeType: string; data: string } }> = [];

  for (const page of pagesToSend) {
    try {
      const base64 = await renderPageToCompactJpegBase64(page, maxImgWidth);
      if (base64) {
        imageParts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64,
          },
        });
      }
    } catch {
      // Falls einzelnes Bild nicht konvertierbar ist, restliche Daten trotzdem prüfen
    }
  }

  const systemPrompt = [
    'Du bist ein äußerst sorgfältiger Korrektor für eingescannte deutsch-französische Vokabellisten (Schulbuchseiten, Arbeitsblätter, PDFs).',
    'Deine Aufgaben:',
    '1. Korrigiere OCR-Rechtschreibfehler in Deutsch und Französisch (z.B. fehlende oder falsche Akzente é, è, ê, ë, à, â, ç, î, ï, ô, ù, û, ü, œ, æ, falsche Apostrophe l\' / d\' / s\', verwechselte Buchstaben wie rn/m, l/I, 0/o sowie falsche Groß-/Kleinschreibung).',
    '2. Wenn Fotos der Seiten beigefügt sind, vergleiche die OCR-Liste Zeile für Zeile mit den Fotos und ergänze fehlende Vokabelpaare, die beim lokalen Scan übersehen oder versehentlich herausgefiltert wurden.',
    '3. Behalte Artikel (le, la, les, un, une, l\', der, die, das) und alternative Übersetzungen (getrennt durch "; " in altDe/altFr) exakt bei.',
    '4. Entferne verbleibenden Störtext: Überschriften, Seitenzahlen, Lautschrift in [...] oder /.../, Grammatikhinweise und reine Beispielsätze.',
    '5. Stelle sicher, dass Deutsch immer im Feld "de" und Französisch immer im Feld "fr" steht.',
    '6. STRENGE REGEL: Erfinde NIEMALS Vokabeln oder Übersetzungen, die nicht tatsächlich auf den Fotos oder im OCR-Text vorkommen.',
    '7. Gib im Feld "note" nur dann einen kurzen deutschen Hinweis an (max. 65 Zeichen), wenn du einen Eintrag korrigiert oder neu ergänzt hast (z.B. "Korrigiert: la ma1son → la maison" oder "Aus Foto ergänzt"). Wenn der Eintrag unverändert übernommen wurde, lasse "note" leer ("").',
  ].join('\n');

  const compactCurrent = params.currentPairs.map((p) => ({
    de: p.de,
    fr: p.fr,
    altDe: p.altDe,
    altFr: p.altFr,
  }));

  const compactFiltered = params.filteredOut.slice(0, 80).map((f) => f.raw);

  const userPrompt = [
    `Eingestelltes Layout: ${
      params.filterOptions.layoutMode === 'three-columns'
        ? '3 Spalten (Mittelspalte enthält Beispielsätze und soll ignoriert werden)'
        : params.filterOptions.layoutMode === 'two-columns'
        ? '2 Spalten'
        : 'Automatisch'
    }, Spaltenrichtung: ${params.filterOptions.columnOrder}.`,
    '',
    'Aktuell erkannte Vokabelpaare (JSON):',
    JSON.stringify(compactCurrent),
    compactFiltered.length > 0
      ? `\nVom lokalen Filter aussortierte Zeilen (nur übernehmen, falls echte Vokabeln darunter sind):\n${compactFiltered.join('\n')}`
      : '',
    params.rawOcrText.trim()
      ? `\nOCR-Rohtext (Auszug):\n${params.rawOcrText.trim().slice(0, 6000)}`
      : '',
    '',
    'Bitte liefere die bereinigte, korrigierte und vervollständigte Vokabelliste als JSON gemäß Schema zurück.',
  ]
    .filter(Boolean)
    .join('\n');

  const payload = {
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }, ...imageParts],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          pairs: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                de: { type: 'STRING' },
                fr: { type: 'STRING' },
                altDe: { type: 'STRING' },
                altFr: { type: 'STRING' },
                note: { type: 'STRING' },
              },
              required: ['de', 'fr'],
              propertyOrdering: ['de', 'fr', 'altDe', 'altFr', 'note'],
            },
          },
          summary: { type: 'STRING' },
        },
        required: ['pairs', 'summary'],
        propertyOrdering: ['pairs', 'summary'],
      },
    },
  };

  const response = await fetchWithExponentialBackoff(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if ((response.status === 400 || response.status === 401 || response.status === 403) && !apiKey) {
      throw new Error(
        'Für die KI-Überarbeitung auf einer eigenen Webseite bitte deinen kostenlosen Gemini API-Key in den Einstellungen hinterlegen.'
      );
    }
    if (response.status === 400 || response.status === 401 || response.status === 403) {
      throw new Error(
        'Der hinterlegte Gemini API-Key wurde abgelehnt. Bitte prüfe den Key in den Einstellungen.'
      );
    }
    throw new Error(`KI-Überarbeitung nicht verfügbar (Status ${response.status}).`);
  }

  const result = await response.json();
  const rawJson = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawJson) {
    throw new Error('Die KI hat keine auswertbare Antwort zurückgegeben.');
  }

  const parsed = JSON.parse(rawJson) as {
    pairs?: Array<{ de?: string; fr?: string; altDe?: string; altFr?: string; note?: string }>;
    summary?: string;
  };

  const seen = new Set<string>();
  const cleanedPairs: ScannedPair[] = [];

  for (const item of parsed.pairs || []) {
    const de = String(item.de || '').trim();
    const fr = String(item.fr || '').trim();
    if (!de && !fr) continue;
    const dedupKey = `${de.toLowerCase()}|${fr.toLowerCase()}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    cleanedPairs.push({
      id: generateId(),
      de,
      fr,
      altDe: String(item.altDe || '').trim(),
      altFr: String(item.altFr || '').trim(),
      warning: !de || !fr ? 'Unvollständiges Paar – bitte ergänzen' : undefined,
      aiNote: String(item.note || '').trim() || undefined,
    });
  }

  return {
    pairs: cleanedPairs,
    summary:
      String(parsed.summary || '').trim() ||
      `${cleanedPairs.length} Vokabelpaare erfolgreich überarbeitet.`,
  };
}

// ============================================================================
// 7. WIEDERVERWENDBARE UI-KOMPONENTEN & ERROR BOUNDARY
// ============================================================================

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMsg: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMsg: error?.message || 'Unbekannter Fehler' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 text-slate-900">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-lg space-y-4">
            <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
            <h2 className="text-xl font-black">Ein unerwarteter Fehler ist aufgetreten</h2>
            <p className="text-sm text-slate-500">{this.state.errorMsg}</p>
            <button
              onClick={() => this.setState({ hasError: false, errorMsg: '' })}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm"
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const StatusBadge: React.FC<{ status: VocabStatus }> = ({ status }) => {
  const styles: Record<VocabStatus, { label: string; cls: string }> = {
    new: {
      label: 'Neu',
      cls: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
    },
    learning: {
      label: 'In Arbeit',
      cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    },
    hard: {
      label: 'Schwierig',
      cls: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
    },
    mastered: {
      label: 'Beherrscht',
      cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    },
  };
  const cfg = styles[status] || styles.new;
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

const FrenchAccentBar: React.FC<{
  dark: boolean;
  onInsert: (ch: string) => void;
}> = ({ dark, onInsert }) => (
  <div className="flex flex-wrap gap-1.5 pt-2">
    {FRENCH_CHARS.map((ch) => (
      <button
        key={ch}
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onInsert(ch)}
        className={`w-9 h-9 rounded-xl font-bold text-sm border transition-all active:scale-95 ${
          dark
            ? 'bg-slate-800 border-slate-700 hover:bg-indigo-600 hover:text-white text-slate-100'
            : 'bg-white border-slate-200 hover:bg-indigo-600 hover:text-white text-slate-800 shadow-xs'
        }`}
      >
        {ch}
      </button>
    ))}
  </div>
);

const ToastContainer: React.FC<{
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;
  return (
    <div className="no-print fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-2xl shadow-xl border text-sm font-bold flex items-center justify-between gap-3 animate-fadeIn ${
            t.type === 'success'
              ? 'bg-emerald-600 border-emerald-500 text-white'
              : t.type === 'error'
              ? 'bg-rose-600 border-rose-500 text-white'
              : 'bg-slate-900 border-slate-700 text-white'
          }`}
        >
          <span>{t.text}</span>
          <button onClick={() => onDismiss(t.id)} className="opacity-80 hover:opacity-100 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

const ConfirmDialog: React.FC<{
  dark: boolean;
  dialog: ConfirmDialogState | null;
  onClose: () => void;
}> = ({ dark, dialog, onClose }) => {
  if (!dialog) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border ${
          dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
        }`}
      >
        <h3 className="text-xl font-black mb-2">{dialog.title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{dialog.message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold ${
              dark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'
            }`}
          >
            Abbrechen
          </button>
          <button
            onClick={() => {
              dialog.onConfirm();
              onClose();
            }}
            className={`px-5 py-2.5 rounded-xl text-sm font-extrabold text-white ${
              dialog.danger
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {dialog.confirmLabel || 'Bestätigen'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 8. STARTSEITE / DASHBOARD
// ============================================================================

const DashboardView: React.FC<{
  dark: boolean;
  lessons: LessonItem[];
  vocabs: VocabItem[];
  stats: UserStats;
  settings: AppSettings;
  onNavigate: (tab: NavTab) => void;
  onStartQuickLearn: () => void;
  onPracticeMistakes: () => void;
  onStartQuizForLesson: (lessonId: string) => void;
}> = ({
  dark,
  lessons,
  vocabs,
  stats,
  settings,
  onNavigate,
  onStartQuickLearn,
  onPracticeMistakes,
  onStartQuizForLesson,
}) => {
  const today = stats.dailyHistory[getTodayKey()] || {
    studied: 0,
    correct: 0,
    wrong: 0,
    seconds: 0,
    points: 0,
  };
  const dailyPct = Math.min(100, Math.round((today.studied / Math.max(1, settings.dailyGoal)) * 100));
  const masteredCount = vocabs.filter((v) => v.status === 'mastered').length;
  const hardCount = vocabs.filter((v) => v.status === 'hard').length;
  const dueCount = vocabs.filter((v) => v.nextReview <= Date.now() || v.status === 'new').length;
  const masteryPct = vocabs.length > 0 ? Math.round((masteredCount / vocabs.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Großes Hero-Dashboard */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-extrabold backdrop-blur-xs">
              <Flame className="w-4 h-4 text-amber-300" />
              {stats.streakDays} {stats.streakDays === 1 ? 'Tag' : 'Tage'} Lernserie · {stats.points} XP
            </div>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
              Salut! Bereit für dein nächstes Training?
            </h2>
            <p className="text-indigo-100 text-sm sm:text-base">
              {dueCount > 0
                ? `${dueCount} Vokabeln warten heute auf deine Wiederholung. Mit kurzen Runden festigst du dein Französisch dauerhaft.`
                : 'Super gemacht! Alle fälligen Vokabeln sind aktuell erledigt – starte jederzeit eine freie Runde.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <button
              onClick={onStartQuickLearn}
              className="px-8 py-4 rounded-2xl bg-[#58CC02] hover:bg-[#4eb800] text-white font-black text-lg border-b-4 border-[#46a302] active:border-b-0 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <Play className="w-5 h-5 fill-white" />
              Jetzt lernen
            </button>
            <button
              onClick={() => onNavigate('scanner')}
              className="px-6 py-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-extrabold text-sm flex items-center justify-center gap-2 backdrop-blur-xs transition-colors"
            >
              <Camera className="w-4 h-4" />
              Neue Vokabeln scannen
            </button>
          </div>
        </div>

        {/* Tagesziel-Fortschrittsbalken */}
        <div className="relative z-10 mt-6 pt-5 border-t border-white/15">
          <div className="flex items-center justify-between text-xs font-extrabold mb-2">
            <span className="flex items-center gap-1.5">
              <Target className="w-4 h-4 text-emerald-300" />
              Tagesziel: {today.studied} / {settings.dailyGoal} Vokabeln
            </span>
            <span>{dailyPct}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full bg-[#58CC02] rounded-full transition-all duration-500"
              style={{ width: `${dailyPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* KPI-Karten */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className={`rounded-2xl p-4 border ${
            dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-slate-400 uppercase">Gesamt</span>
            <BookOpen className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="text-2xl font-black">{vocabs.length}</div>
          <div className="text-xs text-slate-500">Vokabeln in {lessons.length} Lektionen</div>
        </div>

        <div
          className={`rounded-2xl p-4 border ${
            dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-slate-400 uppercase">Beherrscht</span>
            <Trophy className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-500">{masteredCount}</div>
          <div className="text-xs text-slate-500">{masteryPct}% deines Wortschatzes</div>
        </div>

        <div
          className={`rounded-2xl p-4 border ${
            dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-slate-400 uppercase">Schwierig</span>
            <AlertCircle className="w-5 h-5 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-500">{hardCount}</div>
          <div className="text-xs text-slate-500">Offene Fehler zum Üben</div>
        </div>

        <div
          className={`rounded-2xl p-4 border ${
            dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-slate-400 uppercase">Lernserie</span>
            <Flame className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-500">{stats.streakDays} Tage</div>
          <div className="text-xs text-slate-500">{stats.points} Punkte gesammelt</div>
        </div>
      </div>

      {/* Schnellzugriffe */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={onPracticeMistakes}
          className={`p-5 rounded-3xl border text-left transition-all hover:scale-[1.01] ${
            dark
              ? 'bg-slate-900 border-slate-800 hover:border-rose-500/50'
              : 'bg-white border-slate-200 hover:border-rose-300 shadow-sm'
          }`}
        >
          <div className="w-11 h-11 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center mb-3">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div className="font-extrabold text-base">Meine Fehler lernen</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {hardCount > 0
              ? `${hardCount} schwierige Vokabeln gezielt wiederholen`
              : 'Derzeit keine offenen Fehler'}
          </div>
        </button>

        <button
          onClick={() => onNavigate('flashcards')}
          className={`p-5 rounded-3xl border text-left transition-all hover:scale-[1.01] ${
            dark
              ? 'bg-slate-900 border-slate-800 hover:border-violet-500/50'
              : 'bg-white border-slate-200 hover:border-violet-300 shadow-sm'
          }`}
        >
          <div className="w-11 h-11 rounded-2xl bg-violet-500/15 text-violet-500 flex items-center justify-center mb-3">
            <Layers className="w-6 h-6" />
          </div>
          <div className="font-extrabold text-base">Karteikarten</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Schnell umdrehen, anhören & einprägen
          </div>
        </button>

        <button
          onClick={() => onNavigate('library')}
          className={`p-5 rounded-3xl border text-left transition-all hover:scale-[1.01] ${
            dark
              ? 'bg-slate-900 border-slate-800 hover:border-indigo-500/50'
              : 'bg-white border-slate-200 hover:border-indigo-300 shadow-sm'
          }`}
        >
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center mb-3">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="font-extrabold text-base">Meine Vokabellisten</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Listen ansehen, drucken oder als PDF/CSV exportieren
          </div>
        </button>
      </div>

      {/* Aktuelle Lektionen */}
      <div
        className={`rounded-3xl p-6 border ${
          dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-extrabold">Deine Lektionen</h3>
          <button
            onClick={() => onNavigate('library')}
            className="text-xs font-extrabold text-indigo-500 hover:underline flex items-center gap-1"
          >
            Alle anzeigen <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {lessons.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400">
            Noch keine Lektionen vorhanden. Scanne deine erste Vokabelliste!
          </div>
        ) : (
          <div className="space-y-3">
            {lessons.slice(0, 4).map((lesson) => {
              const list = vocabs.filter((v) => v.lessonId === lesson.id);
              const mastered = list.filter((v) => v.status === 'mastered').length;
              const pct = list.length > 0 ? Math.round((mastered / list.length) * 100) : 0;
              return (
                <div
                  key={lesson.id}
                  className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    dark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm truncate">{lesson.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                      {list.length} Vokabeln · {pct}% beherrscht
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => onStartQuizForLesson(lesson.id)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    Üben
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 10. VOKABELSCANNER (KAMERA, FOTO, PDF, ZUSCHNITT, SPALTEN-OCR & STRENGER FILTER)
// ============================================================================

const ScannerView: React.FC<{
  dark: boolean;
  lessons: LessonItem[];
  folders: FolderItem[];
  geminiApiKey: string;
  showToast: (text: string, type?: ToastMessage['type']) => void;
  onSaveVocabs: (
    lessonId: string | null,
    newLessonName: string,
    folderId: string | null,
    items: ScannedPair[]
  ) => void;
}> = ({ dark, lessons, folders, geminiApiKey, showToast, onSaveVocabs }) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPages, setCapturedPages] = useState<ScannedPageItem[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [showPageEditor, setShowPageEditor] = useState(true);
  const [showReferencePhoto, setShowReferencePhoto] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [rawOcrOutput, setRawOcrOutput] = useState('');
  const [showRawText, setShowRawText] = useState(false);
  const [scannedPairs, setScannedPairs] = useState<ScannedPair[]>([]);
  const [filteredOutLines, setFilteredOutLines] = useState<FilteredOutLine[]>([]);
  const [showFilteredOut, setShowFilteredOut] = useState(false);
  const [filterOptions, setFilterOptions] = useState<ScannerFilterOptions>(DEFAULT_SCANNER_FILTERS);

  // Zustand für optionale KI-Überarbeitung
  const [isAiReviewing, setIsAiReviewing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [preAiSnapshot, setPreAiSnapshot] = useState<ScannedPair[] | null>(null);

  // Ziel-Lektion Auswahl
  const [saveMode, setSaveMode] = useState<'new' | 'existing'>('new');
  const [newLessonName, setNewLessonName] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [selectedLessonId, setSelectedLessonId] = useState<string>(lessons[0]?.id || '');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraFileInputRef = useRef<HTMLInputElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const draggingHandleRef = useRef<'split1' | 'split2' | null>(null);

  const activePage = useMemo(
    () => capturedPages.find((p) => p.id === activePageId) || capturedPages[0] || null,
    [capturedPages, activePageId]
  );

  const applyFilterToText = useCallback(
    (text: string, opts: ScannerFilterOptions) => {
      const result = parseOcrTextToVocab(text, opts);
      setScannedPairs(result.pairs);
      setFilteredOutLines(result.filteredOut);
      return result;
    },
    []
  );

  const updateFilterOption = <K extends keyof ScannerFilterOptions>(
    key: K,
    value: ScannerFilterOptions[K]
  ) => {
    const next = { ...filterOptions, [key]: value };
    setFilterOptions(next);
    if (rawOcrOutput.trim()) {
      applyFilterToText(rawOcrOutput, next);
    }
  };

  const updateActivePage = (updater: (page: ScannedPageItem) => ScannedPageItem) => {
    if (!activePage) return;
    setCapturedPages((prev) => prev.map((p) => (p.id === activePage.id ? updater(p) : p)));
  };

  const applyLayoutToAllPages = () => {
    if (!activePage || capturedPages.length < 2) return;
    setCapturedPages((prev) =>
      prev.map((p) => ({
        ...p,
        crop: { ...activePage.crop },
        colSplit1: activePage.colSplit1,
        colSplit2: activePage.colSplit2,
      }))
    );
    showToast('Zuschnitt & Spaltentrenner auf alle Seiten angewendet!', 'success');
  };

  const handleAutoDetectColumns = async () => {
    if (!activePage || filterOptions.layoutMode === 'auto') return;
    try {
      const cropped = await renderCroppedPageCanvas(activePage);
      const enhanced = applyAdaptiveOcrEnhancement(cropped);
      const splits = autoDetectColumnSplits(
        enhanced,
        filterOptions.layoutMode === 'three-columns' ? 'three-columns' : 'two-columns'
      );
      updateActivePage((p) => ({ ...p, colSplit1: splits.colSplit1, colSplit2: splits.colSplit2 }));
      showToast('Spaltentrenner automatisch ausgerichtet!', 'success');
    } catch {
      showToast('Spalten konnten nicht automatisch erkannt werden – bitte manuell ziehen.', 'info');
    }
  };

  // Ziehen der vertikalen Spaltentrenner direkt auf dem Vorschaubild (Maus & Touch)
  const handleOverlayPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const handle = draggingHandleRef.current;
    if (!handle || !overlayRef.current || !activePage) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 100;
    const cropWidth = Math.max(10, activePage.crop.right - activePage.crop.left);
    const pctInsideCrop = Math.round(((relX - activePage.crop.left) / cropWidth) * 100);

    if (handle === 'split1') {
      const maxVal = filterOptions.layoutMode === 'three-columns' ? activePage.colSplit2 - 12 : 85;
      const clamped = Math.max(15, Math.min(maxVal, pctInsideCrop));
      updateActivePage((p) => ({ ...p, colSplit1: clamped }));
    } else if (handle === 'split2') {
      const minVal = activePage.colSplit1 + 12;
      const clamped = Math.max(minVal, Math.min(88, pctInsideCrop));
      updateActivePage((p) => ({ ...p, colSplit2: clamped }));
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        cameraFileInputRef.current?.click();
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch {
      showToast('Kamerazugriff nicht möglich – bitte Foto direkt auswählen.', 'info');
      cameraFileInputRef.current?.click();
    }
  };

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.94);
    const created = createDefaultPage(`Kamera-Seite ${capturedPages.length + 1}`, dataUrl);
    setCapturedPages((prev) => [...prev, created]);
    setActivePageId(created.id);
    setShowPageEditor(true);
    showToast('Seite fotografiert! Richte kurz den Rahmen/Spalten aus und starte den Scan.', 'success');
  };

  // Verarbeitung hochgeladener Bilder & PDFs (mehrere Dateien & mehrseitige PDFs)
  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setProgressText('Dateien werden vorbereitet…');
    setProgressPct(10);

    const newPages: ScannedPageItem[] = [];
    let directPdfText = '';

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          setProgressText(`PDF „${file.name}“ wird mit PDF.js geladen…`);
          const pdfjsLib = await getPdfJs();
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            setProgressText(`PDF-Seite ${pageNum} von ${pdf.numPages} wird gerendert…`);
            const page = await pdf.getPage(pageNum);

            const textContent = await page.getTextContent();
            const items = textContent.items as any[];
            if (items && items.length > 0) {
              const lineMap = new Map<number, { x: number; width: number; str: string }[]>();
              items.forEach((it) => {
                if (!it.str || !it.str.trim()) return;
                const y = Math.round((it.transform?.[5] || 0) / 4) * 4;
                const x = it.transform?.[4] || 0;
                const width = it.width || it.str.length * 5;
                if (!lineMap.has(y)) lineMap.set(y, []);
                lineMap.get(y)!.push({ x, width, str: it.str });
              });
              const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);
              sortedYs.forEach((y) => {
                const row = lineMap.get(y)!.sort((a, b) => a.x - b.x);
                let lineStr = '';
                for (let k = 0; k < row.length; k++) {
                  if (k > 0) {
                    const prevEnd = row[k - 1].x + row[k - 1].width;
                    const gap = row[k].x - prevEnd;
                    lineStr += gap > 22 ? '\t' : ' ';
                  }
                  lineStr += row[k].str;
                }
                directPdfText += lineStr.trim() + '\n';
              });
            }

            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              await page.render({ canvasContext: ctx, viewport }).promise;
              newPages.push(
                createDefaultPage(`${file.name} (S. ${pageNum})`, canvas.toDataURL('image/png'))
              );
            }
          }
        } else if (file.type.startsWith('image/')) {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error('Bild konnte nicht gelesen werden.'));
            reader.readAsDataURL(file);
          });
          newPages.push(createDefaultPage(file.name, dataUrl));
        }
      }

      if (newPages.length > 0) {
        setCapturedPages((prev) => [...prev, ...newPages]);
        setActivePageId(newPages[0].id);
        setShowPageEditor(true);
      }

      if (directPdfText.trim().length > 15) {
        const mergedRaw = rawOcrOutput ? `${rawOcrOutput}\n${directPdfText}` : directPdfText;
        setRawOcrOutput(mergedRaw);
        const result = applyFilterToText(mergedRaw, filterOptions);
        if (result.pairs.length > 0) {
          showToast(
            `${result.pairs.length} Vokabeln sauber aus PDF gefiltert (${result.filteredOut.length} Störzeilen aussortiert).`,
            'success'
          );
        }
      } else if (newPages.length > 0) {
        showToast(
          `${newPages.length} Seite(n) geladen. Prüfe kurz Zuschnitt & Spalten und starte dann den Scan.`,
          'info'
        );
      }
    } catch (err: any) {
      showToast(err?.message || 'Fehler beim Importieren der Dateien.', 'error');
    } finally {
      setIsProcessing(false);
      setProgressText('');
      setProgressPct(0);
    }
  };

  // Lokale Spalten-OCR mit Tesseract.js (getrennte FRA/DEU-Modelle pro Spalte + adaptive Kontrastkorrektur)
  const runOcr = async () => {
    if (capturedPages.length === 0) {
      showToast('Bitte fotografiere oder lade zuerst mindestens eine Seite hoch.', 'error');
      return;
    }

    setIsProcessing(true);
    setProgressPct(4);
    setProgressText('Lade lokale OCR-Sprachmodelle (Deutsch & Französisch)…');

    let combinedText = '';
    const workersToClose: any[] = [];

    try {
      const Tesseract = await getTesseract();
      const useSeparateLangWorkers =
        filterOptions.layoutMode !== 'auto' && filterOptions.columnOrder !== 'auto';

      let workerFr: any = null;
      let workerDe: any = null;
      let workerBoth: any = null;

      if (useSeparateLangWorkers) {
        setProgressText('Initialisiere separates Französisch-Modell (fra)…');
        workerFr = await Tesseract.createWorker('fra', 1, {
          logger: (m: any) => {
            if (m.status === 'recognizing text' && typeof m.progress === 'number') {
              setProgressPct(Math.round(m.progress * 100));
            }
          },
        });
        workersToClose.push(workerFr);

        setProgressText('Initialisiere separates Deutsch-Modell (deu)…');
        workerDe = await Tesseract.createWorker('deu', 1, {
          logger: (m: any) => {
            if (m.status === 'recognizing text' && typeof m.progress === 'number') {
              setProgressPct(Math.round(m.progress * 100));
            }
          },
        });
        workersToClose.push(workerDe);
      } else {
        workerBoth = await Tesseract.createWorker('deu+fra', 1, {
          logger: (m: any) => {
            if (m.status === 'recognizing text' && typeof m.progress === 'number') {
              setProgressPct(Math.round(m.progress * 100));
            }
          },
        });
        workersToClose.push(workerBoth);
      }

      for (let i = 0; i < capturedPages.length; i++) {
        const page = capturedPages[i];
        setProgressText(`Bereite Seite ${i + 1} von ${capturedPages.length} vor (Zuschnitt & Schatten-Entfernung)…`);
        const croppedCanvas = await renderCroppedPageCanvas(page);
        const preparedCanvas = filterOptions.enhanceImageForOcr
          ? applyAdaptiveOcrEnhancement(croppedCanvas)
          : croppedCanvas;

        if (filterOptions.layoutMode === 'auto') {
          setProgressText(`Erkenne Text auf Seite ${i + 1} von ${capturedPages.length}…`);
          const { data } = await workerBoth.recognize(preparedCanvas.toDataURL('image/png'));
          const structured = extractStructuredTextFromTesseract(data);
          if (structured) combinedText += structured + '\n';
        } else {
          // 2-Spalten (0..split1 | split1..100) oder 3-Spalten (0..split1 | Mitte ignorieren | split2..100)
          const leftCanvas = sliceColumnCanvas(preparedCanvas, 0, page.colSplit1);
          const rightStart =
            filterOptions.layoutMode === 'three-columns' ? page.colSplit2 : page.colSplit1;
          const rightCanvas = sliceColumnCanvas(preparedCanvas, rightStart, 100);

          const leftWorker = useSeparateLangWorkers
            ? filterOptions.columnOrder === 'fr-de'
              ? workerFr
              : workerDe
            : workerBoth;
          const rightWorker = useSeparateLangWorkers
            ? filterOptions.columnOrder === 'fr-de'
              ? workerDe
              : workerFr
            : workerBoth;

          setProgressText(
            `Seite ${i + 1}/${capturedPages.length}: Erkenne linke Spalte (${
              filterOptions.columnOrder === 'fr-de' ? 'Französisch' : filterOptions.columnOrder === 'de-fr' ? 'Deutsch' : 'DE+FR'
            })…`
          );
          const leftRes = await leftWorker.recognize(leftCanvas.toDataURL('image/png'));

          setProgressText(
            `Seite ${i + 1}/${capturedPages.length}: Erkenne rechte Spalte (${
              filterOptions.columnOrder === 'fr-de' ? 'Deutsch' : filterOptions.columnOrder === 'de-fr' ? 'Französisch' : 'DE+FR'
            })…`
          );
          const rightRes = await rightWorker.recognize(rightCanvas.toDataURL('image/png'));

          const leftLines = extractColumnLinesWithY(leftRes.data);
          const rightLines = extractColumnLinesWithY(rightRes.data);
          const paired = alignTwoColumnLinesToTabText(leftLines, rightLines);
          if (paired) combinedText += paired + '\n';
        }
      }

      setRawOcrOutput(combinedText);
      const result = applyFilterToText(combinedText, filterOptions);
      setAiSummary(null);
      setPreAiSnapshot(null);

      if (result.pairs.length === 0) {
        showToast(
          `Keine sauberen Vokabelpaare erkannt (${result.filteredOut.length} Zeilen gefiltert). Prüfe Spaltentrenner oder Filter-Strenge.`,
          'info'
        );
      } else {
        setShowPageEditor(false);
        showToast(
          `${result.pairs.length} saubere Vokabelpaare erkannt · ${result.filteredOut.length} Störzeilen herausgefiltert.`,
          'success'
        );
      }
    } catch (err: any) {
      showToast(
        'OCR-Fehler: Stelle sicher, dass beim erstmaligen Laden der lokalen Sprachmodelle kurz Internet verfügbar ist.',
        'error'
      );
      console.error(err);
    } finally {
      for (const w of workersToClose) {
        try {
          await w.terminate();
        } catch {
          // Ignorieren
        }
      }
      setIsProcessing(false);
      setProgressText('');
      setProgressPct(0);
    }
  };

  const restoreFilteredLine = (line: FilteredOutLine) => {
    const cleaned = cleanVocabToken(line.raw, filterOptions.removePhonetics);
    const parts = cleaned.includes('\t')
      ? cleaned.split(/\t+/)
      : cleaned.split(/\s{2,}|\s+[-–—=:]\s+/);

    const left = (parts[0] || cleaned).trim();
    const right = (parts[1] || '').trim();

    let de = left;
    let fr = right;
    if (filterOptions.columnOrder === 'fr-de') {
      fr = left;
      de = right;
    } else if (filterOptions.columnOrder === 'auto') {
      const leftScore = detectFrenchScore(left);
      const rightScore = right ? detectFrenchScore(right) : -leftScore;
      de = leftScore > rightScore ? right : left;
      fr = leftScore > rightScore ? left : right;
    }

    setScannedPairs((prev) => [
      ...prev,
      {
        id: generateId(),
        de,
        fr,
        altDe: '',
        altFr: '',
        warning: !de || !fr ? 'Bitte fehlende Seite prüfen' : undefined,
      },
    ]);
    setFilteredOutLines((prev) => prev.filter((item) => item.id !== line.id));
    showToast('Zeile zur Prüfung übernommen.', 'info');
  };

  const updatePair = (id: string, field: keyof ScannedPair, value: string) => {
    setScannedPairs((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, [field]: value };
        if (updated.de.trim() && updated.fr.trim()) {
          updated.warning = undefined;
        }
        return updated;
      })
    );
  };

  const swapPair = (id: string) => {
    setScannedPairs((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, de: p.fr, fr: p.de, altDe: p.altFr, altFr: p.altDe, warning: undefined } : p
      )
    );
  };

  const swapAllPairs = () => {
    setScannedPairs((prev) =>
      prev.map((p) => ({ ...p, de: p.fr, fr: p.de, altDe: p.altFr, altFr: p.altDe, warning: undefined }))
    );
    showToast('Deutsch und Französisch für alle Zeilen getauscht.', 'info');
  };

  const removeWarningPairs = () => {
    const before = scannedPairs.length;
    const cleaned = scannedPairs.filter((p) => !p.warning && p.de.trim() && p.fr.trim());
    setScannedPairs(cleaned);
    showToast(`${before - cleaned.length} unsichere/unvollständige Zeile(n) entfernt.`, 'info');
  };

  // KI-Nachbearbeitung: Prüft Rechtschreibung, Akzente, Artikel & ergänzt fehlende Wörter vom Foto
  const handleAiReview = async () => {
    if (
      scannedPairs.length === 0 &&
      capturedPages.length === 0 &&
      !rawOcrOutput.trim()
    ) {
      showToast('Bitte scanne oder lade zuerst eine Vokabelliste hoch.', 'error');
      return;
    }

    setIsAiReviewing(true);
    setAiSummary(null);
    const snapshotBefore = scannedPairs.map((p) => ({ ...p }));

    try {
      const result = await reviewScannedVocabsWithAI({
        pages: capturedPages,
        currentPairs: scannedPairs,
        rawOcrText: rawOcrOutput,
        filteredOut: filteredOutLines,
        filterOptions,
        apiKey: geminiApiKey,
      });

      if (result.pairs.length === 0) {
        showToast('Die KI konnte keine weiteren gültigen Vokabeln finden.', 'info');
        return;
      }

      setPreAiSnapshot(snapshotBefore);
      setScannedPairs(result.pairs);
      setAiSummary(result.summary);
      setShowPageEditor(false);
      showToast(
        `KI-Überarbeitung abgeschlossen: ${result.pairs.length} Vokabelpaare geprüft!`,
        'success'
      );
    } catch (err: any) {
      showToast(
        err?.message ||
          'KI-Überarbeitung fehlgeschlagen. Bitte prüfe deine Internetverbindung und versuche es erneut.',
        'error'
      );
    } finally {
      setIsAiReviewing(false);
    }
  };

  const undoAiReview = () => {
    if (!preAiSnapshot) return;
    setScannedPairs(preAiSnapshot);
    setPreAiSnapshot(null);
    setAiSummary(null);
    showToast('KI-Änderungen wurden rückgängig gemacht.', 'info');
  };

  const handleSave = () => {
    const valid = scannedPairs.filter((p) => p.de.trim() && p.fr.trim());
    if (valid.length === 0) {
      showToast('Bitte ergänze mindestens ein vollständiges Vokabelpaar (Deutsch & Französisch).', 'error');
      return;
    }
    onSaveVocabs(
      saveMode === 'existing' ? selectedLessonId || null : null,
      newLessonName,
      selectedFolderId || null,
      valid
    );
  };

  const warningCount = scannedPairs.filter((p) => p.warning || !p.de.trim() || !p.fr.trim()).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Vokabelscanner</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            100 % lokal ohne externe KI: Mit Zuschnitt, 2-/3-Spalten-Trennung, Schatten-Entfernung & strenger Vokabelfilterung.
          </p>
        </div>
      </div>

      {/* Upload- & Kamera-Steuerung */}
      <div
        className={`rounded-3xl p-6 border ${
          dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <button
            onClick={cameraActive ? stopCamera : startCamera}
            className="flex items-center justify-center gap-3 py-4 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold border-b-4 border-indigo-800 active:border-b-0 active:translate-y-0.5 transition-all"
          >
            <Camera className="w-6 h-6" />
            {cameraActive ? 'Kamera schließen' : 'Mit Kamera fotografieren'}
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-3 py-4 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold border-b-4 border-emerald-800 active:border-b-0 active:translate-y-0.5 transition-all"
          >
            <Upload className="w-6 h-6" />
            Fotos, Screenshots & PDFs laden
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => handleFilesSelected(e.target.files)}
          />
          <input
            ref={cameraFileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFilesSelected(e.target.files)}
          />
        </div>

        {/* Seitenlayout, Spaltenrichtung & Filterstrenge */}
        <div
          className={`mb-5 p-4 rounded-2xl border space-y-4 ${
            dark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-indigo-500">
              <Filter className="w-4 h-4" />
              Scanner-Modus & strenger Vokabelfilter
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500">Filter-Strenge:</span>
              {(['strict', 'medium', 'loose'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => updateFilterOption('strictness', lvl)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-colors ${
                    filterOptions.strictness === lvl
                      ? 'bg-indigo-600 text-white'
                      : dark
                      ? 'bg-slate-900 text-slate-300 border border-slate-700'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  {lvl === 'strict' ? 'Streng' : lvl === 'medium' ? 'Mittel' : 'Locker'}
                </button>
              ))}
            </div>
          </div>

          {/* Layout-Auswahl (Schulbuch-Spalten) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                Seitenaufbau (Spalten-Scan)
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'two-columns' as const, label: '2 Spalten', sub: 'FR | DE' },
                  { id: 'three-columns' as const, label: '3 Spalten', sub: 'Mitte ausblenden' },
                  { id: 'auto' as const, label: 'Automatisch', sub: 'Gesamtseite' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => updateFilterOption('layoutMode', m.id)}
                    className={`p-2 rounded-xl border text-left transition-all ${
                      filterOptions.layoutMode === m.id
                        ? 'border-indigo-600 bg-indigo-600/10 text-indigo-600 dark:text-indigo-300'
                        : dark
                        ? 'border-slate-700 bg-slate-900/60 text-slate-300'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-extrabold">{m.label}</div>
                    <div className="text-[10px] opacity-75">{m.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                Spalten-Reihenfolge (nutzt gezieltes FR/DE-Modell)
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'fr-de' as const, label: 'FR → DE', sub: 'Schulbuch-Standard' },
                  { id: 'de-fr' as const, label: 'DE → FR', sub: 'Links Deutsch' },
                  { id: 'auto' as const, label: 'Auto', sub: 'Gemischt' },
                ].map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => updateFilterOption('columnOrder', o.id)}
                    className={`p-2 rounded-xl border text-left transition-all ${
                      filterOptions.columnOrder === o.id
                        ? 'border-indigo-600 bg-indigo-600/10 text-indigo-600 dark:text-indigo-300'
                        : dark
                        ? 'border-slate-700 bg-slate-900/60 text-slate-300'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-extrabold">{o.label}</div>
                    <div className="text-[10px] opacity-75">{o.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {[
              {
                key: 'filterNoiseAndHeaders' as const,
                label: 'Überschriften, Seitenzahlen & OCR-Müll filtern',
              },
              {
                key: 'removePhonetics' as const,
                label: 'Lautschrift [bɔ̃ʒuʁ] & IPA entfernen',
              },
              {
                key: 'filterExampleSentences' as const,
                label: 'Beispielsätze & Fließtext aussortieren',
              },
              {
                key: 'filterGrammarBoxes' as const,
                label: 'Grammatik- & Konjugationskästen filtern',
              },
              {
                key: 'onlyCompletePairs' as const,
                label: 'Nur vollständige Paare (DE & FR)',
              },
              {
                key: 'enhanceImageForOcr' as const,
                label: 'Schatten & farbige Kästen entfernen',
              },
            ].map((item) => (
              <label
                key={item.key}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer border transition-colors ${
                  filterOptions[item.key]
                    ? dark
                      ? 'bg-indigo-600/15 border-indigo-500/40 text-indigo-200'
                      : 'bg-indigo-50 border-indigo-200 text-indigo-900'
                    : dark
                    ? 'bg-slate-900/50 border-slate-700 text-slate-400'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={filterOptions[item.key]}
                  onChange={(e) => updateFilterOption(item.key, e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 shrink-0"
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Live-Kamera Vorschau */}
        {cameraActive && (
          <div className="mb-6 rounded-2xl overflow-hidden bg-black relative">
            <video ref={videoRef} playsInline muted className="w-full max-h-[420px] object-contain" />
            <div className="absolute bottom-4 inset-x-0 flex justify-center gap-3">
              <button
                onClick={takePhoto}
                className="px-6 py-3 rounded-full bg-white text-slate-900 font-black shadow-xl hover:scale-105 transition-transform flex items-center gap-2"
              >
                <Camera className="w-5 h-5 text-indigo-600" />
                Seite aufnehmen
              </button>
              <button
                onClick={stopCamera}
                className="px-4 py-3 rounded-full bg-slate-900/80 text-white font-bold"
              >
                Fertig
              </button>
            </div>
          </div>
        )}

        {/* Geladene Seiten + Visueller Zuschnitt- & Spalten-Editor */}
        {capturedPages.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-500">
                Geladene Seiten ({capturedPages.length})
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowPageEditor((s) => !s)}
                  className="text-xs font-bold text-indigo-500 hover:underline flex items-center gap-1"
                >
                  <Crop className="w-3.5 h-3.5" />
                  {showPageEditor ? 'Zuschnitt-Editor ausblenden' : 'Zuschnitt & Spalten anpassen'}
                </button>
                <button
                  onClick={() => {
                    setCapturedPages([]);
                    setActivePageId(null);
                  }}
                  className="text-xs font-bold text-rose-500 hover:underline"
                >
                  Alle entfernen
                </button>
              </div>
            </div>

            {/* Seiten-Miniaturen */}
            <div className="flex gap-3 overflow-x-auto pb-1">
              {capturedPages.map((p, idx) => {
                const isActive = activePage?.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setActivePageId(p.id);
                      setShowPageEditor(true);
                    }}
                    className={`relative shrink-0 w-28 rounded-2xl overflow-hidden border-2 cursor-pointer transition-all ${
                      isActive
                        ? 'border-indigo-600 ring-2 ring-indigo-500/30'
                        : dark
                        ? 'border-slate-700 bg-slate-800'
                        : 'border-slate-200 bg-slate-100'
                    }`}
                  >
                    <img src={p.dataUrl} alt={p.name} className="w-full h-24 object-cover" />
                    <div className="px-1.5 py-1 text-[10px] font-bold truncate">
                      {idx + 1}. {p.name}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCapturedPages((prev) => prev.filter((item) => item.id !== p.id));
                      }}
                      className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white shadow"
                      title="Seite entfernen"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Interaktiver Zuschnitt- & Spalten-Editor */}
            {showPageEditor && activePage && (
              <div
                className={`p-4 rounded-2xl border space-y-4 ${
                  dark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-extrabold flex items-center gap-2">
                      <Crop className="w-4 h-4 text-indigo-500" />
                      Bereich zuschneiden & Spalten ausrichten
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Schneide Überschriften/Seitenzahlen weg und ziehe die gestrichelte Linie genau zwischen die Vokabelspalten.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateActivePage((p) => ({ ...p, rotation: (p.rotation + 90) % 360 }))
                      }
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
                        dark ? 'bg-slate-900 border-slate-700 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      90° drehen
                    </button>
                    {filterOptions.layoutMode !== 'auto' && (
                      <button
                        type="button"
                        onClick={handleAutoDetectColumns}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600/15 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-600/25 flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Spalten automatisch finden
                      </button>
                    )}
                    {capturedPages.length > 1 && (
                      <button
                        type="button"
                        onClick={applyLayoutToAllPages}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                          dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                        }`}
                      >
                        Auf alle {capturedPages.length} Seiten anwenden
                      </button>
                    )}
                  </div>
                </div>

                {/* Bild-Vorschau mit Zuschnitt-Maske & ziehbaren Spaltentrennern */}
                <div className="flex justify-center">
                  <div
                    ref={overlayRef}
                    onPointerMove={handleOverlayPointerMove}
                    onPointerUp={() => {
                      draggingHandleRef.current = null;
                    }}
                    onPointerLeave={() => {
                      draggingHandleRef.current = null;
                    }}
                    className="relative inline-block max-w-full select-none rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-black touch-none"
                  >
                    <img
                      src={activePage.dataUrl}
                      alt={activePage.name}
                      draggable={false}
                      style={{
                        transform: `rotate(${activePage.rotation}deg)`,
                      }}
                      className="block max-h-[420px] max-w-full object-contain pointer-events-none"
                    />

                    {/* Abgedunkelte Randbereiche außerhalb des Zuschnitts */}
                    <div
                      className="absolute inset-x-0 top-0 bg-slate-950/60 pointer-events-none"
                      style={{ height: `${activePage.crop.top}%` }}
                    />
                    <div
                      className="absolute inset-x-0 bottom-0 bg-slate-950/60 pointer-events-none"
                      style={{ height: `${100 - activePage.crop.bottom}%` }}
                    />
                    <div
                      className="absolute left-0 bg-slate-950/60 pointer-events-none"
                      style={{
                        top: `${activePage.crop.top}%`,
                        height: `${activePage.crop.bottom - activePage.crop.top}%`,
                        width: `${activePage.crop.left}%`,
                      }}
                    />
                    <div
                      className="absolute right-0 bg-slate-950/60 pointer-events-none"
                      style={{
                        top: `${activePage.crop.top}%`,
                        height: `${activePage.crop.bottom - activePage.crop.top}%`,
                        width: `${100 - activePage.crop.right}%`,
                      }}
                    />

                    {/* Aktiver Zuschnitt-Rahmen + Spaltenmarkierungen */}
                    <div
                      className="absolute border-2 border-emerald-400 shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
                      style={{
                        top: `${activePage.crop.top}%`,
                        left: `${activePage.crop.left}%`,
                        width: `${activePage.crop.right - activePage.crop.left}%`,
                        height: `${activePage.crop.bottom - activePage.crop.top}%`,
                      }}
                    >
                      {/* Ignorierte Mittelspalte im 3-Spalten-Modus */}
                      {filterOptions.layoutMode === 'three-columns' && (
                        <div
                          className="absolute inset-y-0 bg-rose-500/30 border-x border-rose-400/70 flex items-center justify-center pointer-events-none"
                          style={{
                            left: `${activePage.colSplit1}%`,
                            width: `${Math.max(4, activePage.colSplit2 - activePage.colSplit1)}%`,
                          }}
                        >
                          <span className="px-1.5 py-0.5 rounded bg-rose-600/90 text-white text-[10px] font-black shadow">
                            Beispielsatz ignoriert
                          </span>
                        </div>
                      )}

                      {/* Spalten-Beschriftung */}
                      {filterOptions.layoutMode !== 'auto' && (
                        <>
                          <span className="absolute top-1 left-1.5 px-1.5 py-0.5 rounded bg-indigo-600/90 text-white text-[10px] font-black pointer-events-none">
                            {filterOptions.columnOrder === 'fr-de'
                              ? 'Französisch'
                              : filterOptions.columnOrder === 'de-fr'
                              ? 'Deutsch'
                              : 'Spalte 1'}
                          </span>
                          <span className="absolute top-1 right-1.5 px-1.5 py-0.5 rounded bg-emerald-600/90 text-white text-[10px] font-black pointer-events-none">
                            {filterOptions.columnOrder === 'fr-de'
                              ? 'Deutsch'
                              : filterOptions.columnOrder === 'de-fr'
                              ? 'Französisch'
                              : 'Spalte 2'}
                          </span>
                        </>
                      )}

                      {/* Ziehbare Trennlinie 1 */}
                      {filterOptions.layoutMode !== 'auto' && (
                        <div
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            draggingHandleRef.current = 'split1';
                          }}
                          style={{ left: `${activePage.colSplit1}%` }}
                          className="absolute inset-y-0 -ml-3 w-6 cursor-ew-resize flex items-center justify-center group"
                          title="Spaltentrenner ziehen"
                        >
                          <div className="h-full w-0.5 border-l-2 border-dashed border-amber-400 shadow" />
                          <div className="absolute top-1/2 -translate-y-1/2 w-5 h-9 rounded-full bg-amber-400 text-slate-900 font-black text-[10px] flex items-center justify-center shadow-lg">
                            ↔
                          </div>
                        </div>
                      )}

                      {/* Ziehbare Trennlinie 2 (nur bei 3 Spalten) */}
                      {filterOptions.layoutMode === 'three-columns' && (
                        <div
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            draggingHandleRef.current = 'split2';
                          }}
                          style={{ left: `${activePage.colSplit2}%` }}
                          className="absolute inset-y-0 -ml-3 w-6 cursor-ew-resize flex items-center justify-center group"
                          title="Rechten Spaltentrenner ziehen"
                        >
                          <div className="h-full w-0.5 border-l-2 border-dashed border-rose-400 shadow" />
                          <div className="absolute top-1/2 -translate-y-1/2 w-5 h-9 rounded-full bg-rose-500 text-white font-black text-[10px] flex items-center justify-center shadow-lg">
                            ↔
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Präzise Regler für Zuschnitt & Spalten (ideal für Smartphone & Tablet) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold">
                  <label className="space-y-1">
                    <span className="text-slate-500">Oben abschneiden: {activePage.crop.top}%</span>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, activePage.crop.bottom - 15)}
                      value={activePage.crop.top}
                      onChange={(e) =>
                        updateActivePage((p) => ({
                          ...p,
                          crop: { ...p.crop, top: Number(e.target.value) },
                        }))
                      }
                      className="w-full accent-emerald-500"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-slate-500">Unten abschneiden: {100 - activePage.crop.bottom}%</span>
                    <input
                      type="range"
                      min={Math.min(100, activePage.crop.top + 15)}
                      max={100}
                      value={activePage.crop.bottom}
                      onChange={(e) =>
                        updateActivePage((p) => ({
                          ...p,
                          crop: { ...p.crop, bottom: Number(e.target.value) },
                        }))
                      }
                      className="w-full accent-emerald-500"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-slate-500">Links: {activePage.crop.left}%</span>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, activePage.crop.right - 20)}
                      value={activePage.crop.left}
                      onChange={(e) =>
                        updateActivePage((p) => ({
                          ...p,
                          crop: { ...p.crop, left: Number(e.target.value) },
                        }))
                      }
                      className="w-full accent-emerald-500"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-slate-500">Rechts: {100 - activePage.crop.right}%</span>
                    <input
                      type="range"
                      min={Math.min(100, activePage.crop.left + 20)}
                      max={100}
                      value={activePage.crop.right}
                      onChange={(e) =>
                        updateActivePage((p) => ({
                          ...p,
                          crop: { ...p.crop, right: Number(e.target.value) },
                        }))
                      }
                      className="w-full accent-emerald-500"
                    />
                  </label>
                </div>

                {filterOptions.layoutMode !== 'auto' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold pt-1">
                    <label className="space-y-1">
                      <span className="text-amber-600 dark:text-amber-400">
                        Spaltentrenner 1: {activePage.colSplit1}%
                      </span>
                      <input
                        type="range"
                        min={15}
                        max={filterOptions.layoutMode === 'three-columns' ? activePage.colSplit2 - 12 : 85}
                        value={activePage.colSplit1}
                        onChange={(e) =>
                          updateActivePage((p) => ({ ...p, colSplit1: Number(e.target.value) }))
                        }
                        className="w-full accent-amber-500"
                      />
                    </label>
                    {filterOptions.layoutMode === 'three-columns' && (
                      <label className="space-y-1">
                        <span className="text-rose-600 dark:text-rose-400">
                          Spaltentrenner 2 (Ende Beispielsatz): {activePage.colSplit2}%
                        </span>
                        <input
                          type="range"
                          min={activePage.colSplit1 + 12}
                          max={88}
                          value={activePage.colSplit2}
                          onChange={(e) =>
                            updateActivePage((p) => ({ ...p, colSplit2: Number(e.target.value) }))
                          }
                          className="w-full accent-rose-500"
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              disabled={isProcessing}
              onClick={runOcr}
              className="w-full py-3.5 rounded-2xl bg-[#58CC02] hover:bg-[#4eb800] disabled:opacity-60 text-white font-black text-base border-b-4 border-[#46a302] active:border-b-0 active:translate-y-0.5 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              {isProcessing
                ? 'Lokale Texterkennung läuft…'
                : filterOptions.layoutMode === 'three-columns'
                ? '3-Spalten-Scan starten (Beispielsätze ignorieren)'
                : filterOptions.layoutMode === 'two-columns'
                ? '2-Spalten-Scan starten (DE + FR getrennt)'
                : 'Automatische Texterkennung starten (DE + FR)'}
            </button>
          </div>
        )}

        {/* OCR Fortschritt */}
        {isProcessing && (
          <div className="mt-4 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-2">
            <div className="flex items-center justify-between text-sm font-bold text-indigo-600 dark:text-indigo-300">
              <span>{progressText || 'Verarbeitung…'}</span>
              <span>{progressPct}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-indigo-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(8, progressPct)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Kontroll- & Korrekturtabelle vor dem Speichern */}
      <div
        className={`rounded-3xl p-6 border ${
          dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-extrabold">
                Gefilterte Vokabeln ({scannedPairs.length})
              </h3>
              {warningCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {warningCount} prüfen
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Keine erfundenen Übersetzungen. Alle herausgefilterten Zeilen bleiben unter „Ausgefiltert“ einsehbar.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(scannedPairs.length > 0 || capturedPages.length > 0 || rawOcrOutput.trim().length > 0) && (
              <button
                type="button"
                disabled={isAiReviewing || isProcessing}
                onClick={handleAiReview}
                className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60 text-white shadow-sm flex items-center gap-1.5 transition-all"
                title="KI prüft Rechtschreibung, Akzente, Zuordnung und ergänzt fehlende Vokabeln vom Foto"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isAiReviewing ? 'animate-spin' : ''}`} />
                {isAiReviewing ? 'KI prüft Vokabeln…' : 'Mit KI überarbeiten'}
              </button>
            )}
            {preAiSnapshot && !isAiReviewing && (
              <button
                type="button"
                onClick={undoAiReview}
                className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
                  dark
                    ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                    : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                KI rückgängig
              </button>
            )}
            {activePage && scannedPairs.length > 0 && (
              <button
                onClick={() => setShowReferencePhoto((s) => !s)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
                  showReferencePhoto
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : dark
                    ? 'border-slate-700 hover:bg-slate-800'
                    : 'border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                {showReferencePhoto ? 'Foto ausblenden' : 'Originalfoto vergleichen'}
              </button>
            )}
            {warningCount > 0 && (
              <button
                onClick={removeWarningPairs}
                className="px-3 py-2 rounded-xl text-xs font-bold border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
              >
                Unsichere entfernen ({warningCount})
              </button>
            )}
            {filteredOutLines.length > 0 && (
              <button
                onClick={() => setShowFilteredOut((s) => !s)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
                  showFilteredOut
                    ? 'bg-amber-500 text-white border-amber-500'
                    : dark
                    ? 'border-slate-700 hover:bg-slate-800 text-amber-400'
                    : 'border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                Ausgefiltert ({filteredOutLines.length})
              </button>
            )}
            {rawOcrOutput && (
              <button
                onClick={() => setShowRawText((s) => !s)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border ${
                  dark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
                }`}
              >
                {showRawText ? 'Rohtext ausblenden' : 'Rohtext anzeigen'}
              </button>
            )}
            {scannedPairs.length > 0 && (
              <button
                onClick={swapAllPairs}
                className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
                  dark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
                }`}
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                Alle DE ↔ FR tauschen
              </button>
            )}
            <button
              onClick={() =>
                setScannedPairs((prev) => [
                  ...prev,
                  { id: generateId(), de: '', fr: '', altDe: '', altFr: '' },
                ])
              }
              className="px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Zeile hinzufügen
            </button>
          </div>
        </div>

        {/* Statusbanner während / nach der KI-Überarbeitung */}
        {isAiReviewing && (
          <div className="mb-4 p-4 rounded-2xl border border-violet-500/30 bg-violet-500/10 flex items-center gap-3 text-sm font-bold text-violet-700 dark:text-violet-300">
            <Sparkles className="w-5 h-5 animate-spin shrink-0" />
            <span>
              KI überprüft Rechtschreibung, französische Akzente, Artikel und gleicht fehlende Vokabeln mit deinen Seiten ab…
            </span>
          </div>
        )}

        {aiSummary && !isAiReviewing && (
          <div className="mb-4 p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>KI-Überarbeitung: {aiSummary}</span>
            </div>
            {preAiSnapshot && (
              <button
                type="button"
                onClick={undoAiReview}
                className="underline hover:opacity-80 shrink-0"
              >
                Vorherigen Stand wiederherstellen
              </button>
            )}
          </div>
        )}

        {/* Optionales Vergleichsfoto direkt über der Tabelle */}
        {showReferencePhoto && activePage && (
          <div className="mb-4 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-black/5 dark:bg-black/30">
            <img
              src={activePage.dataUrl}
              alt={activePage.name}
              className="max-h-72 mx-auto rounded-xl object-contain"
            />
          </div>
        )}

        {/* Transparente Liste der herausgefilterten Zeilen */}
        {showFilteredOut && filteredOutLines.length > 0 && (
          <div
            className={`mb-5 p-4 rounded-2xl border space-y-2 ${
              dark ? 'bg-slate-800/70 border-slate-700' : 'bg-amber-50/70 border-amber-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Automatisch herausgefilterte Zeilen ({filteredOutLines.length})
              </span>
              <button
                onClick={() => setShowFilteredOut(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                Schließen
              </button>
            </div>
            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
              {filteredOutLines.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs border ${
                    dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-amber-100'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-mono truncate">{item.raw}</div>
                    <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      Grund: {item.reason}
                    </div>
                  </div>
                  <button
                    onClick={() => restoreFilteredLine(item)}
                    className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold shrink-0"
                  >
                    + Übernehmen
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {showRawText && rawOcrOutput && (
          <div className="mb-4">
            <label className="block text-xs font-bold mb-1 text-slate-500">
              Erkannter Rohtext (kann bearbeitet und mit aktuellen Filtern neu ausgewertet werden):
            </label>
            <textarea
              value={rawOcrOutput}
              onChange={(e) => setRawOcrOutput(e.target.value)}
              rows={5}
              className={`w-full rounded-2xl p-3 text-xs font-mono border ${
                dark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}
            />
            <button
              onClick={() => {
                const res = applyFilterToText(rawOcrOutput, filterOptions);
                showToast(
                  `${res.pairs.length} Vokabeln übernommen, ${res.filteredOut.length} Zeilen gefiltert.`,
                  'info'
                );
              }}
              className="mt-2 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold"
            >
              Rohtext erneut filtern & zuordnen
            </button>
          </div>
        )}

        {scannedPairs.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            Scanne eine Seite oder füge manuell eine Zeile hinzu, um Vokabeln zu prüfen.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="hidden md:grid grid-cols-12 gap-2 px-2 text-xs font-extrabold uppercase text-slate-400">
              <div className="col-span-4">Deutsch (Hauptbedeutung)</div>
              <div className="col-span-4">Französisch (mit Artikel/Akzent)</div>
              <div className="col-span-3">Alternativen (DE / FR)</div>
              <div className="col-span-1 text-right">Aktion</div>
            </div>

            {scannedPairs.map((pair) => {
              const incomplete = !pair.de.trim() || !pair.fr.trim();
              const hasHint = incomplete || Boolean(pair.warning);
              return (
                <div
                  key={pair.id}
                  className={`p-3 rounded-2xl border space-y-2 ${
                    hasHint
                      ? 'border-amber-400 bg-amber-500/5'
                      : dark
                      ? 'border-slate-800 bg-slate-800/40'
                      : 'border-slate-200 bg-slate-50/70'
                  }`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                    <input
                      value={pair.de}
                      onChange={(e) => updatePair(pair.id, 'de', e.target.value)}
                      placeholder="Deutsch…"
                      className={`md:col-span-4 px-3 py-2 rounded-xl text-sm font-semibold border ${
                        dark
                          ? 'bg-slate-900 border-slate-700 text-white'
                          : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                    <input
                      value={pair.fr}
                      onChange={(e) => updatePair(pair.id, 'fr', e.target.value)}
                      placeholder="Französisch…"
                      className={`md:col-span-4 px-3 py-2 rounded-xl text-sm font-semibold border ${
                        dark
                          ? 'bg-slate-900 border-slate-700 text-white'
                          : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                    <div className="md:col-span-3 grid grid-cols-2 gap-1.5">
                      <input
                        value={pair.altDe}
                        onChange={(e) => updatePair(pair.id, 'altDe', e.target.value)}
                        placeholder="Alt. DE"
                        className={`px-2.5 py-2 rounded-xl text-xs border ${
                          dark
                            ? 'bg-slate-900 border-slate-700 text-white'
                            : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      />
                      <input
                        value={pair.altFr}
                        onChange={(e) => updatePair(pair.id, 'altFr', e.target.value)}
                        placeholder="Alt. FR"
                        className={`px-2.5 py-2 rounded-xl text-xs border ${
                          dark
                            ? 'bg-slate-900 border-slate-700 text-white'
                            : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      />
                    </div>
                    <div className="md:col-span-1 flex items-center justify-end gap-1">
                      <button
                        onClick={() => swapPair(pair.id)}
                        title="Deutsch & Französisch tauschen"
                        className="p-2 rounded-xl hover:bg-indigo-500/10 text-indigo-500"
                      >
                        <ArrowLeftRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          setScannedPairs((prev) => prev.filter((item) => item.id !== pair.id))
                        }
                        title="Zeile löschen"
                        className="p-2 rounded-xl hover:bg-rose-500/10 text-rose-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {hasHint && (
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 px-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{pair.warning || 'Unvollständiges Vokabelpaar – bitte ergänzen'}</span>
                    </div>
                  )}
                  {pair.aiNote && (
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-violet-600 dark:text-violet-400 px-1">
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span>KI: {pair.aiNote}</span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Speichern-Bereich */}
            <div
              className={`mt-6 p-4 rounded-2xl border space-y-4 ${
                dark ? 'bg-slate-800/60 border-slate-700' : 'bg-indigo-50/60 border-indigo-100'
              }`}
            >
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setSaveMode('new')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold ${
                    saveMode === 'new'
                      ? 'bg-indigo-600 text-white'
                      : dark
                      ? 'bg-slate-800 text-slate-300'
                      : 'bg-white text-slate-700 border border-slate-200'
                  }`}
                >
                  Als neue Lektion speichern
                </button>
                {lessons.length > 0 && (
                  <button
                    onClick={() => setSaveMode('existing')}
                    className={`px-4 py-2 rounded-xl text-sm font-bold ${
                      saveMode === 'existing'
                        ? 'bg-indigo-600 text-white'
                        : dark
                        ? 'bg-slate-800 text-slate-300'
                        : 'bg-white text-slate-700 border border-slate-200'
                    }`}
                  >
                    Zu bestehender Lektion hinzufügen
                  </button>
                )}
              </div>

              {saveMode === 'new' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    value={newLessonName}
                    onChange={(e) => setNewLessonName(e.target.value)}
                    placeholder="Name der neuen Lektion (z.B. Unité 3 – Freizeit)"
                    className={`px-4 py-3 rounded-xl text-sm font-semibold border ${
                      dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  />
                  <select
                    value={selectedFolderId}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                    className={`px-4 py-3 rounded-xl text-sm font-semibold border ${
                      dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  >
                    <option value="">Kein Ordner</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        Ordner: {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <select
                  value={selectedLessonId}
                  onChange={(e) => setSelectedLessonId(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl text-sm font-semibold border ${
                    dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                  }`}
                >
                  {lessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              )}

              <button
                onClick={handleSave}
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-base border-b-4 border-indigo-800 active:border-b-0 active:translate-y-0.5 transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                Vokabelliste dauerhaft speichern
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 11. DIGITALE VOKABELBIBLIOTHEK
// ============================================================================

const LibraryView: React.FC<{
  dark: boolean;
  folders: FolderItem[];
  lessons: LessonItem[];
  vocabs: VocabItem[];
  speechRate: number;
  setFolders: React.Dispatch<React.SetStateAction<FolderItem[]>>;
  setLessons: React.Dispatch<React.SetStateAction<LessonItem[]>>;
  setVocabs: React.Dispatch<React.SetStateAction<VocabItem[]>>;
  showToast: (text: string, type?: ToastMessage['type']) => void;
  requestConfirm: (dialog: ConfirmDialogState) => void;
  onStartQuizForLessons: (lessonIds: string[]) => void;
  onOpenFlashcards: (lessonIds: string[]) => void;
}> = ({
  dark,
  folders,
  lessons,
  vocabs,
  speechRate,
  setFolders,
  setLessons,
  setVocabs,
  showToast,
  requestConfirm,
  onStartQuizForLessons,
  onOpenFlashcards,
}) => {
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string>('all');
  const [openLessonId, setOpenLessonId] = useState<string | null>(null);
  const [selectedForQuiz, setSelectedForQuiz] = useState<string[]>([]);
  const [globalSearch, setGlobalSearch] = useState('');

  // Erstellen-Modals
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);

  const [showNewLesson, setShowNewLesson] = useState(false);
  const [newLessonName, setNewLessonName] = useState('');
  const [newLessonFolderId, setNewLessonFolderId] = useState<string>('');

  // Lektion umbenennen
  const [renamingLessonId, setRenamingLessonId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');

  // Detailansicht-Zustände
  const [hideDe, setHideDe] = useState(false);
  const [hideFr, setHideFr] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [lessonSearch, setLessonSearch] = useState('');
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);

  // Vokabel hinzufügen / bearbeiten
  const [editingVocab, setEditingVocab] = useState<{
    id: string | null;
    de: string;
    fr: string;
    altDe: string;
    altFr: string;
  } | null>(null);
  const frInputRef = useRef<HTMLInputElement | null>(null);

  const openLesson = useMemo(
    () => lessons.find((l) => l.id === openLessonId) || null,
    [lessons, openLessonId]
  );

  // Duplikate in der geöffneten Lektion (oder gesamt) finden
  const duplicateIds = useMemo(() => {
    const scope = openLessonId ? vocabs.filter((v) => v.lessonId === openLessonId) : vocabs;
    const seen = new Map<string, string[]>();
    scope.forEach((v) => {
      const key = `${v.de.trim().toLowerCase()}|${v.fr.trim().toLowerCase()}`;
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key)!.push(v.id);
    });
    const dupSet = new Set<string>();
    seen.forEach((ids) => {
      if (ids.length > 1) ids.forEach((id) => dupSet.add(id));
    });
    return dupSet;
  }, [vocabs, openLessonId]);

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    setFolders((prev) => [
      ...prev,
      { id: generateId(), name: newFolderName.trim(), color: newFolderColor, createdAt: Date.now() },
    ]);
    setNewFolderName('');
    setShowNewFolder(false);
    showToast('Ordner erstellt!', 'success');
  };

  const handleCreateLesson = () => {
    if (!newLessonName.trim()) return;
    const now = Date.now();
    const created: LessonItem = {
      id: generateId(),
      name: newLessonName.trim(),
      folderId: newLessonFolderId || null,
      createdAt: now,
      updatedAt: now,
    };
    setLessons((prev) => [created, ...prev]);
    setNewLessonName('');
    setShowNewLesson(false);
    showToast('Lektion erstellt!', 'success');
  };

  const handleSaveVocab = () => {
    if (!editingVocab || !openLessonId) return;
    if (!editingVocab.de.trim() || !editingVocab.fr.trim()) {
      showToast('Bitte Deutsch und Französisch ausfüllen.', 'error');
      return;
    }
    const altDe = editingVocab.altDe
      .split(/[;,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const altFr = editingVocab.altFr
      .split(/[;,]/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (editingVocab.id) {
      setVocabs((prev) =>
        prev.map((v) =>
          v.id === editingVocab.id
            ? { ...v, de: editingVocab.de.trim(), fr: editingVocab.fr.trim(), altDe, altFr }
            : v
        )
      );
      showToast('Vokabel aktualisiert!', 'success');
    } else {
      const now = Date.now();
      setVocabs((prev) => [
        {
          id: generateId(),
          lessonId: openLessonId,
          de: editingVocab.de.trim(),
          fr: editingVocab.fr.trim(),
          altDe,
          altFr,
          status: 'new',
          correctCount: 0,
          wrongCount: 0,
          streak: 0,
          easeFactor: 2.5,
          interval: 0,
          nextReview: now,
          lastReviewed: null,
        },
        ...prev,
      ]);
      showToast('Vokabel hinzugefügt!', 'success');
    }
    setEditingVocab(null);
  };

  // Export-Funktionen für die geöffnete Lektion
  const exportCopy = async (items: VocabItem[]) => {
    const text = items.map((v) => `${v.de} — ${v.fr}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      showToast('Vokabelliste in die Zwischenablage kopiert!', 'success');
    } catch {
      showToast('Kopieren fehlgeschlagen.', 'error');
    }
  };

  const exportCsv = (lessonName: string, items: VocabItem[]) => {
    const header = 'Deutsch;Französisch;Alternative Deutsch;Alternative Französisch;Status\n';
    const rows = items
      .map((v) =>
        [v.de, v.fr, v.altDe.join(', '), v.altFr.join(', '), v.status]
          .map((cell) => `"${cell.replace(/"/g, '""')}"`)
          .join(';')
      )
      .join('\n');
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${lessonName.replace(/[^a-z0-9äöüß_-]/gi, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV-Datei heruntergeladen!', 'success');
  };

  const exportPdf = async (lessonName: string, items: VocabItem[]) => {
    try {
      const jsPDF = await getJsPdf();
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text(`VocaLearn – ${lessonName}`, 14, 18);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Exportiert am ${new Date().toLocaleDateString('de-DE')} · ${items.length} Vokabeln`, 14, 25);

      doc.setTextColor(0);
      doc.setFontSize(11);
      let y = 36;
      doc.setFont('helvetica', 'bold');
      doc.text('Deutsch', 14, y);
      doc.text('Französisch', 108, y);
      doc.line(14, y + 2, 196, y + 2);
      doc.setFont('helvetica', 'normal');
      y += 9;

      items.forEach((item) => {
        if (y > 278) {
          doc.addPage();
          y = 20;
        }
        const deLines = doc.splitTextToSize(item.de, 88);
        const frLines = doc.splitTextToSize(item.fr, 84);
        const rowLines = Math.max(deLines.length, frLines.length);
        doc.text(deLines, 14, y);
        doc.text(frLines, 108, y);
        y += rowLines * 6 + 3;
      });

      doc.save(`${lessonName.replace(/[^a-z0-9äöüß_-]/gi, '_')}.pdf`);
      showToast('PDF erfolgreich erstellt!', 'success');
    } catch {
      showToast('PDF-Export fehlgeschlagen.', 'error');
    }
  };

  const removeDuplicates = () => {
    if (!openLessonId) return;
    const seen = new Set<string>();
    const idsToDelete = new Set<string>();

    vocabs
      .filter((v) => v.lessonId === openLessonId)
      .forEach((v) => {
        const key = `${v.de.trim().toLowerCase()}|${v.fr.trim().toLowerCase()}`;
        if (seen.has(key)) {
          idsToDelete.add(v.id);
        } else {
          seen.add(key);
        }
      });

    if (idsToDelete.size === 0) {
      showToast('Keine Duplikate zum Entfernen gefunden.', 'info');
      return;
    }

    setVocabs((prev) => prev.filter((v) => !idsToDelete.has(v.id)));
    setShowDuplicatesOnly(false);
    showToast(`${idsToDelete.size} doppelte Vokabel(n) entfernt!`, 'success');
  };

  // DETAILANSICHT EINER GEÖFFNETEN LEKTION
  if (openLesson) {
    const lessonVocabs = vocabs.filter((v) => v.lessonId === openLesson.id);
    const filteredVocabs = lessonVocabs.filter((v) => {
      if (showDuplicatesOnly && !duplicateIds.has(v.id)) return false;
      if (!lessonSearch.trim()) return true;
      const q = lessonSearch.toLowerCase();
      return (
        v.de.toLowerCase().includes(q) ||
        v.fr.toLowerCase().includes(q) ||
        v.altDe.some((a) => a.toLowerCase().includes(q)) ||
        v.altFr.some((a) => a.toLowerCase().includes(q))
      );
    });

    return (
      <div className="space-y-6">
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => {
              setOpenLessonId(null);
              setLessonSearch('');
              setShowDuplicatesOnly(false);
              setRevealedIds({});
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm border flex items-center gap-2 ${
              dark
                ? 'bg-slate-900 border-slate-800 hover:bg-slate-800'
                : 'bg-white border-slate-200 hover:bg-slate-100'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Zurück zu allen Lektionen
          </button>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onOpenFlashcards([openLesson.id])}
              className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm flex items-center gap-2"
            >
              <Layers className="w-4 h-4" />
              Karteikarten
            </button>
            <button
              onClick={() => onStartQuizForLessons([openLesson.id])}
              className="px-5 py-2.5 rounded-xl bg-[#58CC02] hover:bg-[#4eb800] text-white font-black text-sm border-b-4 border-[#46a302] active:border-b-0 active:translate-y-0.5 transition-all flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" />
              Quiz starten
            </button>
          </div>
        </div>

        {/* Kopfzeile & Export-Leiste */}
        <div
          className={`rounded-3xl p-6 border ${
            dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-2xl font-black">{openLesson.name}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {lessonVocabs.length} Vokabeln gespeichert
                {duplicateIds.size > 0 && (
                  <span className="ml-2 text-amber-500 font-bold">
                    · {duplicateIds.size} Duplikat-Einträge erkannt
                  </span>
                )}
              </p>
            </div>
            <div className="no-print flex flex-wrap gap-2">
              <button
                onClick={() =>
                  setEditingVocab({ id: null, de: '', fr: '', altDe: '', altFr: '' })
                }
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Vokabel hinzufügen
              </button>
              <button
                onClick={() => exportCopy(lessonVocabs)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
                  dark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Copy className="w-3.5 h-3.5" /> Kopieren
              </button>
              <button
                onClick={() => window.print()}
                className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
                  dark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Printer className="w-3.5 h-3.5" /> Drucken
              </button>
              <button
                onClick={() => exportPdf(openLesson.name, lessonVocabs)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
                  dark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> PDF
              </button>
              <button
                onClick={() => exportCsv(openLesson.name, lessonVocabs)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
                  dark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            </div>
          </div>

          {/* Filter-, Such- und Ausblend-Steuerung */}
          <div className="no-print flex flex-wrap items-center gap-3 mb-5">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={lessonSearch}
                onChange={(e) => setLessonSearch(e.target.value)}
                placeholder="Vokabel suchen…"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border ${
                  dark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              />
            </div>

            <button
              onClick={() => setHideDe((h) => !h)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${
                hideDe
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : dark
                  ? 'border-slate-700 hover:bg-slate-800'
                  : 'border-slate-200 hover:bg-slate-100'
              }`}
            >
              {hideDe ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              Deutsch {hideDe ? 'ausgeblendet' : 'ausblenden'}
            </button>

            <button
              onClick={() => setHideFr((h) => !h)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${
                hideFr
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : dark
                  ? 'border-slate-700 hover:bg-slate-800'
                  : 'border-slate-200 hover:bg-slate-100'
              }`}
            >
              {hideFr ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              Französisch {hideFr ? 'ausgeblendet' : 'ausblenden'}
            </button>

            {duplicateIds.size > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDuplicatesOnly((s) => !s)}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border ${
                    showDuplicatesOnly
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'border-amber-400 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  Duplikate ({duplicateIds.size})
                </button>
                <button
                  onClick={removeDuplicates}
                  className="px-3 py-2.5 rounded-xl text-xs font-bold bg-rose-500 text-white hover:bg-rose-600"
                >
                  Bereinigen
                </button>
              </div>
            )}
          </div>

          {/* Vokabel-Tabelle */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr
                  className={`border-b text-xs uppercase font-extrabold text-slate-400 ${
                    dark ? 'border-slate-800' : 'border-slate-200'
                  }`}
                >
                  <th className="py-3 px-3">Deutsch</th>
                  <th className="py-3 px-3">Französisch</th>
                  <th className="py-3 px-3 no-print">Status</th>
                  <th className="py-3 px-3 text-right no-print">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredVocabs.map((v) => {
                  const isDup = duplicateIds.has(v.id);
                  const isRevealed = revealedIds[v.id];
                  return (
                    <tr
                      key={v.id}
                      className={`transition-colors ${
                        isDup
                          ? 'bg-amber-500/5'
                          : dark
                          ? 'hover:bg-slate-800/40'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td
                        className="py-3.5 px-3 font-semibold text-sm cursor-pointer"
                        onClick={() =>
                          hideDe && setRevealedIds((r) => ({ ...r, [v.id]: !r[v.id] }))
                        }
                      >
                        {hideDe && !isRevealed ? (
                          <span className="inline-block px-3 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-transparent select-none">
                            verdeckt
                          </span>
                        ) : (
                          <div>
                            <span>{v.de}</span>
                            {v.altDe.length > 0 && (
                              <span className="block text-xs text-slate-400 font-normal">
                                Alt.: {v.altDe.join(', ')}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td
                        className="py-3.5 px-3 font-bold text-sm text-indigo-600 dark:text-indigo-400 cursor-pointer"
                        onClick={() =>
                          hideFr && setRevealedIds((r) => ({ ...r, [v.id]: !r[v.id] }))
                        }
                      >
                        {hideFr && !isRevealed ? (
                          <span className="inline-block px-3 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-transparent select-none">
                            verdeckt
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                speakFrench(v.fr, speechRate, (m) => showToast(m, 'error'));
                              }}
                              className="no-print p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 shrink-0"
                              title="Französische Aussprache anhören"
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                            <div>
                              <span>{v.fr}</span>
                              {v.altFr.length > 0 && (
                                <span className="block text-xs text-slate-400 font-normal">
                                  Alt.: {v.altFr.join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3 no-print">
                        <StatusBadge status={v.status} />
                      </td>
                      <td className="py-3.5 px-3 text-right no-print">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() =>
                              setEditingVocab({
                                id: v.id,
                                de: v.de,
                                fr: v.fr,
                                altDe: v.altDe.join('; '),
                                altFr: v.altFr.join('; '),
                              })
                            }
                            className="p-2 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-500"
                            title="Bearbeiten"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              requestConfirm({
                                title: 'Vokabel löschen?',
                                message: `Möchtest du „${v.de} – ${v.fr}“ wirklich entfernen?`,
                                confirmLabel: 'Löschen',
                                danger: true,
                                onConfirm: () => {
                                  setVocabs((prev) => prev.filter((item) => item.id !== v.id));
                                  showToast('Vokabel gelöscht.', 'info');
                                },
                              })
                            }
                            className="p-2 rounded-xl hover:bg-rose-500/10 text-rose-500"
                            title="Löschen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredVocabs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-slate-400 text-sm">
                      Keine Vokabeln gefunden.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Vokabel hinzufügen / bearbeiten */}
        {editingVocab && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div
              className={`w-full max-w-lg rounded-3xl p-6 shadow-2xl border ${
                dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
              }`}
            >
              <h3 className="text-xl font-black mb-4">
                {editingVocab.id ? 'Vokabel bearbeiten' : 'Neue Vokabel hinzufügen'}
              </h3>
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold mb-1">Deutsch *</label>
                  <input
                    value={editingVocab.de}
                    onChange={(e) => setEditingVocab({ ...editingVocab, de: e.target.value })}
                    placeholder="z.B. der Apfel"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold ${
                      dark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Französisch *</label>
                  <input
                    ref={frInputRef}
                    value={editingVocab.fr}
                    onChange={(e) => setEditingVocab({ ...editingVocab, fr: e.target.value })}
                    placeholder="z.B. la pomme"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold ${
                      dark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                  <FrenchAccentBar
                    dark={dark}
                    onInsert={(ch) => {
                      setEditingVocab((prev) => (prev ? { ...prev, fr: prev.fr + ch } : null));
                      frInputRef.current?.focus();
                    }}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1">
                      Alternative Übersetzungen DE (mit ; trennen)
                    </label>
                    <input
                      value={editingVocab.altDe}
                      onChange={(e) => setEditingVocab({ ...editingVocab, altDe: e.target.value })}
                      placeholder="Optional"
                      className={`w-full px-3 py-2 rounded-xl border text-xs ${
                        dark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">
                      Alternative Übersetzungen FR (mit ; trennen)
                    </label>
                    <input
                      value={editingVocab.altFr}
                      onChange={(e) => setEditingVocab({ ...editingVocab, altFr: e.target.value })}
                      placeholder="Optional"
                      className={`w-full px-3 py-2 rounded-xl border text-xs ${
                        dark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setEditingVocab(null)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-bold ${
                    dark ? 'bg-slate-800' : 'bg-slate-100'
                  }`}
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSaveVocab}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-extrabold"
                >
                  Speichern
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ÜBERSICHT ALLER ORDNER & LEKTIONEN
  const visibleLessons = lessons.filter((l) => {
    if (selectedFolderFilter === 'none' && l.folderId !== null) return false;
    if (selectedFolderFilter !== 'all' && selectedFolderFilter !== 'none' && l.folderId !== selectedFolderFilter)
      return false;
    if (!globalSearch.trim()) return true;
    const q = globalSearch.toLowerCase();
    if (l.name.toLowerCase().includes(q)) return true;
    return vocabs.some(
      (v) => v.lessonId === l.id && (v.de.toLowerCase().includes(q) || v.fr.toLowerCase().includes(q))
    );
  });

  const matchingGlobalVocabs = globalSearch.trim()
    ? vocabs.filter(
        (v) =>
          v.de.toLowerCase().includes(globalSearch.toLowerCase()) ||
          v.fr.toLowerCase().includes(globalSearch.toLowerCase())
      )
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Meine Vokabellisten</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Verwalte Ordner, Lektionen und wähle mehrere Listen für ein gemeinsames Quiz aus.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowNewFolder(true)}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm border flex items-center gap-2 ${
              dark ? 'border-slate-700 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-100'
            }`}
          >
            <FolderPlus className="w-4 h-4 text-indigo-500" />
            Neuer Ordner
          </button>
          <button
            onClick={() => setShowNewLesson(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Neue Lektion
          </button>
        </div>
      </div>

      {/* Globale Suche + Mehrfachauswahl-Aktion */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Alle Lektionen und Vokabeln durchsuchen…"
            className={`w-full pl-11 pr-4 py-3 rounded-2xl text-sm border ${
              dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          />
        </div>
        {selectedForQuiz.length > 0 && (
          <button
            onClick={() => onStartQuizForLessons(selectedForQuiz)}
            className="px-5 py-3 rounded-2xl bg-[#58CC02] hover:bg-[#4eb800] text-white font-black text-sm border-b-4 border-[#46a302] active:border-b-0 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 shrink-0"
          >
            <Play className="w-4 h-4 fill-white" />
            Gemeinsames Quiz ({selectedForQuiz.length})
          </button>
        )}
      </div>

      {/* Ordner-Filter-Leiste */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedFolderFilter('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
            selectedFolderFilter === 'all'
              ? 'bg-indigo-600 text-white'
              : dark
              ? 'bg-slate-900 text-slate-300 border border-slate-800'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Alle ({lessons.length})
        </button>
        {folders.map((folder) => (
          <div key={folder.id} className="inline-flex items-center">
            <button
              onClick={() => setSelectedFolderFilter(folder.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                selectedFolderFilter === folder.id
                  ? 'bg-indigo-600 text-white'
                  : dark
                  ? 'bg-slate-900 text-slate-300 border border-slate-800'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              <Folder className="w-3.5 h-3.5" style={{ color: folder.color }} />
              {folder.name}
            </button>
          </div>
        ))}
        <button
          onClick={() => setSelectedFolderFilter('none')}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
            selectedFolderFilter === 'none'
              ? 'bg-indigo-600 text-white'
              : dark
              ? 'bg-slate-900 text-slate-300 border border-slate-800'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Ohne Ordner
        </button>
      </div>

      {/* Suchtreffer direkt für Vokabeln */}
      {matchingGlobalVocabs.length > 0 && (
        <div
          className={`rounded-2xl p-4 border ${
            dark ? 'bg-slate-900 border-slate-800' : 'bg-indigo-50/60 border-indigo-100'
          }`}
        >
          <h4 className="text-xs font-extrabold uppercase text-indigo-500 mb-2">
            Direkte Vokabeltreffer ({matchingGlobalVocabs.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {matchingGlobalVocabs.slice(0, 8).map((v) => (
              <div
                key={v.id}
                onClick={() => setOpenLessonId(v.lessonId)}
                className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer text-sm ${
                  dark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-indigo-50'
                }`}
              >
                <span className="font-semibold">{v.de}</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{v.fr}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lektionen-Karten */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleLessons.map((lesson) => {
          const lVocabs = vocabs.filter((v) => v.lessonId === lesson.id);
          const mastered = lVocabs.filter((v) => v.status === 'mastered').length;
          const pct = lVocabs.length ? Math.round((mastered / lVocabs.length) * 100) : 0;
          const folder = folders.find((f) => f.id === lesson.folderId);
          const isChecked = selectedForQuiz.includes(lesson.id);

          return (
            <div
              key={lesson.id}
              className={`rounded-3xl p-5 border transition-all flex flex-col justify-between ${
                isChecked
                  ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                  : dark
                  ? 'bg-slate-900 border-slate-800'
                  : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() =>
                        setSelectedForQuiz((prev) =>
                          prev.includes(lesson.id)
                            ? prev.filter((id) => id !== lesson.id)
                            : [...prev, lesson.id]
                        )
                      }
                      className="w-5 h-5 rounded accent-indigo-600"
                    />
                    {folder && (
                      <span
                        className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: folder.color }}
                      >
                        {folder.name}
                      </span>
                    )}
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setRenamingLessonId(lesson.id);
                        setRenameText(lesson.name);
                      }}
                      className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-400"
                      title="Lektion umbenennen"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() =>
                        requestConfirm({
                          title: 'Lektion löschen?',
                          message: `Alle ${lVocabs.length} Vokabeln in „${lesson.name}“ werden dauerhaft gelöscht.`,
                          confirmLabel: 'Lektion löschen',
                          danger: true,
                          onConfirm: () => {
                            setLessons((prev) => prev.filter((l) => l.id !== lesson.id));
                            setVocabs((prev) => prev.filter((v) => v.lessonId !== lesson.id));
                            setSelectedForQuiz((prev) => prev.filter((id) => id !== lesson.id));
                            showToast('Lektion gelöscht.', 'info');
                          },
                        })
                      }
                      className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500"
                      title="Lektion löschen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {renamingLessonId === lesson.id ? (
                  <div className="flex gap-2 mb-3">
                    <input
                      value={renameText}
                      onChange={(e) => setRenameText(e.target.value)}
                      className={`flex-1 px-3 py-1.5 rounded-xl border text-sm font-bold ${
                        dark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'
                      }`}
                    />
                    <button
                      onClick={() => {
                        if (renameText.trim()) {
                          setLessons((prev) =>
                            prev.map((l) =>
                              l.id === lesson.id ? { ...l, name: renameText.trim() } : l
                            )
                          );
                          showToast('Lektion umbenannt!', 'success');
                        }
                        setRenamingLessonId(null);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <h3 className="text-lg font-extrabold mb-1">{lesson.name}</h3>
                )}

                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                  <span>{lVocabs.length} Vokabeln</span>
                  <span>{pct}% beherrscht</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden mb-4">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setOpenLessonId(lesson.id)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  Vokabelliste anzeigen
                </button>
                <button
                  onClick={() => onStartQuizForLessons([lesson.id])}
                  className="py-2.5 px-3.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 font-extrabold text-sm"
                  title="Quiz für diese Lektion starten"
                >
                  <Play className="w-4 h-4 fill-current" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Neuer Ordner */}
      {showNewFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div
            className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border ${
              dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
            }`}
          >
            <h3 className="text-xl font-black mb-4">Neuen Ordner erstellen</h3>
            <input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="z.B. Klasse 9 oder Urlaub"
              className={`w-full px-4 py-3 rounded-xl border text-sm font-semibold mb-4 ${
                dark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}
            />
            <div className="flex gap-2 mb-6">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewFolderColor(c)}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    newFolderColor === c ? 'scale-125 ring-2 ring-offset-2 ring-indigo-500' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNewFolder(false)}
                className={`px-4 py-2 rounded-xl text-sm font-bold ${
                  dark ? 'bg-slate-800' : 'bg-slate-100'
                }`}
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreateFolder}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-extrabold"
              >
                Erstellen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Neue Lektion */}
      {showNewLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div
            className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border ${
              dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
            }`}
          >
            <h3 className="text-xl font-black mb-4">Neue Lektion erstellen</h3>
            <div className="space-y-3 mb-6">
              <input
                value={newLessonName}
                onChange={(e) => setNewLessonName(e.target.value)}
                placeholder="Name der Lektion"
                className={`w-full px-4 py-3 rounded-xl border text-sm font-semibold ${
                  dark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              />
              <select
                value={newLessonFolderId}
                onChange={(e) => setNewLessonFolderId(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border text-sm font-semibold ${
                  dark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <option value="">Kein Ordner</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNewLesson(false)}
                className={`px-4 py-2 rounded-xl text-sm font-bold ${
                  dark ? 'bg-slate-800' : 'bg-slate-100'
                }`}
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreateLesson}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-extrabold"
              >
                Erstellen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 12. QUIZ-KONFIGURATION (INDIVIDUELLE EINSTELLUNGEN)
// ============================================================================

const QuizSetupView: React.FC<{
  dark: boolean;
  lessons: LessonItem[];
  vocabs: VocabItem[];
  config: QuizConfig;
  setConfig: React.Dispatch<React.SetStateAction<QuizConfig>>;
  showToast: (text: string, type?: ToastMessage['type']) => void;
  onStart: () => void;
}> = ({ dark, lessons, vocabs, config, setConfig, onStart }) => {
  const [customCount, setCustomCount] = useState('15');
  const [useCustomCount, setUseCustomCount] = useState(false);

  const modes: { id: QuizMode; title: string; desc: string; icon: React.ReactNode }[] = [
    {
      id: 'multiple-choice',
      title: 'Multiple Choice',
      desc: 'Wähle aus bis zu 4 Antworten',
      icon: <ListChecks className="w-5 h-5" />,
    },
    {
      id: 'written',
      title: 'Schriftliche Abfrage',
      desc: 'Übersetzung selbst eintippen',
      icon: <Keyboard className="w-5 h-5" />,
    },
    {
      id: 'flashcards',
      title: 'Karteikarten',
      desc: 'Umdrehen & selbst bewerten',
      icon: <Layers className="w-5 h-5" />,
    },
    {
      id: 'matching',
      title: 'Zuordnungsspiel',
      desc: 'DE & FR Paare verbinden',
      icon: <Puzzle className="w-5 h-5" />,
    },
    {
      id: 'listening',
      title: 'Hörverständnis',
      desc: 'Französisch hören & antworten',
      icon: <Headphones className="w-5 h-5" />,
    },
    {
      id: 'exam',
      title: 'Prüfungsmodus',
      desc: 'Test ohne Hilfe mit Note',
      icon: <GraduationCap className="w-5 h-5" />,
    },
    {
      id: 'mixed',
      title: 'Gemischter Modus',
      desc: 'Abwechslungsreicher Mix',
      icon: <Sparkles className="w-5 h-5" />,
    },
  ];

  const availablePool = useMemo(() => {
    let pool = vocabs.filter((v) => config.lessonIds.includes(v.lessonId));
    if (config.filter === 'wrong') {
      pool = pool.filter((v) => v.status === 'hard' || v.wrongCount > 0);
    } else if (config.filter === 'new') {
      pool = pool.filter((v) => v.status === 'new');
    }
    return pool;
  }, [vocabs, config.lessonIds, config.filter]);

  const toggleLesson = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      lessonIds: prev.lessonIds.includes(id)
        ? prev.lessonIds.filter((x) => x !== id)
        : [...prev.lessonIds, id],
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Quiz konfigurieren</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Stelle Lernmodus, Abfragerichtung, Lektionen und Bewertungsregeln genau nach deinen Wünschen ein.
        </p>
      </div>

      {/* 1. Lernmodus */}
      <div
        className={`rounded-3xl p-6 border ${
          dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-400 mb-3">
          1. Lernmodus auswählen
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {modes.map((m) => {
            const active = config.mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setConfig((c) => ({ ...c, mode: m.id }))}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${
                  active
                    ? 'border-indigo-600 bg-indigo-600/10'
                    : dark
                    ? 'border-slate-800 hover:border-slate-700 bg-slate-800/40'
                    : 'border-slate-200 hover:border-indigo-300 bg-slate-50'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${
                    active ? 'bg-indigo-600 text-white' : 'bg-indigo-500/10 text-indigo-500'
                  }`}
                >
                  {m.icon}
                </div>
                <div className="font-extrabold text-sm">{m.title}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{m.desc}</div>
              </button>
            );
          })}
        </div>

        {config.mode === 'listening' && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-slate-500">Hörverständnis-Antwort:</span>
            <button
              onClick={() => setConfig((c) => ({ ...c, listeningAnswerType: 'de' }))}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold ${
                config.listeningAnswerType === 'de'
                  ? 'bg-indigo-600 text-white'
                  : dark
                  ? 'bg-slate-800'
                  : 'bg-slate-100'
              }`}
            >
              Auf Deutsch übersetzen
            </button>
            <button
              onClick={() => setConfig((c) => ({ ...c, listeningAnswerType: 'fr' }))}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold ${
                config.listeningAnswerType === 'fr'
                  ? 'bg-indigo-600 text-white'
                  : dark
                  ? 'bg-slate-800'
                  : 'bg-slate-100'
              }`}
            >
              Auf Französisch schreiben (Diktat)
            </button>
          </div>
        )}
      </div>

      {/* 2. Abfragerichtung & Anzahl */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className={`rounded-3xl p-6 border ${
            dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-400 mb-3">
            2. Abfragerichtung
          </h3>
          <div className="grid grid-cols-1 gap-2.5">
            {[
              { id: 'de-fr' as QuizDirection, label: 'Deutsch → Französisch' },
              { id: 'fr-de' as QuizDirection, label: 'Französisch → Deutsch' },
              { id: 'mixed' as QuizDirection, label: 'Gemischt (zufällig wechselnd)' },
            ].map((dir) => (
              <button
                key={dir.id}
                onClick={() => setConfig((c) => ({ ...c, direction: dir.id }))}
                className={`px-4 py-3 rounded-2xl border-2 font-bold text-sm text-left flex items-center justify-between ${
                  config.direction === dir.id
                    ? 'border-indigo-600 bg-indigo-600/10 text-indigo-600 dark:text-indigo-300'
                    : dark
                    ? 'border-slate-800 bg-slate-800/40'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <span>{dir.label}</span>
                {config.direction === dir.id && <Check className="w-5 h-5" />}
              </button>
            ))}
          </div>
        </div>

        <div
          className={`rounded-3xl p-6 border ${
            dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-400 mb-3">
            3. Anzahl & Filter
          </h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {([10, 20, 30, 50, 'all'] as const).map((cnt) => {
              const active = !useCustomCount && config.count === cnt;
              return (
                <button
                  key={String(cnt)}
                  onClick={() => {
                    setUseCustomCount(false);
                    setConfig((c) => ({ ...c, count: cnt }));
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold ${
                    active
                      ? 'bg-indigo-600 text-white'
                      : dark
                      ? 'bg-slate-800 text-slate-300'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {cnt === 'all' ? 'Alle' : cnt}
                </button>
              );
            })}
            <button
              onClick={() => {
                setUseCustomCount(true);
                setConfig((c) => ({ ...c, count: Math.max(1, parseInt(customCount, 10) || 10) }));
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold ${
                useCustomCount
                  ? 'bg-indigo-600 text-white'
                  : dark
                  ? 'bg-slate-800 text-slate-300'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              Individuell
            </button>
          </div>

          {useCustomCount && (
            <input
              type="number"
              min={1}
              max={500}
              value={customCount}
              onChange={(e) => {
                setCustomCount(e.target.value);
                setConfig((c) => ({ ...c, count: Math.max(1, parseInt(e.target.value, 10) || 1) }));
              }}
              className={`w-32 px-3 py-2 rounded-xl border text-sm font-bold mb-4 ${
                dark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}
            />
          )}

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'all' as const, label: 'Alle Vokabeln' },
              { id: 'wrong' as const, label: 'Nur Fehler' },
              { id: 'new' as const, label: 'Nur Neue' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setConfig((c) => ({ ...c, filter: f.id }))}
                className={`py-2.5 px-2 rounded-xl text-xs font-bold border ${
                  config.filter === f.id
                    ? 'border-indigo-600 bg-indigo-600/10 text-indigo-600 dark:text-indigo-300'
                    : dark
                    ? 'border-slate-800 bg-slate-800/40'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Lektionen auswählen */}
      <div
        className={`rounded-3xl p-6 border ${
          dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-400">
            4. Lektionen auswählen ({config.lessonIds.length}/{lessons.length})
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setConfig((c) => ({ ...c, lessonIds: lessons.map((l) => l.id) }))}
              className="text-xs font-bold text-indigo-500 hover:underline"
            >
              Alle auswählen
            </button>
            <button
              onClick={() => setConfig((c) => ({ ...c, lessonIds: [] }))}
              className="text-xs font-bold text-slate-400 hover:underline"
            >
              Keine
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {lessons.map((l) => {
            const selected = config.lessonIds.includes(l.id);
            const count = vocabs.filter((v) => v.lessonId === l.id).length;
            return (
              <button
                key={l.id}
                onClick={() => toggleLesson(l.id)}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                  selected
                    ? 'border-indigo-600 bg-indigo-600/10'
                    : dark
                    ? 'border-slate-800 bg-slate-800/40'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="truncate pr-2">
                  <div className="font-bold text-sm truncate">{l.name}</div>
                  <div className="text-xs text-slate-400">{count} Vokabeln</div>
                </div>
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                    selected ? 'bg-indigo-600 text-white' : 'border border-slate-400'
                  }`}
                >
                  {selected && <Check className="w-3.5 h-3.5" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Feineinstellungen (Artikel, Akzente, Strenge, Zeitlimit, Zufall) */}
      <div
        className={`rounded-3xl p-6 border ${
          dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-400 mb-4">
          5. Bewertungs- & Quiz-Regeln
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 cursor-pointer">
            <span className="text-sm font-bold">Zufällige Reihenfolge</span>
            <input
              type="checkbox"
              checked={config.shuffle}
              onChange={(e) => setConfig((c) => ({ ...c, shuffle: e.target.checked }))}
              className="w-5 h-5 accent-indigo-600"
            />
          </label>
          <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 cursor-pointer">
            <span className="text-sm font-bold">Franz. Artikel verpflichtend</span>
            <input
              type="checkbox"
              checked={config.requireArticle}
              onChange={(e) => setConfig((c) => ({ ...c, requireArticle: e.target.checked }))}
              className="w-5 h-5 accent-indigo-600"
            />
          </label>
          <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 cursor-pointer">
            <span className="text-sm font-bold">Akzente verpflichtend</span>
            <input
              type="checkbox"
              checked={config.requireAccents}
              onChange={(e) => setConfig((c) => ({ ...c, requireAccents: e.target.checked }))}
              className="w-5 h-5 accent-indigo-600"
            />
          </label>
          <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 cursor-pointer">
            <span className="text-sm font-bold">Alternativen akzeptieren</span>
            <input
              type="checkbox"
              checked={config.acceptAlternatives}
              onChange={(e) => setConfig((c) => ({ ...c, acceptAlternatives: e.target.checked }))}
              className="w-5 h-5 accent-indigo-600"
            />
          </label>

          <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
            <label className="block text-xs font-bold text-slate-400 mb-1">
              Rechtschreibprüfung
            </label>
            <select
              value={config.spellingStrictness}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  spellingStrictness: e.target.value as SpellingStrictness,
                }))
              }
              className={`w-full text-sm font-bold bg-transparent outline-none`}
            >
              <option value="strict" className="text-slate-900">Streng (exakt)</option>
              <option value="tolerant" className="text-slate-900">Tolerant (1 Tippfehler)</option>
              <option value="very-tolerant" className="text-slate-900">Sehr tolerant (2 Fehler)</option>
            </select>
          </div>

          <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
            <label className="block text-xs font-bold text-slate-400 mb-1">
              Zeitlimit pro Frage
            </label>
            <select
              value={config.timeLimitSeconds}
              onChange={(e) =>
                setConfig((c) => ({ ...c, timeLimitSeconds: Number(e.target.value) }))
              }
              className="w-full text-sm font-bold bg-transparent outline-none"
            >
              <option value={0} className="text-slate-900">Kein Zeitlimit</option>
              <option value={15} className="text-slate-900">15 Sekunden</option>
              <option value={30} className="text-slate-900">30 Sekunden</option>
              <option value={60} className="text-slate-900">60 Sekunden</option>
            </select>
          </div>
        </div>
      </div>

      {/* Start-Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <div className="text-sm font-bold text-slate-500">
          Verfügbare Vokabeln für diese Auswahl:{' '}
          <span className="text-indigo-600 dark:text-indigo-400 font-black">
            {availablePool.length}
          </span>
        </div>
        <button
          disabled={availablePool.length === 0}
          onClick={onStart}
          className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-[#58CC02] hover:bg-[#4eb800] disabled:opacity-50 text-white font-black text-lg border-b-4 border-[#46a302] active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-2 shadow-lg"
        >
          <Play className="w-5 h-5 fill-white" />
          Quiz jetzt starten
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// 13. QUIZ-RUNNER (ALLE LERNMODI + ERGEBNISÜBERSICHT)
// ============================================================================

const QuizRunnerView: React.FC<{
  dark: boolean;
  config: QuizConfig;
  vocabs: VocabItem[];
  speechRate: number;
  onRecordResult: (vocabId: string, isCorrect: boolean, durationSeconds?: number) => void;
  showToast: (text: string, type?: ToastMessage['type']) => void;
  onRepeatAll: () => void;
  onRepeatMistakes: (ids: string[]) => void;
  onGoHome: () => void;
  onGoSetup: () => void;
}> = ({ dark, config, vocabs, speechRate, onRecordResult, showToast, onGoHome, onGoSetup }) => {
  const [sessionKey, setSessionKey] = useState(0);
  const [customSubsetIds, setCustomSubsetIds] = useState<string[] | null>(null);

  // Fragen-Queue für Standard-, Hör-, Prüfungs- & Mixed-Modus
  const [queue, setQueue] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState<{
    checked: boolean;
    isCorrect: boolean;
    expected: string;
    alternatives: string[];
  } | null>(null);
  const [records, setRecords] = useState<QuizAnswerRecord[]>([]);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(config.timeLimitSeconds);

  // Zuordnungsspiel-Zustand
  const [matchRoundVocabs, setMatchRoundVocabs] = useState<VocabItem[]>([]);
  const [matchLeft, setMatchLeft] = useState<{ id: string; text: string }[]>([]);
  const [matchRight, setMatchRight] = useState<{ id: string; text: string }[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [matchErrorPair, setMatchErrorPair] = useState<{ left: string; right: string } | null>(null);
  const [matchRemainingPool, setMatchRemainingPool] = useState<VocabItem[]>([]);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const questionStartRef = useRef<number>(Date.now());

  // Pool zusammenstellen (mit intelligenter Priorisierung: schwierige & fällige zuerst)
  const buildPool = useCallback(() => {
    let pool = vocabs.filter((v) => config.lessonIds.includes(v.lessonId));
    if (customSubsetIds) {
      pool = pool.filter((v) => customSubsetIds.includes(v.id));
    } else if (config.filter === 'wrong') {
      pool = pool.filter((v) => v.status === 'hard' || v.wrongCount > 0);
    } else if (config.filter === 'new') {
      pool = pool.filter((v) => v.status === 'new');
    }

    // Intelligente Gewichtung: fällige/schwierige bevorzugen, wenn Teilmenge gewählt wird
    if (config.count !== 'all' && pool.length > config.count) {
      const now = Date.now();
      const prioritized = [...pool].sort((a, b) => {
        const score = (v: VocabItem) =>
          (v.status === 'hard' ? 4 : v.status === 'learning' ? 2 : v.status === 'new' ? 1 : 0) +
          (v.nextReview <= now ? 2 : 0) +
          Math.random() * 1.5;
        return score(b) - score(a);
      });
      pool = prioritized.slice(0, config.count);
    }

    return config.shuffle ? shuffleArray(pool) : pool;
  }, [vocabs, config, customSubsetIds]);

  const setupMatchingRound = useCallback((items: VocabItem[]) => {
    const batch = items.slice(0, 5);
    const rest = items.slice(5);
    setMatchRoundVocabs(batch);
    setMatchRemainingPool(rest);
    setMatchLeft(shuffleArray(batch.map((v) => ({ id: v.id, text: v.de }))));
    setMatchRight(shuffleArray(batch.map((v) => ({ id: v.id, text: v.fr }))));
    setMatchedIds(new Set());
    setSelectedLeft(null);
    setMatchErrorPair(null);
  }, []);

  // Quiz initialisieren
  useEffect(() => {
    const pool = buildPool();
    setRecords([]);
    setFinished(false);
    setCurrentIndex(0);
    setFeedback(null);
    setUserInput('');
    setTimeLeft(config.timeLimitSeconds);
    questionStartRef.current = Date.now();

    if (config.mode === 'matching') {
      setupMatchingRound(pool);
      return;
    }

    const questions: QuizQuestion[] = pool.map((v) => {
      const dir: 'de-fr' | 'fr-de' =
        config.direction === 'mixed'
          ? Math.random() < 0.5
            ? 'de-fr'
            : 'fr-de'
          : config.direction;

      let qMode: QuizQuestion['mode'] = 'written';
      if (config.mode === 'multiple-choice') qMode = 'multiple-choice';
      else if (config.mode === 'listening') qMode = 'listening';
      else if (config.mode === 'written' || config.mode === 'exam') qMode = 'written';
      else if (config.mode === 'mixed') {
        const r = Math.random();
        qMode = r < 0.4 ? 'multiple-choice' : r < 0.8 ? 'written' : 'listening';
      }

      let options: string[] | undefined;
      if (qMode === 'multiple-choice') {
        const target = dir === 'de-fr' ? v.fr : v.de;
        const distractorPool = shuffleArray(
          vocabs
            .filter((other) => other.id !== v.id)
            .map((other) => (dir === 'de-fr' ? other.fr : other.de))
            .filter((t) => t.toLowerCase() !== target.toLowerCase())
        );
        const uniqueDistractors = Array.from(new Set(distractorPool)).slice(0, 3);
        options = shuffleArray([target, ...uniqueDistractors]);
      }

      return { vocab: v, direction: dir, mode: qMode, options };
    });

    setQueue(questions);
  }, [sessionKey, config.mode]);

  const currentQuestion = queue[currentIndex];

  // Automatisch vorlesen bei Hörverständnis
  useEffect(() => {
    if (!finished && currentQuestion?.mode === 'listening') {
      const t = setTimeout(() => {
        speakFrench(currentQuestion.vocab.fr, speechRate);
      }, 250);
      return () => clearTimeout(t);
    }
  }, [currentIndex, currentQuestion, finished, speechRate]);

  // Fokus auf Eingabefeld
  useEffect(() => {
    if (!finished && !feedback && (currentQuestion?.mode === 'written' || currentQuestion?.mode === 'listening')) {
      inputRef.current?.focus();
    }
  }, [currentIndex, feedback, finished, currentQuestion]);

  // Optionaler Countdown-Timer
  useEffect(() => {
    if (finished || config.timeLimitSeconds <= 0 || feedback || config.mode === 'matching') return;
    setTimeLeft(config.timeLimitSeconds);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleCheckAnswer('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentIndex, finished, feedback, config.timeLimitSeconds]);

  const handleCheckAnswer = (submitted: string) => {
    if (!currentQuestion || feedback) return;

    const targetLang: 'fr' | 'de' =
      currentQuestion.mode === 'listening'
        ? config.listeningAnswerType
        : currentQuestion.direction === 'de-fr'
        ? 'fr'
        : 'de';

    const expected = targetLang === 'fr' ? currentQuestion.vocab.fr : currentQuestion.vocab.de;
    const alternatives =
      targetLang === 'fr' ? currentQuestion.vocab.altFr : currentQuestion.vocab.altDe;

    const isCorrect =
      currentQuestion.mode === 'multiple-choice'
        ? submitted.trim().toLowerCase() === expected.trim().toLowerCase()
        : evaluateAnswer(submitted, currentQuestion.vocab, targetLang, {
            requireArticle: config.requireArticle,
            requireAccents: config.requireAccents,
            spellingStrictness: config.spellingStrictness,
            acceptAlternatives: config.acceptAlternatives,
          });

    const elapsedSec = Math.max(1, Math.round((Date.now() - questionStartRef.current) / 1000));
    onRecordResult(currentQuestion.vocab.id, isCorrect, Math.min(elapsedSec, 60));

    setRecords((prev) => [
      ...prev,
      {
        vocab: currentQuestion.vocab,
        direction: currentQuestion.direction,
        userAnswer: submitted.trim() || '(Keine Antwort)',
        expectedAnswer: expected,
        isCorrect,
      },
    ]);

    // Falsch beantwortete Vokabel später erneut abfragen (außer im Prüfungsmodus)
    if (!isCorrect && config.mode !== 'exam') {
      setQueue((prev) => {
        const alreadyRequeued = prev.slice(currentIndex + 1).some((q) => q.vocab.id === currentQuestion.vocab.id);
        if (alreadyRequeued) return prev;
        return [...prev, currentQuestion];
      });
    }

    // Im Prüfungsmodus sofort weiter ohne Hilfestellung
    if (config.mode === 'exam') {
      if (currentIndex + 1 >= queue.length) {
        setFinished(true);
      } else {
        setCurrentIndex((i) => i + 1);
        setUserInput('');
        questionStartRef.current = Date.now();
      }
      return;
    }

    setFeedback({ checked: true, isCorrect, expected, alternatives });
  };

  const handleNext = () => {
    if (currentIndex + 1 >= queue.length) {
      setFinished(true);
    } else {
      setCurrentIndex((i) => i + 1);
      setUserInput('');
      setFeedback(null);
      questionStartRef.current = Date.now();
    }
  };

  // Zuordnungsspiel Logik
  const handleMatchRightClick = (rightId: string) => {
    if (!selectedLeft || matchedIds.has(rightId)) return;
    const vocab = matchRoundVocabs.find((v) => v.id === selectedLeft);
    if (!vocab) return;

    if (selectedLeft === rightId) {
      const nextMatched = new Set(matchedIds);
      nextMatched.add(rightId);
      setMatchedIds(nextMatched);
      setSelectedLeft(null);
      onRecordResult(vocab.id, true, 4);
      setRecords((prev) => [
        ...prev,
        { vocab, direction: 'de-fr', userAnswer: vocab.fr, expectedAnswer: vocab.fr, isCorrect: true },
      ]);

      if (nextMatched.size === matchRoundVocabs.length) {
        setTimeout(() => {
          if (matchRemainingPool.length > 0) {
            setupMatchingRound(matchRemainingPool);
          } else {
            setFinished(true);
          }
        }, 550);
      }
    } else {
      const wrongVocab = matchRoundVocabs.find((v) => v.id === rightId);
      setMatchErrorPair({ left: selectedLeft, right: rightId });
      onRecordResult(vocab.id, false, 4);
      setRecords((prev) => [
        ...prev,
        {
          vocab,
          direction: 'de-fr',
          userAnswer: wrongVocab?.fr || '',
          expectedAnswer: vocab.fr,
          isCorrect: false,
        },
      ]);
      setTimeout(() => {
        setMatchErrorPair(null);
        setSelectedLeft(null);
      }, 650);
    }
  };

  // ERGEBNISÜBERSICHT NACH DEM QUIZ
  if (finished) {
    const total = records.length;
    const correct = records.filter((r) => r.isCorrect).length;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const mistakes = records.filter((r) => !r.isCorrect);
    const uniqueMistakeIds = Array.from(new Set(mistakes.map((m) => m.vocab.id)));

    const getGrade = (p: number) => {
      if (p >= 92) return '1 (Sehr gut)';
      if (p >= 80) return '2 (Gut)';
      if (p >= 67) return '3 (Befriedigend)';
      if (p >= 50) return '4 (Ausreichend)';
      if (p >= 30) return '5 (Mangelhaft)';
      return '6 (Ungenügend)';
    };

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div
          className={`rounded-3xl p-8 text-center border ${
            dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-lg'
          }`}
        >
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-emerald-400 to-indigo-600 flex items-center justify-center text-white shadow-xl mb-4">
            <Award className="w-11 h-11" />
          </div>
          <h2 className="text-3xl font-black mb-1">
            {pct >= 80 ? 'Fantastisch gemacht!' : pct >= 50 ? 'Gute Arbeit!' : 'Weiter üben!'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
            {config.mode === 'exam'
              ? `Prüfungsergebnis: Note ${getGrade(pct)}`
              : 'Dein Lernfortschritt wurde automatisch gespeichert.'}
          </p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className={`p-4 rounded-2xl ${dark ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <div className="text-2xl font-black text-emerald-500">{pct}%</div>
              <div className="text-xs font-bold text-slate-400">Erfolgsquote</div>
            </div>
            <div className={`p-4 rounded-2xl ${dark ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <div className="text-2xl font-black text-indigo-500">
                {correct} / {total}
              </div>
              <div className="text-xs font-bold text-slate-400">Richtig</div>
            </div>
            <div className={`p-4 rounded-2xl ${dark ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <div className="text-2xl font-black text-amber-500">
                +{correct * 10 + mistakes.length * 2} XP
              </div>
              <div className="text-xs font-bold text-slate-400">Punkte</div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => {
                setCustomSubsetIds(null);
                setSessionKey((k) => k + 1);
              }}
              className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Quiz wiederholen
            </button>
            {uniqueMistakeIds.length > 0 && (
              <button
                onClick={() => {
                  setCustomSubsetIds(uniqueMistakeIds);
                  setSessionKey((k) => k + 1);
                }}
                className="px-5 py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-sm flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Nur Fehler wiederholen ({uniqueMistakeIds.length})
              </button>
            )}
            <button
              onClick={onGoHome}
              className={`px-5 py-3 rounded-2xl font-extrabold text-sm ${
                dark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'
              }`}
            >
              Zur Startseite
            </button>
          </div>
        </div>

        {/* Fehlerliste */}
        {mistakes.length > 0 && (
          <div
            className={`rounded-3xl p-6 border ${
              dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <h3 className="text-lg font-extrabold mb-4 text-rose-500 flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              Deine Fehler im Überblick ({mistakes.length})
            </h3>
            <div className="space-y-3">
              {mistakes.map((m, idx) => (
                <div
                  key={`${m.vocab.id}-${idx}`}
                  className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                    dark ? 'bg-slate-800/50 border-slate-700' : 'bg-rose-50/50 border-rose-100'
                  }`}
                >
                  <div>
                    <div className="font-bold text-sm">
                      {m.direction === 'de-fr' ? m.vocab.de : m.vocab.fr}
                    </div>
                    <div className="text-xs text-rose-500 font-semibold">
                      Deine Antwort: {m.userAnswer}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                      Richtig: {m.expectedAnswer}
                    </span>
                    <button
                      onClick={() => speakFrench(m.vocab.fr, speechRate)}
                      className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ZUORDNUNGSSPIEL ANSICHT
  if (config.mode === 'matching') {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={onGoSetup} className="text-sm font-bold text-slate-400 hover:text-indigo-500">
            ← Abbrechen
          </button>
          <span className="text-sm font-extrabold text-indigo-500">
            Zuordnungsspiel · Noch {matchRoundVocabs.length - matchedIds.size + matchRemainingPool.length} Paare
          </span>
        </div>

        <div
          className={`rounded-3xl p-6 border ${
            dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <p className="text-sm font-bold text-slate-500 mb-5 text-center">
            Tippe links eine deutsche Vokabel und rechts die passende französische Übersetzung an!
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              {matchLeft.map((item) => {
                const isMatched = matchedIds.has(item.id);
                const isSelected = selectedLeft === item.id;
                const isError = matchErrorPair?.left === item.id;
                return (
                  <button
                    key={item.id}
                    disabled={isMatched}
                    onClick={() => setSelectedLeft(item.id)}
                    className={`w-full p-4 rounded-2xl border-2 font-bold text-sm transition-all ${
                      isMatched
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 opacity-50'
                        : isError
                        ? 'border-rose-500 bg-rose-500/15 text-rose-600 animate-pulse'
                        : isSelected
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-md scale-[1.02]'
                        : dark
                        ? 'border-slate-700 bg-slate-800 hover:border-indigo-400'
                        : 'border-slate-200 bg-slate-50 hover:border-indigo-400'
                    }`}
                  >
                    {item.text}
                  </button>
                );
              })}
            </div>

            <div className="space-y-3">
              {matchRight.map((item) => {
                const isMatched = matchedIds.has(item.id);
                const isError = matchErrorPair?.right === item.id;
                return (
                  <button
                    key={item.id}
                    disabled={isMatched}
                    onClick={() => handleMatchRightClick(item.id)}
                    className={`w-full p-4 rounded-2xl border-2 font-bold text-sm transition-all ${
                      isMatched
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 opacity-50'
                        : isError
                        ? 'border-rose-500 bg-rose-500/15 text-rose-600 animate-pulse'
                        : dark
                        ? 'border-slate-700 bg-slate-800 hover:border-indigo-400'
                        : 'border-slate-200 bg-slate-50 hover:border-indigo-400'
                    }`}
                  >
                    {item.text}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STANDARD-QUIZ (MULTIPLE CHOICE, SCHRIFTLICH, HÖRVERSTÄNDNIS, PRÜFUNG, GEMISCHT)
  if (!currentQuestion) {
    return (
      <div className="text-center py-16">
        <p className="font-bold text-slate-500 mb-4">Keine Vokabeln für diese Auswahl gefunden.</p>
        <button
          onClick={onGoSetup}
          className="px-6 py-3 rounded-2xl bg-indigo-600 text-white font-bold"
        >
          Zurück zur Auswahl
        </button>
      </div>
    );
  }

  const progressPct = Math.round(((currentIndex + (feedback ? 1 : 0)) / Math.max(1, queue.length)) * 100);
  const promptText =
    currentQuestion.direction === 'de-fr' ? currentQuestion.vocab.de : currentQuestion.vocab.fr;
  const targetIsFrench =
    currentQuestion.mode === 'listening'
      ? config.listeningAnswerType === 'fr'
      : currentQuestion.direction === 'de-fr';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Fortschrittsbalken & Timer */}
      <div className="flex items-center gap-4">
        <button
          onClick={onGoSetup}
          className="p-2 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-400"
          title="Quiz beenden"
        >
          <X className="w-6 h-6" />
        </button>
        <div className="flex-1 h-3.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-[#58CC02] rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="text-xs font-extrabold text-slate-500 shrink-0">
          {currentIndex + 1} / {queue.length}
        </span>
        {config.timeLimitSeconds > 0 && (
          <span
            className={`flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full ${
              timeLeft <= 5 ? 'bg-rose-500 text-white animate-pulse' : 'bg-indigo-500/10 text-indigo-500'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            {timeLeft}s
          </span>
        )}
      </div>

      {/* Aufgaben-Karte */}
      <div
        className={`rounded-3xl p-6 sm:p-8 border ${
          dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-500">
            {config.mode === 'exam'
              ? 'Prüfungsmodus · Keine Hilfen'
              : currentQuestion.mode === 'listening'
              ? `Hörverständnis · ${config.listeningAnswerType === 'fr' ? 'Auf Französisch schreiben' : 'Auf Deutsch übersetzen'}`
              : currentQuestion.direction === 'de-fr'
              ? 'Übersetze ins Französische'
              : 'Übersetze ins Deutsche'}
          </span>
          <StatusBadge status={currentQuestion.vocab.status} />
        </div>

        {/* Frage / Audio */}
        {currentQuestion.mode === 'listening' ? (
          <div className="py-6 flex flex-col items-center justify-center gap-3">
            <button
              onClick={() => speakFrench(currentQuestion.vocab.fr, speechRate, (m) => showToast(m, 'error'))}
              className="w-20 h-20 rounded-3xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-lg border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1 transition-all"
            >
              <Volume2 className="w-10 h-10" />
            </button>
            <button
              onClick={() => speakFrench(currentQuestion.vocab.fr, 0.65)}
              className="text-xs font-bold text-indigo-500 hover:underline"
            >
              Langsam abspielen
            </button>
          </div>
        ) : (
          <div className="py-5 flex items-center justify-between gap-3">
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight">{promptText}</h3>
            {currentQuestion.direction === 'fr-de' && config.mode !== 'exam' && (
              <button
                onClick={() => speakFrench(currentQuestion.vocab.fr, speechRate)}
                className="p-3 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 shrink-0"
                title="Anhören"
              >
                <Volume2 className="w-6 h-6" />
              </button>
            )}
          </div>
        )}

        {/* Antwortbereich */}
        {currentQuestion.mode === 'multiple-choice' && currentQuestion.options ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {currentQuestion.options.map((opt) => {
              const isCorrectOpt =
                opt.trim().toLowerCase() ===
                (currentQuestion.direction === 'de-fr'
                  ? currentQuestion.vocab.fr
                  : currentQuestion.vocab.de
                )
                  .trim()
                  .toLowerCase();

              let btnCls = dark
                ? 'border-slate-700 bg-slate-800 hover:border-indigo-500'
                : 'border-slate-200 bg-slate-50 hover:border-indigo-400';

              if (feedback) {
                if (isCorrectOpt) {
                  btnCls = 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300';
                } else {
                  btnCls = 'opacity-50 border-slate-200 dark:border-slate-800';
                }
              }

              return (
                <button
                  key={opt}
                  disabled={!!feedback}
                  onClick={() => handleCheckAnswer(opt)}
                  className={`p-4 rounded-2xl border-2 font-bold text-left transition-all ${btnCls}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (feedback) handleNext();
              else handleCheckAnswer(userInput);
            }}
            className="mt-4 space-y-3"
          >
            <input
              ref={inputRef}
              disabled={!!feedback}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder={targetIsFrench ? 'Französische Übersetzung eingeben…' : 'Deutsche Übersetzung eingeben…'}
              autoComplete="off"
              className={`w-full px-5 py-4 rounded-2xl border-2 text-lg font-bold outline-none transition-colors ${
                feedback
                  ? feedback.isCorrect
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-rose-500 bg-rose-500/10'
                  : dark
                  ? 'bg-slate-800 border-slate-700 focus:border-indigo-500'
                  : 'bg-slate-50 border-slate-200 focus:border-indigo-500'
              }`}
            />

            {/* Französische Sonderzeichenleiste */}
            {targetIsFrench && !feedback && (
              <FrenchAccentBar
                dark={dark}
                onInsert={(ch) => {
                  setUserInput((prev) => prev + ch);
                  inputRef.current?.focus();
                }}
              />
            )}

            {!feedback && (
              <button
                type="submit"
                className="w-full mt-3 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-base border-b-4 border-indigo-800 active:border-b-0 active:translate-y-0.5 transition-all"
              >
                {config.mode === 'exam' ? 'Antwort abgeben & weiter' : 'Überprüfen'}
              </button>
            )}
          </form>
        )}

        {/* Feedback-Banner (Grün bei richtig, Rot + Lösung bei falsch) */}
        {feedback && (
          <div
            className={`mt-6 p-5 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              feedback.isCorrect
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-rose-500 bg-rose-500/10'
            }`}
          >
            <div className="space-y-1">
              <div
                className={`font-black text-lg flex items-center gap-2 ${
                  feedback.isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {feedback.isCorrect ? (
                  <>
                    <CheckCircle2 className="w-6 h-6" /> Richtig! (+10 XP)
                  </>
                ) : (
                  <>
                    <XCircle className="w-6 h-6" /> Leider falsch
                  </>
                )}
              </div>
              {!feedback.isCorrect && (
                <div className="text-sm font-bold">
                  Korrekte Übersetzung:{' '}
                  <span className="text-emerald-600 dark:text-emerald-400 underline">
                    {feedback.expected}
                  </span>
                </div>
              )}
              {feedback.alternatives.length > 0 && (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Auch richtig: {feedback.alternatives.join(', ')}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => speakFrench(currentQuestion.vocab.fr, speechRate)}
                className="p-3 rounded-xl bg-white/70 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400"
                title="Französisch anhören"
              >
                <Volume2 className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className={`px-6 py-3 rounded-xl font-black text-white ${
                  feedback.isCorrect
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Weiter →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 14. KARTEIKARTEN-MODUS
// ============================================================================

const FlashcardsView: React.FC<{
  dark: boolean;
  lessons: LessonItem[];
  vocabs: VocabItem[];
  initialLessonIds: string[];
  speechRate: number;
  onRecordResult: (vocabId: string, isCorrect: boolean, durationSeconds?: number) => void;
  showToast: (text: string, type?: ToastMessage['type']) => void;
}> = ({ dark, lessons, vocabs, initialLessonIds, speechRate, onRecordResult, showToast }) => {
  const [selectedLessonId, setSelectedLessonId] = useState<string>(
    initialLessonIds.length === 1 ? initialLessonIds[0] : 'all'
  );
  const [direction, setDirection] = useState<'de-fr' | 'fr-de'>('de-fr');
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const deck = useMemo(() => {
    const filtered =
      selectedLessonId === 'all'
        ? vocabs
        : vocabs.filter((v) => v.lessonId === selectedLessonId);
    return filtered;
  }, [vocabs, selectedLessonId]);

  const current = deck[index];

  const handleRate = (known: boolean) => {
    if (!current) return;
    onRecordResult(current.id, known, 4);
    setFlipped(false);
    setTimeout(() => {
      if (index + 1 < deck.length) {
        setIndex((i) => i + 1);
      } else {
        setIndex(0);
        showToast('Stapel einmal durchgearbeitet! Startet von vorn.', 'success');
      }
    }, 180);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Karteikarten</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Klicke auf die Karte, um sie umzudrehen, und bewerte dein Wissen.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedLessonId}
            onChange={(e) => {
              setSelectedLessonId(e.target.value);
              setIndex(0);
              setFlipped(false);
            }}
            className={`px-3 py-2 rounded-xl border text-xs font-bold ${
              dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
            }`}
          >
            <option value="all">Alle Lektionen ({vocabs.length})</option>
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              setDirection((d) => (d === 'de-fr' ? 'fr-de' : 'de-fr'));
              setFlipped(false);
            }}
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
              dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            {direction === 'de-fr' ? 'DE → FR' : 'FR → DE'}
          </button>
        </div>
      </div>

      {!current ? (
        <div className="text-center py-16 text-slate-400 font-bold">
          Keine Vokabeln in dieser Auswahl vorhanden.
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs font-extrabold text-slate-400">
            <span>
              Karte {index + 1} von {deck.length}
            </span>
            <StatusBadge status={current.status} />
          </div>

          <div
            className="flip-card h-72 sm:h-80 cursor-pointer select-none"
            onClick={() => setFlipped((f) => !f)}
          >
            <div className={`flip-inner relative w-full h-full ${flipped ? 'flipped' : ''}`}>
              {/* Vorderseite */}
              <div
                className={`flip-face absolute inset-0 rounded-3xl p-8 border-2 flex flex-col items-center justify-center text-center shadow-lg ${
                  dark
                    ? 'bg-slate-900 border-slate-700'
                    : 'bg-white border-indigo-100'
                }`}
              >
                <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-3">
                  {direction === 'de-fr' ? 'Deutsch' : 'Französisch'}
                </span>
                <div className="text-3xl sm:text-4xl font-black">
                  {direction === 'de-fr' ? current.de : current.fr}
                </div>
                {direction === 'fr-de' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      speakFrench(current.fr, speechRate);
                    }}
                    className="mt-5 p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20"
                  >
                    <Volume2 className="w-6 h-6" />
                  </button>
                )}
                <span className="absolute bottom-5 text-xs font-bold text-slate-400">
                  Tippen zum Umdrehen
                </span>
              </div>

              {/* Rückseite */}
              <div className="flip-face flip-back absolute inset-0 rounded-3xl p-8 bg-gradient-to-br from-indigo-600 to-violet-700 text-white flex flex-col items-center justify-center text-center shadow-xl">
                <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-200 mb-3">
                  {direction === 'de-fr' ? 'Französisch' : 'Deutsch'}
                </span>
                <div className="text-3xl sm:text-4xl font-black">
                  {direction === 'de-fr' ? current.fr : current.de}
                </div>
                {(direction === 'de-fr' ? current.altFr : current.altDe).length > 0 && (
                  <div className="mt-2 text-sm text-indigo-200 font-semibold">
                    Alternativ: {(direction === 'de-fr' ? current.altFr : current.altDe).join(', ')}
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    speakFrench(current.fr, speechRate);
                  }}
                  className="mt-5 p-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white"
                >
                  <Volume2 className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleRate(false)}
              className="py-4 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black text-base border-b-4 border-rose-700 active:border-b-0 active:translate-y-0.5 transition-all flex items-center justify-center gap-2"
            >
              <XCircle className="w-5 h-5" />
              Noch üben
            </button>
            <button
              onClick={() => handleRate(true)}
              className="py-4 rounded-2xl bg-[#58CC02] hover:bg-[#4eb800] text-white font-black text-base border-b-4 border-[#46a302] active:border-b-0 active:translate-y-0.5 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              Wusste ich!
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ============================================================================
// 15. MEINE FEHLER (SCHWIERIGE VOKABELN)
// ============================================================================

const MistakesView: React.FC<{
  dark: boolean;
  hardVocabs: VocabItem[];
  lessons: LessonItem[];
  speechRate: number;
  showToast: (text: string, type?: ToastMessage['type']) => void;
  onPracticeMistakes: (mode: QuizMode) => void;
  onMarkMastered: (id: string) => void;
}> = ({ dark, hardVocabs, lessons, speechRate, onPracticeMistakes, onMarkMastered }) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Meine Fehler</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Hier landen alle falsch beantworteten und schwierigen Vokabeln für gezieltes Wiederholen.
          </p>
        </div>
        {hardVocabs.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onPracticeMistakes('written')}
              className="px-5 py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black text-sm border-b-4 border-rose-700 active:border-b-0 active:translate-y-0.5 transition-all flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" />
              Meine Fehler lernen ({hardVocabs.length})
            </button>
            <button
              onClick={() => onPracticeMistakes('multiple-choice')}
              className="px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm"
            >
              Als Multiple Choice
            </button>
          </div>
        )}
      </div>

      {hardVocabs.length === 0 ? (
        <div
          className={`rounded-3xl p-12 text-center border ${
            dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-500 mb-3" />
          <h3 className="text-xl font-black mb-1">Fehlerfrei!</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Du hast derzeit keine offenen Fehler. Starte ein neues Quiz, um weiterzulernen.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {hardVocabs.map((v) => {
            const lesson = lessons.find((l) => l.id === v.lessonId);
            return (
              <div
                key={v.id}
                className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                  dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-400 truncate">
                    {lesson?.name || 'Lektion'} · {v.wrongCount}× falsch
                  </div>
                  <div className="font-extrabold text-base">{v.de}</div>
                  <div className="font-bold text-sm text-indigo-600 dark:text-indigo-400">
                    {v.fr}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => speakFrench(v.fr, speechRate)}
                    className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20"
                    title="Anhören"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onMarkMastered(v.id)}
                    className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                    title="Als beherrscht markieren"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 16. LERNSTATISTIKEN
// ============================================================================

const StatsView: React.FC<{
  dark: boolean;
  lessons: LessonItem[];
  vocabs: VocabItem[];
  stats: UserStats;
  settings: AppSettings;
}> = ({ dark, lessons, vocabs, stats, settings }) => {
  const learnedCount = vocabs.filter((v) => v.status === 'mastered' || v.status === 'learning').length;
  const masteredCount = vocabs.filter((v) => v.status === 'mastered').length;
  const hardCount = vocabs.filter((v) => v.status === 'hard').length;
  const totalAnswers = stats.totalCorrect + stats.totalWrong;
  const accuracy = totalAnswers > 0 ? Math.round((stats.totalCorrect / totalAnswers) * 100) : 0;

  const today = stats.dailyHistory[getTodayKey()] || {
    studied: 0,
    correct: 0,
    wrong: 0,
    seconds: 0,
    points: 0,
  };
  const todayMinutes = Math.max(today.studied > 0 ? 1 : 0, Math.round(today.seconds / 60));

  // Letzte 7 Tage für Recharts
  const chartData = useMemo(() => {
    const days: { day: string; Richtig: number; Falsch: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      const label = d.toLocaleDateString('de-DE', { weekday: 'short' });
      const entry = stats.dailyHistory[key];
      days.push({
        day: label,
        Richtig: entry?.correct || 0,
        Falsch: entry?.wrong || 0,
      });
    }
    return days;
  }, [stats.dailyHistory]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Lernstatistiken</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Behalte deinen Lernfortschritt, deine Erfolgsquote und deine tägliche Lernserie im Blick.
        </p>
      </div>

      {/* Hauptkennzahlen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Gespeicherte Vokabeln', value: vocabs.length, color: 'text-indigo-500' },
          { label: 'Gelernte Vokabeln', value: `${learnedCount} (${masteredCount} beherrscht)`, color: 'text-emerald-500' },
          { label: 'Schwierige Vokabeln', value: hardCount, color: 'text-rose-500' },
          { label: 'Erfolgsquote', value: `${accuracy}%`, color: 'text-amber-500' },
          { label: 'Richtige Antworten', value: stats.totalCorrect, color: 'text-emerald-500' },
          { label: 'Falsche Antworten', value: stats.totalWrong, color: 'text-rose-500' },
          { label: 'Lernzeit heute', value: `${todayMinutes} Min.`, color: 'text-sky-500' },
          { label: 'Lernserie / Punkte', value: `${stats.streakDays} T · ${stats.points} XP`, color: 'text-orange-500' },
        ].map((item) => (
          <div
            key={item.label}
            className={`rounded-2xl p-4 border ${
              dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className={`text-xl sm:text-2xl font-black ${item.color}`}>{item.value}</div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
              {item.label}
            </div>
          </div>
        ))}
      </div>

      {/* Lernverlauf-Diagramm */}
      <div
        className={`rounded-3xl p-6 border ${
          dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
          <h3 className="text-lg font-extrabold">Lernverlauf (Letzte 7 Tage)</h3>
          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-emerald-500">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Richtig
            </span>
            <span className="flex items-center gap-1.5 text-rose-500">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              Falsch
            </span>
            <span className="text-slate-400">
              Tagesziel: {today.studied} / {settings.dailyGoal}
            </span>
          </div>
        </div>
        {(() => {
          const maxBarVal = Math.max(
            4,
            ...chartData.flatMap((d) => [d.Richtig, d.Falsch])
          );
          return (
            <div className="relative h-60 pt-4 pb-2 flex flex-col justify-end">
              {/* Horizontale Hilfslinien */}
              <div className="absolute inset-x-0 top-4 bottom-8 flex flex-col justify-between pointer-events-none">
                {[maxBarVal, Math.round(maxBarVal / 2), 0].map((tick, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-7 text-right text-[11px] font-bold text-slate-400">
                      {tick}
                    </span>
                    <div
                      className={`flex-1 border-t border-dashed ${
                        dark ? 'border-slate-800' : 'border-slate-200'
                      }`}
                    />
                  </div>
                ))}
              </div>

              {/* Balken pro Wochentag */}
              <div className="relative z-10 flex items-end justify-between gap-2 sm:gap-4 h-full pl-9 pr-1">
                {chartData.map((entry, idx) => {
                  const correctPct = Math.round((entry.Richtig / maxBarVal) * 100);
                  const wrongPct = Math.round((entry.Falsch / maxBarVal) * 100);
                  return (
                    <div
                      key={`${entry.day}-${idx}`}
                      className="flex-1 h-full flex flex-col items-center justify-end group"
                    >
                      <div className="w-full flex-1 flex items-end justify-center gap-1 sm:gap-1.5 pb-2">
                        <div className="relative flex flex-col items-center justify-end h-full w-3.5 sm:w-5">
                          {entry.Richtig > 0 && (
                            <span className="mb-1 text-[10px] font-extrabold text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              {entry.Richtig}
                            </span>
                          )}
                          <div
                            title={`${entry.day}: ${entry.Richtig} richtig`}
                            className="w-full bg-emerald-500 rounded-t-md transition-all duration-500"
                            style={{
                              height: entry.Richtig > 0 ? `${Math.max(6, correctPct)}%` : '3px',
                              opacity: entry.Richtig > 0 ? 1 : 0.2,
                            }}
                          />
                        </div>
                        <div className="relative flex flex-col items-center justify-end h-full w-3.5 sm:w-5">
                          {entry.Falsch > 0 && (
                            <span className="mb-1 text-[10px] font-extrabold text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              {entry.Falsch}
                            </span>
                          )}
                          <div
                            title={`${entry.day}: ${entry.Falsch} falsch`}
                            className="w-full bg-rose-500 rounded-t-md transition-all duration-500"
                            style={{
                              height: entry.Falsch > 0 ? `${Math.max(6, wrongPct)}%` : '3px',
                              opacity: entry.Falsch > 0 ? 1 : 0.2,
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {entry.day}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Fortschritt pro Lektion */}
      <div
        className={`rounded-3xl p-6 border ${
          dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <h3 className="text-lg font-extrabold mb-4">Lernfortschritt pro Lektion</h3>
        <div className="space-y-4">
          {lessons.map((lesson) => {
            const list = vocabs.filter((v) => v.lessonId === lesson.id);
            const m = list.filter((v) => v.status === 'mastered').length;
            const h = list.filter((v) => v.status === 'hard').length;
            const pct = list.length ? Math.round((m / list.length) * 100) : 0;
            return (
              <div key={lesson.id}>
                <div className="flex justify-between text-sm font-bold mb-1">
                  <span>{lesson.name}</span>
                  <span className="text-xs text-slate-500">
                    {m}/{list.length} beherrscht ({pct}%) · {h} schwierig
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 17. EINSTELLUNGEN, BACKUP & PWA
// ============================================================================

const SettingsView: React.FC<{
  dark: boolean;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  folders: FolderItem[];
  lessons: LessonItem[];
  vocabs: VocabItem[];
  stats: UserStats;
  deferredInstallPrompt: any;
  onClearInstallPrompt: () => void;
  showToast: (text: string, type?: ToastMessage['type']) => void;
  requestConfirm: (dialog: ConfirmDialogState) => void;
  onImportBackup: (data: PersistedState, merge: boolean) => void;
  onResetAll: () => void;
}> = ({
  dark,
  settings,
  setSettings,
  folders,
  lessons,
  vocabs,
  stats,
  deferredInstallPrompt,
  onClearInstallPrompt,
  showToast,
  requestConfirm,
  onImportBackup,
  onResetAll,
}) => {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [importMerge, setImportMerge] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingApiKey, setTestingApiKey] = useState(false);

  const handleTestGeminiKey = async () => {
    setTestingApiKey(true);
    try {
      const key = (settings.geminiApiKey || '').trim();
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${key}`;
      const res = await fetchWithExponentialBackoff(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Antworte nur mit OK.' }] }],
          }),
        },
        2
      );
      if (res.ok) {
        showToast('KI-Verbindung erfolgreich getestet! Der Button „Mit KI überarbeiten“ ist einsatzbereit.', 'success');
      } else if (!key && (res.status === 400 || res.status === 401 || res.status === 403)) {
        showToast('Kein API-Key eingetragen. Bitte kostenlosen Key von aistudio.google.com einfügen.', 'error');
      } else {
        showToast(`API-Key-Test fehlgeschlagen (Status ${res.status}). Bitte Key prüfen.`, 'error');
      }
    } catch {
      showToast('Verbindungstest fehlgeschlagen. Bitte Internetverbindung prüfen.', 'error');
    } finally {
      setTestingApiKey(false);
    }
  };

  const handleExportBackup = () => {
    const payload = {
      app: 'VocaLearn',
      version: 1,
      exportedAt: new Date().toISOString(),
      folders,
      lessons,
      vocabs,
      stats,
      // Persönlichen API-Key aus Sicherheitsgründen nicht in geteilte Backup-Dateien schreiben
      settings: { ...settings, geminiApiKey: '' },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vocalearn-backup-${getTodayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Vollständiges Backup als JSON-Datei heruntergeladen!', 'success');
  };

  const handleFileImport = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed.lessons) || !Array.isArray(parsed.vocabs)) {
        showToast('Ungültige VocaLearn-Backup-Datei.', 'error');
        return;
      }
      onImportBackup(parsed, importMerge);
    } catch {
      showToast('Backup-Datei konnte nicht gelesen werden.', 'error');
    }
  };

  const handleInstallPwa = async () => {
    if (!deferredInstallPrompt) {
      showToast(
        'Nutze im Browser das Menü „Zum Home-Bildschirm hinzufügen“ / „App installieren“.',
        'info'
      );
      return;
    }
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    onClearInstallPrompt();
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Einstellungen</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Passe VocaLearn an deine Lerngewohnheiten an und sichere deine lokalen Daten.
        </p>
      </div>

      {/* Design & Tagesziel */}
      <div
        className={`rounded-3xl p-6 border space-y-5 ${
          dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-400">
          Darstellung & Lernziele
        </h3>

        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-sm">Farbschema</div>
            <div className="text-xs text-slate-400">Heller oder dunkler Modus</div>
          </div>
          <button
            onClick={() =>
              setSettings((s) => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' }))
            }
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center gap-2"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {dark ? 'Auf Hell wechseln' : 'Auf Dunkel wechseln'}
          </button>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-bold text-sm">Tagesziel (Vokabeln pro Tag)</div>
            <div className="text-xs text-slate-400">Für deinen täglichen Fortschrittsbalken</div>
          </div>
          <input
            type="number"
            min={5}
            max={200}
            value={settings.dailyGoal}
            onChange={(e) =>
              setSettings((s) => ({ ...s, dailyGoal: Math.max(5, Number(e.target.value) || 20) }))
            }
            className={`w-24 px-3 py-2 rounded-xl border text-sm font-bold text-center ${
              dark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-bold text-sm">Sprechgeschwindigkeit (Französisch)</div>
            <div className="text-xs text-slate-400">Aktuell: {Math.round(settings.speechRate * 100)}%</div>
          </div>
          <input
            type="range"
            min={0.6}
            max={1.2}
            step={0.05}
            value={settings.speechRate}
            onChange={(e) => setSettings((s) => ({ ...s, speechRate: Number(e.target.value) }))}
            className="w-36 accent-indigo-600"
          />
        </div>
      </div>

      {/* Standard-Quizregeln */}
      <div
        className={`rounded-3xl p-6 border space-y-4 ${
          dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-400">
          Standard-Bewertungsregeln
        </h3>
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm font-bold">Französische Artikel verpflichtend prüfen</span>
          <input
            type="checkbox"
            checked={settings.requireArticle}
            onChange={(e) => setSettings((s) => ({ ...s, requireArticle: e.target.checked }))}
            className="w-5 h-5 accent-indigo-600"
          />
        </label>
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm font-bold">Akzente (é, è, ç, …) verpflichtend prüfen</span>
          <input
            type="checkbox"
            checked={settings.requireAccents}
            onChange={(e) => setSettings((s) => ({ ...s, requireAccents: e.target.checked }))}
            className="w-5 h-5 accent-indigo-600"
          />
        </label>
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm font-bold">Alternative Übersetzungen als richtig werten</span>
          <input
            type="checkbox"
            checked={settings.acceptAlternatives}
            onChange={(e) => setSettings((s) => ({ ...s, acceptAlternatives: e.target.checked }))}
            className="w-5 h-5 accent-indigo-600"
          />
        </label>
      </div>

      {/* KI-Überarbeitung im Scanner (für eigene Webseite) */}
      <div
        className={`rounded-3xl p-6 border space-y-4 ${
          dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-400">
              KI-Überarbeitung (Gemini API-Key)
            </h3>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
              settings.geminiApiKey?.trim()
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'bg-slate-500/15 text-slate-500 dark:text-slate-400'
            }`}
          >
            {settings.geminiApiKey?.trim() ? 'Eigener Key aktiv' : 'Standard-Modus (leer)'}
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Wenn du VocaLearn auf deiner eigenen Webseite (z. B. Vercel oder Netlify) hostest, füge hier
          deinen kostenlosen <strong>Google Gemini API-Key</strong> (erhältlich ohne Kreditkarte auf{' '}
          <span className="font-bold text-indigo-500">aistudio.google.com</span>) ein. Danach
          funktioniert der Button <strong>„Mit KI überarbeiten“</strong> im Scanner auch dort 1:1.
          Der Key wird ausschließlich lokal auf deinem Gerät gespeichert und nicht in Backups exportiert.
        </p>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={settings.geminiApiKey || ''}
              onChange={(e) => setSettings((s) => ({ ...s, geminiApiKey: e.target.value }))}
              placeholder="AIzaSy… (optional im Vorschau-Modus)"
              autoComplete="off"
              className={`w-full pl-4 pr-11 py-2.5 rounded-xl border text-sm font-mono ${
                dark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowApiKey((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-indigo-500"
              title={showApiKey ? 'Key verbergen' : 'Key anzeigen'}
            >
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button
            type="button"
            disabled={testingApiKey}
            onClick={handleTestGeminiKey}
            className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold text-xs flex items-center justify-center gap-1.5 shrink-0"
          >
            <Sparkles className={`w-3.5 h-3.5 ${testingApiKey ? 'animate-spin' : ''}`} />
            {testingApiKey ? 'Teste…' : 'Verbindung testen'}
          </button>
          {settings.geminiApiKey?.trim() && (
            <button
              type="button"
              onClick={() => {
                setSettings((s) => ({ ...s, geminiApiKey: '' }));
                showToast('API-Key lokal entfernt.', 'info');
              }}
              className="px-3.5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs shrink-0"
            >
              Löschen
            </button>
          )}
        </div>
      </div>

      {/* Datensicherung (IndexedDB Backup & Restore) */}
      <div
        className={`rounded-3xl p-6 border space-y-4 ${
          dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-400">
            Lokale Speicherung & Backup (IndexedDB)
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Alle deine Vokabeln, Lernfortschritte und Statistiken werden kostenlos und dauerhaft lokal
          in deinem Browser (IndexedDB) gespeichert – ohne Konto und ohne Cloud-Kosten.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportBackup}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Backup exportieren (.json)
          </button>

          <button
            onClick={() => importInputRef.current?.click()}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Backup wiederherstellen
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => handleFileImport(e.target.files?.[0] || null)}
          />
        </div>

        <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 cursor-pointer">
          <input
            type="checkbox"
            checked={importMerge}
            onChange={(e) => setImportMerge(e.target.checked)}
            className="accent-indigo-600"
          />
          Beim Import mit bestehenden Vokabeln zusammenführen (statt überschreiben)
        </label>
      </div>

      {/* PWA Installation & Zurücksetzen */}
      <div
        className={`rounded-3xl p-6 border space-y-4 ${
          dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-indigo-500" />
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-400">
            Als App installieren (PWA)
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Installiere VocaLearn direkt auf deinem iPhone, Android-Smartphone, Tablet oder PC, um wie
          mit einer nativen App zu lernen.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleInstallPwa}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center gap-2"
          >
            <Smartphone className="w-4 h-4" />
            VocaLearn als App installieren
          </button>
          <button
            onClick={() =>
              requestConfirm({
                title: 'Alle Daten zurücksetzen?',
                message:
                  'Alle gespeicherten Lektionen, Vokabeln und Statistiken werden gelöscht und auf den Anfangszustand zurückgesetzt.',
                confirmLabel: 'Alles zurücksetzen',
                danger: true,
                onConfirm: onResetAll,
              })
            }
            className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-sm"
          >
            Alle Daten zurücksetzen
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 18. HAUPTKOMPONENTE APP (NAVIGATION, INDEXEDDB, PWA & LAYOUT)
// ============================================================================

const App: React.FC = () => {
  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [vocabs, setVocabs] = useState<VocabItem[]>([]);
  const [stats, setStats] = useState<UserStats>(DEFAULT_STATS);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const [flashcardLessonIds, setFlashcardLessonIds] = useState<string[]>([]);
  const [quizConfig, setQuizConfig] = useState<QuizConfig>({
    lessonIds: [],
    direction: 'de-fr',
    mode: 'multiple-choice',
    count: 20,
    filter: 'all',
    shuffle: true,
    timeLimitSeconds: 0,
    requireArticle: true,
    requireAccents: true,
    spellingStrictness: 'tolerant',
    acceptAlternatives: true,
    listeningAnswerType: 'de',
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);

  const showToast = useCallback((text: string, type: ToastMessage['type'] = 'info') => {
    const id = generateId();
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  // Zustand beim Start aus IndexedDB laden
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadPersistedState();
      if (cancelled) return;
      const initial = saved || createInitialDemoState();
      setFolders(initial.folders || []);
      setLessons(initial.lessons || []);
      setVocabs(initial.vocabs || []);
      setStats({ ...DEFAULT_STATS, ...(initial.stats || {}) });
      const mergedSettings = { ...DEFAULT_SETTINGS, ...(initial.settings || {}) };
      setSettings(mergedSettings);
      setQuizConfig((prev) => ({
        ...prev,
        lessonIds: (initial.lessons || []).map((l) => l.id),
        direction: mergedSettings.defaultDirection,
        requireArticle: mergedSettings.requireArticle,
        requireAccents: mergedSettings.requireAccents,
        spellingStrictness: mergedSettings.spellingStrictness,
        acceptAlternatives: mergedSettings.acceptAlternatives,
      }));
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Dauerhaft in IndexedDB speichern bei Änderungen
  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => {
      savePersistedState({ folders, lessons, vocabs, stats, settings });
    }, 250);
    return () => clearTimeout(timer);
  }, [hydrated, folders, lessons, vocabs, stats, settings]);

  // PWA Manifest & Install-Prompt registrieren
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    try {
      const manifest = {
        name: 'VocaLearn – Vokabeltrainer',
        short_name: 'VocaLearn',
        description: 'Moderner Deutsch-Französisch Vokabeltrainer mit lokalem Scanner & Spaced Repetition',
        start_url: '.',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#4f46e5',
        lang: 'de',
      };
      const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
      const url = URL.createObjectURL(blob);
      let link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'manifest';
        document.head.appendChild(link);
      }
      link.href = url;
      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        URL.revokeObjectURL(url);
      };
    } catch {
      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      };
    }
  }, []);

  // Quiz-Ergebnis & Spaced Repetition verbuchen
  const handleRecordResult = useCallback(
    (vocabId: string, isCorrect: boolean, durationSeconds: number = 5) => {
      setVocabs((prev) =>
        prev.map((v) => (v.id === vocabId ? applySpacedRepetition(v, isCorrect) : v))
      );

      setStats((prev) => {
        const todayKey = getTodayKey();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayKey = getTodayKey(yesterday);

        let nextStreak = prev.streakDays;
        if (prev.lastStudyDate === todayKey) {
          nextStreak = Math.max(1, prev.streakDays);
        } else if (prev.lastStudyDate === yesterdayKey) {
          nextStreak = prev.streakDays + 1;
        } else {
          nextStreak = 1;
        }

        const earnedPoints = isCorrect ? 10 : 2;
        const currentDay = prev.dailyHistory[todayKey] || {
          studied: 0,
          correct: 0,
          wrong: 0,
          seconds: 0,
          points: 0,
        };

        return {
          ...prev,
          points: prev.points + earnedPoints,
          streakDays: nextStreak,
          lastStudyDate: todayKey,
          totalCorrect: prev.totalCorrect + (isCorrect ? 1 : 0),
          totalWrong: prev.totalWrong + (isCorrect ? 0 : 1),
          dailyHistory: {
            ...prev.dailyHistory,
            [todayKey]: {
              studied: currentDay.studied + 1,
              correct: currentDay.correct + (isCorrect ? 1 : 0),
              wrong: currentDay.wrong + (isCorrect ? 0 : 1),
              seconds: currentDay.seconds + durationSeconds,
              points: currentDay.points + earnedPoints,
            },
          },
        };
      });
    },
    []
  );

  const handleSaveScannedVocabs = (
    lessonId: string | null,
    newLessonName: string,
    folderId: string | null,
    items: ScannedPair[]
  ) => {
    const now = Date.now();
    let targetLessonId = lessonId;

    if (!targetLessonId) {
      const created: LessonItem = {
        id: generateId(),
        name: newLessonName.trim() || `Gescannte Lektion (${new Date().toLocaleDateString('de-DE')})`,
        folderId,
        createdAt: now,
        updatedAt: now,
      };
      targetLessonId = created.id;
      setLessons((prev) => [created, ...prev]);
    } else {
      setLessons((prev) =>
        prev.map((l) => (l.id === targetLessonId ? { ...l, updatedAt: now } : l))
      );
    }

    const newVocabs: VocabItem[] = items.map((p) => ({
      id: generateId(),
      lessonId: targetLessonId!,
      de: p.de.trim(),
      fr: p.fr.trim(),
      altDe: p.altDe
        .split(/[;,]/)
        .map((s) => s.trim())
        .filter(Boolean),
      altFr: p.altFr
        .split(/[;,]/)
        .map((s) => s.trim())
        .filter(Boolean),
      status: 'new',
      correctCount: 0,
      wrongCount: 0,
      streak: 0,
      easeFactor: 2.5,
      interval: 0,
      nextReview: now,
      lastReviewed: null,
    }));

    setVocabs((prev) => [...newVocabs, ...prev]);
    setQuizConfig((prev) => ({
      ...prev,
      lessonIds: Array.from(new Set([...prev.lessonIds, targetLessonId!])),
    }));
    showToast(`${newVocabs.length} Vokabeln erfolgreich gespeichert!`, 'success');
    setActiveTab('library');
  };

  const openQuizSetupForLessons = (lessonIds: string[], filter: QuizConfig['filter'] = 'all') => {
    setQuizConfig((prev) => ({
      ...prev,
      lessonIds: lessonIds.length > 0 ? lessonIds : lessons.map((l) => l.id),
      filter,
      requireArticle: settings.requireArticle,
      requireAccents: settings.requireAccents,
      spellingStrictness: settings.spellingStrictness,
      acceptAlternatives: settings.acceptAlternatives,
    }));
    setActiveTab('quiz-setup');
  };

  const startPracticeMistakes = (mode: QuizMode = 'written') => {
    const allIds = lessons.map((l) => l.id);
    if (hardVocabs.length === 0) {
      showToast('Du hast aktuell keine Fehler zum Üben!', 'info');
      return;
    }
    setQuizConfig((prev) => ({
      ...prev,
      lessonIds: allIds,
      filter: 'wrong',
      mode,
      count: 'all',
      shuffle: true,
      requireArticle: settings.requireArticle,
      requireAccents: settings.requireAccents,
      spellingStrictness: settings.spellingStrictness,
      acceptAlternatives: settings.acceptAlternatives,
    }));
    setActiveTab('quiz-run');
  };

  const handleImportBackup = (data: PersistedState, merge: boolean) => {
    if (merge) {
      setFolders((prev) => {
        const ids = new Set(prev.map((f) => f.id));
        return [...prev, ...(data.folders || []).filter((f) => !ids.has(f.id))];
      });
      setLessons((prev) => {
        const ids = new Set(prev.map((l) => l.id));
        return [...prev, ...(data.lessons || []).filter((l) => !ids.has(l.id))];
      });
      setVocabs((prev) => {
        const ids = new Set(prev.map((v) => v.id));
        return [...prev, ...(data.vocabs || []).filter((v) => !ids.has(v.id))];
      });
      showToast('Backup erfolgreich zusammengeführt!', 'success');
    } else {
      setFolders(data.folders || []);
      setLessons(data.lessons || []);
      setVocabs(data.vocabs || []);
      if (data.stats) setStats({ ...DEFAULT_STATS, ...data.stats });
      if (data.settings) {
        setSettings((prev) => ({
          ...DEFAULT_SETTINGS,
          ...data.settings,
          geminiApiKey: data.settings.geminiApiKey || prev.geminiApiKey || '',
        }));
      }
      showToast('Backup vollständig wiederhergestellt!', 'success');
    }
  };

  const handleResetAll = () => {
    const fresh = createInitialDemoState();
    setFolders(fresh.folders);
    setLessons(fresh.lessons);
    setVocabs(fresh.vocabs);
    setStats(fresh.stats);
    setSettings(fresh.settings);
    setQuizConfig((prev) => ({ ...prev, lessonIds: fresh.lessons.map((l) => l.id) }));
    showToast('Alle Daten wurden zurückgesetzt.', 'info');
  };

  const hardVocabs = useMemo(
    () => vocabs.filter((v) => v.status === 'hard' || (v.wrongCount > 0 && v.status !== 'mastered')),
    [vocabs]
  );

  const dark = settings.theme === 'dark';

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Startseite', icon: <Home className="w-5 h-5" /> },
    { id: 'scanner', label: 'Vokabeln scannen', icon: <Camera className="w-5 h-5" /> },
    { id: 'library', label: 'Meine Vokabellisten', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'quiz-setup', label: 'Quiz starten', icon: <Play className="w-5 h-5" /> },
    { id: 'flashcards', label: 'Karteikarten', icon: <Layers className="w-5 h-5" /> },
    {
      id: 'mistakes',
      label: 'Meine Fehler',
      icon: <AlertCircle className="w-5 h-5" />,
      badge: hardVocabs.length,
    },
    { id: 'stats', label: 'Statistiken', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'settings', label: 'Einstellungen', icon: <Settings className="w-5 h-5" /> },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView
            dark={dark}
            lessons={lessons}
            vocabs={vocabs}
            stats={stats}
            settings={settings}
            onNavigate={(tab) => setActiveTab(tab)}
            onStartQuickLearn={() => openQuizSetupForLessons(lessons.map((l) => l.id), 'all')}
            onPracticeMistakes={() => startPracticeMistakes('written')}
            onStartQuizForLesson={(lessonId) => openQuizSetupForLessons([lessonId], 'all')}
          />
        );
      case 'scanner':
        return (
          <ScannerView
            dark={dark}
            lessons={lessons}
            folders={folders}
            geminiApiKey={settings.geminiApiKey || ''}
            showToast={showToast}
            onSaveVocabs={handleSaveScannedVocabs}
          />
        );
      case 'library':
        return (
          <LibraryView
            dark={dark}
            folders={folders}
            lessons={lessons}
            vocabs={vocabs}
            speechRate={settings.speechRate}
            setFolders={setFolders}
            setLessons={setLessons}
            setVocabs={setVocabs}
            showToast={showToast}
            requestConfirm={(d) => setConfirmDialog(d)}
            onStartQuizForLessons={(ids) => openQuizSetupForLessons(ids, 'all')}
            onOpenFlashcards={(ids) => {
              setFlashcardLessonIds(ids);
              setActiveTab('flashcards');
            }}
          />
        );
      case 'quiz-setup':
        return (
          <QuizSetupView
            dark={dark}
            lessons={lessons}
            vocabs={vocabs}
            config={quizConfig}
            setConfig={setQuizConfig}
            showToast={showToast}
            onStart={() => {
              if (quizConfig.mode === 'flashcards') {
                setFlashcardLessonIds(quizConfig.lessonIds);
                setActiveTab('flashcards');
              } else {
                setActiveTab('quiz-run');
              }
            }}
          />
        );
      case 'quiz-run':
        return (
          <QuizRunnerView
            dark={dark}
            config={quizConfig}
            vocabs={vocabs}
            speechRate={settings.speechRate}
            onRecordResult={handleRecordResult}
            showToast={showToast}
            onRepeatAll={() => setActiveTab('quiz-run')}
            onRepeatMistakes={() => startPracticeMistakes(quizConfig.mode)}
            onGoHome={() => setActiveTab('dashboard')}
            onGoSetup={() => setActiveTab('quiz-setup')}
          />
        );
      case 'flashcards':
        return (
          <FlashcardsView
            dark={dark}
            lessons={lessons}
            vocabs={vocabs}
            initialLessonIds={flashcardLessonIds}
            speechRate={settings.speechRate}
            onRecordResult={handleRecordResult}
            showToast={showToast}
          />
        );
      case 'mistakes':
        return (
          <MistakesView
            dark={dark}
            hardVocabs={hardVocabs}
            lessons={lessons}
            speechRate={settings.speechRate}
            showToast={showToast}
            onPracticeMistakes={(mode) => startPracticeMistakes(mode)}
            onMarkMastered={(id) => {
              setVocabs((prev) =>
                prev.map((v) =>
                  v.id === id ? { ...v, status: 'mastered', streak: Math.max(3, v.streak) } : v
                )
              );
              showToast('Als beherrscht markiert!', 'success');
            }}
          />
        );
      case 'stats':
        return (
          <StatsView
            dark={dark}
            lessons={lessons}
            vocabs={vocabs}
            stats={stats}
            settings={settings}
          />
        );
      case 'settings':
        return (
          <SettingsView
            dark={dark}
            settings={settings}
            setSettings={setSettings}
            folders={folders}
            lessons={lessons}
            vocabs={vocabs}
            stats={stats}
            deferredInstallPrompt={deferredInstallPrompt}
            onClearInstallPrompt={() => setDeferredInstallPrompt(null)}
            showToast={showToast}
            requestConfirm={(d) => setConfirmDialog(d)}
            onImportBackup={handleImportBackup}
            onResetAll={handleResetAll}
          />
        );
      default:
        return null;
    }
  };

  return (
    <AppErrorBoundary>
      <div className={dark ? 'dark' : ''}>
        <style>{`
          .flip-card { perspective: 1200px; }
          .flip-inner { transform-style: preserve-3d; transition: transform 0.55s cubic-bezier(.22,1,.36,1); }
          .flip-inner.flipped { transform: rotateY(180deg); }
          .flip-face { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
          .flip-back { transform: rotateY(180deg); }
          @media print {
            .no-print { display: none !important; }
            body { background: #ffffff !important; color: #000000 !important; }
          }
        `}</style>

        <div
          className={`min-h-screen flex transition-colors ${
            dark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
          }`}
        >
          {/* Desktop Sidebar */}
          <aside
            className={`no-print hidden lg:flex lg:flex-col w-68 shrink-0 border-r sticky top-0 h-screen p-4 ${
              dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between px-2 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#58CC02] to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md">
                  V
                </div>
                <div>
                  <div className="font-black text-xl tracking-tight leading-none">VocaLearn</div>
                  <div className="text-[11px] font-bold text-slate-400">DE ↔ FR Trainer</div>
                </div>
              </div>
              <button
                onClick={() =>
                  setSettings((s) => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' }))
                }
                className={`p-2 rounded-xl ${
                  dark ? 'bg-slate-800 text-amber-400' : 'bg-slate-100 text-slate-600'
                }`}
                title="Farbschema wechseln"
              >
                {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>

            <nav className="flex-1 space-y-1.5 overflow-y-auto">
              {navItems.map((item) => {
                const isActive =
                  activeTab === item.id ||
                  (item.id === 'quiz-setup' && activeTab === 'quiz-run');
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-extrabold text-sm transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                        : dark
                        ? 'text-slate-300 hover:bg-slate-800'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      {item.icon}
                      {item.label}
                    </span>
                    {typeof item.badge === 'number' && item.badge > 0 && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-black ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-rose-500 text-white'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div
              className={`mt-4 p-3.5 rounded-2xl border text-xs ${
                dark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between font-extrabold mb-1">
                <span className="flex items-center gap-1 text-amber-500">
                  <Flame className="w-4 h-4" /> {stats.streakDays} Tage
                </span>
                <span className="text-indigo-500">{stats.points} XP</span>
              </div>
              <div className="text-[11px] text-slate-400">
                100 % lokal gespeichert (IndexedDB)
              </div>
            </div>
          </aside>

          {/* Mobiler Header + Hauptbereich */}
          <div className="flex-1 flex flex-col min-w-0">
            <header
              className={`no-print lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b backdrop-blur-md ${
                dark
                  ? 'bg-slate-900/90 border-slate-800'
                  : 'bg-white/90 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800"
                  aria-label="Menü öffnen"
                >
                  <Menu className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#58CC02] to-indigo-600 flex items-center justify-center text-white font-black text-sm">
                    V
                  </div>
                  <span className="font-black text-lg tracking-tight">VocaLearn</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-amber-500 flex items-center gap-1">
                  <Flame className="w-4 h-4" /> {stats.streakDays}
                </span>
                <button
                  onClick={() =>
                    setSettings((s) => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' }))
                  }
                  className={`p-2 rounded-xl ${
                    dark ? 'bg-slate-800 text-amber-400' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              </div>
            </header>

            {/* Mobiles Menü-Drawer */}
            {mobileMenuOpen && (
              <div className="no-print fixed inset-0 z-50 lg:hidden flex">
                <div
                  className="fixed inset-0 bg-black/50 backdrop-blur-xs"
                  onClick={() => setMobileMenuOpen(false)}
                />
                <div
                  className={`relative z-10 w-72 max-w-[85vw] h-full p-4 flex flex-col shadow-2xl ${
                    dark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-6 px-2">
                    <span className="font-black text-xl">VocaLearn</span>
                    <button
                      onClick={() => setMobileMenuOpen(false)}
                      className="p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <nav className="flex-1 space-y-1.5 overflow-y-auto">
                    {navItems.map((item) => {
                      const isActive =
                        activeTab === item.id ||
                        (item.id === 'quiz-setup' && activeTab === 'quiz-run');
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveTab(item.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-extrabold text-sm ${
                            isActive
                              ? 'bg-indigo-600 text-white'
                              : dark
                              ? 'text-slate-300 hover:bg-slate-800'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            {item.icon}
                            {item.label}
                          </span>
                          {typeof item.badge === 'number' && item.badge > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-black bg-rose-500 text-white">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </nav>
                </div>
              </div>
            )}

            {/* Seiteninhalt */}
            <main className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
              {!hydrated ? (
                <div className="py-24 text-center text-slate-400 font-bold">
                  VocaLearn wird geladen…
                </div>
              ) : (
                renderContent()
              )}
            </main>
          </div>
        </div>

        <ToastContainer
          toasts={toasts}
          onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
        />
        <ConfirmDialog
          dark={dark}
          dialog={confirmDialog}
          onClose={() => setConfirmDialog(null)}
        />
      </div>
    </AppErrorBoundary>
  );
};

export default App;
