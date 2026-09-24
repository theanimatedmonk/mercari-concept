import { resolveRemoteImage } from '../../src/lib/llm/resolveRemoteImage.js';

export const config = {
  runtime: 'nodejs',
  maxDuration: 20,
};

export const maxDuration = 20;

type VercelReq = {
  method?: string;
  body?: unknown;
};

type VercelRes = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelRes;
  json: (body: unknown) => void;
  end: () => void;
};

function cors(res: VercelRes) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function readUrl(value: unknown) {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return readUrl(parsed);
    } catch {
      return '';
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const url = (value as { url?: unknown }).url;
  return typeof url === 'string' ? url.trim() : '';
}

export default async function handler(req: VercelReq, res: VercelRes) {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const url = readUrl(req.body);
  if (!url) {
    res.status(400).json({ error: 'Paste a photo, Pinterest, or Instagram link' });
    return;
  }
  try {
    const image = await resolveRemoteImage(url);
    res.status(200).json(image);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Couldn't find a photo at that link.";
    res.status(422).json({ error: message });
  }
}
