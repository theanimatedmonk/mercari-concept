import { runJevNudge } from '../../src/lib/llm/jevNudge.js';
import { EMPTY_NUDGE, type JevNudgeRequest } from '../../src/lib/llm/types.js';

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

function asRequest(value: unknown): JevNudgeRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const row = value as Record<string, unknown>;
  return {
    text: typeof row.text === 'string' ? row.text : undefined,
    hasImage: Boolean(row.hasImage),
    answeredQuestions: Array.isArray(row.answeredQuestions)
      ? row.answeredQuestions.filter((item): item is string => typeof item === 'string')
      : undefined,
  };
}

function readJson(req: VercelReq): JevNudgeRequest {
  const body = req.body;
  if (typeof body === 'string') {
    try {
      return asRequest(JSON.parse(body || '{}'));
    } catch {
      return {};
    }
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
    const nudge = await runJevNudge(readJson(req));
    res.status(200).json(nudge);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'JEV nudge failed';
    res.status(500).json({ error: message, ...EMPTY_NUDGE });
  }
}
