import { serverRetrieveCatalog } from '../../src/lib/recommendation/serverRetrieve.js';

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
};

type SearchBody = {
  queries?: string[];
  inspirationImageUrl?: string;
};

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

function readBody(body: unknown): SearchBody {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return {};
  return body as SearchBody;
}

function asBody(value: unknown): unknown {
  if (typeof value === 'string' && value.trim()) {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return {};
    }
  }
  return value;
}

export default async function handler(req: VercelReq, res: VercelRes) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const payload = readBody(asBody(req.body));
    const queries = Array.isArray(payload.queries)
      ? payload.queries.filter((item): item is string => typeof item === 'string')
      : [];
    const products = await serverRetrieveCatalog(
      queries.length ? queries : ['evening dress'],
      typeof payload.inspirationImageUrl === 'string'
        ? payload.inspirationImageUrl
        : undefined,
    );
    res.status(200).json({ products });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Catalog search failed';
    res.status(500).json({ error: message });
  }
}
