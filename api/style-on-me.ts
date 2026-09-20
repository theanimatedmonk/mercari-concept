import { runStyleOnMe } from '../src/lib/llm/styleOnMe.js';
import type { StyleOnMeRequest } from '../src/lib/llm/types.js';

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
  end: () => void;
};

function cors(res: VercelRes) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function asRequest(value: unknown): StyleOnMeRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { userImageBase64: '' };
  }
  const row = value as Record<string, unknown>;
  return {
    productImageUrl: typeof row.productImageUrl === 'string' ? row.productImageUrl : undefined,
    productImageBase64:
      typeof row.productImageBase64 === 'string' ? row.productImageBase64 : undefined,
    productMimeType: typeof row.productMimeType === 'string' ? row.productMimeType : undefined,
    userImageBase64: typeof row.userImageBase64 === 'string' ? row.userImageBase64 : '',
    userMimeType: typeof row.userMimeType === 'string' ? row.userMimeType : undefined,
    productName: typeof row.productName === 'string' ? row.productName : undefined,
  };
}

function readJson(req: VercelReq): StyleOnMeRequest {
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
    const result = await runStyleOnMe(readJson(req));
    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Style it on me failed';
    res.status(500).json({ error: message });
  }
}
