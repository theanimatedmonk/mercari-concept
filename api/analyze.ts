import { runAnalyze } from '../src/lib/llm/runAnalyze.js';
import type { AnalyzeRequest } from '../src/lib/llm/types.js';

type VercelReq = {
  method?: string;
  body?: AnalyzeRequest;
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
    const body = req.body ?? {};
    const result = await runAnalyze({
      imageBase64: body.imageBase64,
      mimeType: body.mimeType,
      text: body.text,
    });
    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Analyze failed';
    res.status(500).json({ error: message });
  }
}
