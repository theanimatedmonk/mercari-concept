import { catalogEnv } from './env.js';
import type { CatalogProduct } from './types.js';

type Envelope = {
  at: number;
  products: CatalogProduct[];
};

type FsPromises = {
  mkdir: (path: string, opts: { recursive: boolean }) => Promise<unknown>;
  readFile: (path: string, enc: 'utf8') => Promise<string>;
  writeFile: (path: string, data: string) => Promise<unknown>;
};

type PathMod = {
  join: (...parts: string[]) => string;
};

const memory = new Map<string, Envelope>();

function nodeProcess() {
  return (globalThis as {
    process?: { cwd?: () => string; env?: Record<string, string | undefined> };
  }).process;
}

async function nodeIo() {
  const load = Function('specifier', 'return import(specifier)') as (
    specifier: string,
  ) => Promise<unknown>;
  const [fs, path] = await Promise.all([
    load('node:fs/promises') as Promise<FsPromises>,
    load('node:path') as Promise<PathMod>,
  ]);
  return { fs, path };
}

function kvConfigured() {
  return Boolean(catalogEnv('KV_REST_API_URL') && catalogEnv('KV_REST_API_TOKEN'));
}

async function kvCommand(command: unknown[]) {
  const base = catalogEnv('KV_REST_API_URL');
  const token = catalogEnv('KV_REST_API_TOKEN');
  if (!base || !token) return null;
  const res = await fetch(base, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { result?: unknown };
  return body.result ?? null;
}

function parseEnvelope(raw: string, ttlMs: number): CatalogProduct[] | null {
  try {
    const parsed = JSON.parse(raw) as Envelope;
    if (!parsed || !Array.isArray(parsed.products) || typeof parsed.at !== 'number') {
      return null;
    }
    if (Date.now() - parsed.at > ttlMs) return null;
    return parsed.products;
  } catch {
    return null;
  }
}

async function filePath(key: string) {
  const { path } = await nodeIo();
  const dir = catalogEnv('VERCEL')
    ? '/tmp'
    : path.join(nodeProcess()?.cwd?.() || '.', '.cache', 'feeds');
  return { dir, file: path.join(dir, `${key}.json`) };
}

async function readFileCache(key: string, ttlMs: number) {
  try {
    const { fs } = await nodeIo();
    const { file } = await filePath(key);
    const raw = await fs.readFile(file, 'utf8');
    return parseEnvelope(raw, ttlMs);
  } catch {
    return null;
  }
}

async function writeFileCache(key: string, envelope: Envelope) {
  try {
    const { fs } = await nodeIo();
    const { dir, file } = await filePath(key);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(file, JSON.stringify(envelope));
  } catch {
    /* /tmp or .cache unavailable */
  }
}

async function readKvCache(key: string, ttlMs: number) {
  if (!kvConfigured()) return null;
  const raw = await kvCommand(['GET', `lookmind:feed:${key}`]);
  if (typeof raw !== 'string') return null;
  return parseEnvelope(raw, ttlMs);
}

async function writeKvCache(key: string, envelope: Envelope, ttlMs: number) {
  if (!kvConfigured()) return;
  const seconds = Math.max(60, Math.ceil(ttlMs / 1000));
  await kvCommand(['SET', `lookmind:feed:${key}`, JSON.stringify(envelope), 'EX', String(seconds)]);
}

export async function readParsedFeed(key: string, ttlMs: number) {
  const hot = memory.get(key);
  if (hot && Date.now() - hot.at <= ttlMs) return hot.products;

  const fromFile = await readFileCache(key, ttlMs);
  if (fromFile) {
    memory.set(key, { at: Date.now(), products: fromFile });
    return fromFile;
  }

  const fromKv = await readKvCache(key, ttlMs);
  if (fromKv) {
    memory.set(key, { at: Date.now(), products: fromKv });
    void writeFileCache(key, { at: Date.now(), products: fromKv });
    return fromKv;
  }

  return null;
}

export async function writeParsedFeed(key: string, products: CatalogProduct[], ttlMs: number) {
  const envelope: Envelope = { at: Date.now(), products };
  memory.set(key, envelope);
  await writeFileCache(key, envelope);
  void writeKvCache(key, envelope, ttlMs);
}
