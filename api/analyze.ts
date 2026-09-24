import { runAnalyze, streamAnalyzeEvents } from '../src/lib/llm/runAnalyze.js';
import type { AnalyzeRequest, AnalyzeStreamEvent } from '../src/lib/llm/types.js';

export const config = {
  runtime: 'nodejs',
  maxDuration: 120,
};

export const maxDuration = 120;

type VercelReq = {
  method?: string;
  body?: unknown;
};

type VercelRes = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelRes;
  json: (body: unknown) => void;
  write?: (chunk: string) => void;
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
    imageUrl: typeof row.imageUrl === 'string' ? row.imageUrl : undefined,
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
  const wantsStream = Boolean(res.write);
  try {
    const body = readJson(req);
    if (!wantsStream) {
      const result = await runAnalyze(body);
      res.status(200).json(result);
      return;
    }
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.status(200);
    const send = (event: AnalyzeStreamEvent) => {
      res.write?.(`data: ${JSON.stringify(event)}\n\n`);
    };
    await streamAnalyzeEvents(body, send);
    res.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Analyze failed';
    if (wantsStream && res.write) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`);
      res.end();
      return;
    }
    res.status(500).json({ error: message });
  }
}
