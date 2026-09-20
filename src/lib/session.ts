import type { SemanticAttribute } from '../types.js';
import type { AnalyzeResponse } from './llm/types.js';
import type { StyleJob } from '../stages/SemanticStudio/styleOnMeTypes.js';

export type SessionSelfie = {
  preview: string;
  imageBase64: string;
  mimeType: string;
};

export type StudioSession = {
  version: 1;
  stage: 'sculpt';
  imageSrc: string | null;
  analysis: AnalyzeResponse;
  attributes: SemanticAttribute[];
  moves: number;
  coachDone: boolean;
  selfie: SessionSelfie | null;
  jobs: StyleJob[];
  dockOpen: boolean;
};

const DB_NAME = 'mercari-session';
const STORE = 'kv';
const KEY = 'studio';
const SAVE_MS = 400;

let cache: StudioSession | null = null;
let saveTimer = 0;
let dbPromise: Promise<IDBDatabase> | null = null;

function empty(): Partial<StudioSession> {
  return {
    version: 1,
    stage: 'sculpt',
    imageSrc: null,
    attributes: [],
    moves: 0,
    coachDone: false,
    selfie: null,
    jobs: [],
    dockOpen: false,
  };
}

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function persistableImage(src: string | null) {
  if (!src) return null;
  if (
    src.startsWith('data:') ||
    src.startsWith('http://') ||
    src.startsWith('https://') ||
    src.startsWith('/')
  ) {
    return src;
  }
  if (!src.startsWith('blob:')) return src;
  try {
    const blob = await fetch(src).then((res) => res.blob());
    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
}

function persistableJobs(jobs: StyleJob[]) {
  return jobs.filter(
    (job) => job.status === 'done' && Boolean(job.generatedImage),
  );
}

export function peekSession() {
  return cache;
}

export async function hydrateSession() {
  try {
    const db = await openDb();
    const stored = await new Promise<StudioSession | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve((req.result as StudioSession | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
    cache = stored?.version === 1 && stored.analysis ? stored : null;
    return cache;
  } catch {
    cache = null;
    return null;
  }
}

function write(next: StudioSession) {
  cache = next;
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    void flushSession();
  }, SAVE_MS);
}

export async function flushSession() {
  window.clearTimeout(saveTimer);
  const next = cache;
  if (!next) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(STORE).put(next, KEY);
    });
  } catch {
    /* private mode / quota */
  }
}

export function patchSession(partial: Partial<StudioSession>) {
  if (!cache && !partial.analysis) return;
  const next = {
    ...empty(),
    ...cache,
    ...partial,
    version: 1 as const,
    stage: 'sculpt' as const,
    jobs: persistableJobs(partial.jobs ?? cache?.jobs ?? []),
  };
  if (!next.analysis) return;
  write(next as StudioSession);
}

export async function startSession(input: {
  imageSrc: string | null;
  analysis: AnalyzeResponse;
}) {
  const imageSrc = await persistableImage(input.imageSrc);
  const next: StudioSession = {
    version: 1,
    stage: 'sculpt',
    imageSrc,
    analysis: input.analysis,
    attributes: [],
    moves: 0,
    coachDone: false,
    selfie: null,
    jobs: [],
    dockOpen: false,
  };
  cache = next;
  await flushSession();
  return next;
}

export async function clearSession() {
  cache = null;
  window.clearTimeout(saveTimer);
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(STORE).delete(KEY);
    });
  } catch {
    /* ignore */
  }
}
