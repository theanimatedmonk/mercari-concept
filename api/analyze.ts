import { runAnalyze } from '../src/lib/llm/runAnalyze.js';
import type { AnalyzeRequest } from '../src/lib/llm/types.js';

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
};

export const maxDuration = 60;

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

function asRequest(value: unknown): AnalyzeRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const row = value as Record<string, unknown>;
  return {
    imageBase64: typeof row.imageBase64 === 'string' ? row.imageBase64 : undefined,
    mimeType: typeof row.mimeType === 'string' ? row.mimeType : undefined,
    text: typeof row.text === 'string' ? row.text : undefined,
  };
}

function readJson(req: VercelReq): AnalyzeRequest {
  const body = req.body;
  if (typeof body === 'string') {
    return asRequest(JSON.parse(body || '{}'));
  }
  return asRequest(body);
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
    const result = await runAnalyze(readJson(req));
    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Analyze failed';
    res.status(500).json({ error: message });
  }
}
