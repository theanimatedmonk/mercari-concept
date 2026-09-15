import { runAnalyze } from '../src/lib/llm/runAnalyze.js';
import type { AnalyzeRequest } from '../src/lib/llm/types.js';

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
};

type VercelReq = {
  method?: string;
  body?: unknown;
  on?: (event: string, cb: (chunk?: string | Uint8Array) => void) => void;
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

function asRequest(value: unknown): AnalyzeRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const row = value as Record<string, unknown>;
  return {
    imageBase64: typeof row.imageBase64 === 'string' ? row.imageBase64 : undefined,
    mimeType: typeof row.mimeType === 'string' ? row.mimeType : undefined,
    text: typeof row.text === 'string' ? row.text : undefined,
  };
}

function toText(value: unknown) {
  if (typeof value === 'string') return value;
  if (value instanceof Uint8Array) return new TextDecoder().decode(value);
  return '';
}

async function readJson(req: VercelReq): Promise<AnalyzeRequest> {
  if (typeof req.body === 'string' && req.body.trim()) {
    return asRequest(JSON.parse(req.body));
  }
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
    return asRequest(req.body);
  }
  if (typeof req.on !== 'function') return {};
  const raw = await new Promise<string>((resolve, reject) => {
    const chunks: string[] = [];
    req.on?.('data', (chunk) => {
      chunks.push(toText(chunk));
    });
    req.on?.('end', () => resolve(chunks.join('')));
    req.on?.('error', () => reject(new Error('Failed to read analyze body')));
  });
  return asRequest(JSON.parse(raw || '{}'));
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
  try {
    const body = await readJson(req);
    const result = await runAnalyze(body);
    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Analyze failed';
    res.status(500).json({ error: message });
  }
}
