import type { Plugin } from 'vite';
import { runAnalyze } from './src/lib/llm/runAnalyze';
import type { AnalyzeRequest } from './src/lib/llm/types';

function readBody(req: { on: (event: string, cb: (chunk?: Buffer) => void) => void }) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => {
      if (chunk) chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export function analyzeDevPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'analyze-dev-api',
    configureServer(server) {
      if (env.GEMINI_API_KEY) process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
      if (env.XAI_API_KEY) process.env.XAI_API_KEY = env.XAI_API_KEY;
      if (env.LLM_PROVIDER) process.env.LLM_PROVIDER = env.LLM_PROVIDER;

      server.middlewares.use('/api/analyze', (req, res, next) => {
        void (async () => {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }
          if (req.method !== 'POST') {
            next();
            return;
          }
          try {
            const raw = await readBody(req);
            const body = JSON.parse(raw || '{}') as AnalyzeRequest;
            const result = await runAnalyze(body);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Analyze failed';
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: message }));
          }
        })();
      });
    },
  };
}
