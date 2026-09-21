import type { Plugin } from 'vite';
import { serverRetrieveCatalog } from './src/lib/recommendation/serverRetrieve';
import { streamAnalyzeEvents } from './src/lib/llm/runAnalyze';
import { runStyleOnMe } from './src/lib/llm/styleOnMe';
import type { AnalyzeRequest, AnalyzeStreamEvent, StyleOnMeRequest } from './src/lib/llm/types';

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
      if (env.XAI_API_KEY) process.env.XAI_API_KEY = env.XAI_API_KEY;
      if (env.MYNTRA_AFFILIATE_FEED_URL) {
        process.env.MYNTRA_AFFILIATE_FEED_URL = env.MYNTRA_AFFILIATE_FEED_URL;
      }
      if (env.ALIEXPRESS_AFFILIATE_FEED_URL) {
        process.env.ALIEXPRESS_AFFILIATE_FEED_URL = env.ALIEXPRESS_AFFILIATE_FEED_URL;
      }
      if (env.LUXURYCLOSET_AFFILIATE_FEED_URL || env.LUXYRE_AFFILIATE_FEED_URL) {
        const luxury = env.LUXURYCLOSET_AFFILIATE_FEED_URL || env.LUXYRE_AFFILIATE_FEED_URL;
        process.env.LUXURYCLOSET_AFFILIATE_FEED_URL = luxury;
        process.env.LUXYRE_AFFILIATE_FEED_URL = luxury;
      }
      if (env.AMAZON_CREATORS_API_KEY) {
        process.env.AMAZON_CREATORS_API_KEY = env.AMAZON_CREATORS_API_KEY;
      }
      if (env.AMAZON_CREATORS_API_ENDPOINT) {
        process.env.AMAZON_CREATORS_API_ENDPOINT = env.AMAZON_CREATORS_API_ENDPOINT;
      }
      if (env.AMAZON_ASSOCIATE_TAG) process.env.AMAZON_ASSOCIATE_TAG = env.AMAZON_ASSOCIATE_TAG;
      if (env.AMAZON_MARKETPLACE) process.env.AMAZON_MARKETPLACE = env.AMAZON_MARKETPLACE;
      if (env.AMAZON_PAAPI_ACCESS_KEY) {
        process.env.AMAZON_PAAPI_ACCESS_KEY = env.AMAZON_PAAPI_ACCESS_KEY;
      }
      if (env.AMAZON_PAAPI_SECRET_KEY) {
        process.env.AMAZON_PAAPI_SECRET_KEY = env.AMAZON_PAAPI_SECRET_KEY;
      }
      if (env.AMAZON_SEARCH_INDEX) process.env.AMAZON_SEARCH_INDEX = env.AMAZON_SEARCH_INDEX;
      if (env.CATALOG_USE_MOCK_FALLBACK) {
        process.env.CATALOG_USE_MOCK_FALLBACK = env.CATALOG_USE_MOCK_FALLBACK;
      }
      if (env.KV_REST_API_URL) process.env.KV_REST_API_URL = env.KV_REST_API_URL;
      if (env.KV_REST_API_TOKEN) process.env.KV_REST_API_TOKEN = env.KV_REST_API_TOKEN;

      server.middlewares.use('/api/catalog/out', (req, res, next) => {
        if (req.method !== 'GET') {
          next();
          return;
        }
        const url = new URL(req.url ?? '/', 'http://localhost');
        const target = url.searchParams.get('target') ?? url.searchParams.get('url') ?? '';
        if (!target) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Missing target URL' }));
          return;
        }
        try {
          const parsed = new URL(target);
          res.statusCode = 302;
          res.setHeader('Location', parsed.toString());
          res.end();
        } catch {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Invalid target URL' }));
        }
      });

      server.middlewares.use('/api/catalog/search', (req, res, next) => {
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
            const body = JSON.parse(raw || '{}') as {
              queries?: string[];
              inspirationImageUrl?: string;
            };
            const queries = Array.isArray(body.queries)
              ? body.queries.filter((item): item is string => typeof item === 'string')
              : [];
            const products = await serverRetrieveCatalog(
              queries.length ? queries : ['evening dress'],
              typeof body.inspirationImageUrl === 'string'
                ? body.inspirationImageUrl
                : undefined,
            );
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ products }));
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Catalog search failed';
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: message }));
          }
        })();
      });

      server.middlewares.use('/api/style-on-me', (req, res, next) => {
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
            const body = JSON.parse(raw || '{}') as StyleOnMeRequest;
            const result = await runStyleOnMe(body);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Style it on me failed';
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: message }));
          }
        })();
      });

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
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache, no-transform');
            res.setHeader('Connection', 'keep-alive');
            const send = (event: AnalyzeStreamEvent) => {
              res.write(`data: ${JSON.stringify(event)}\n\n`);
            };
            await streamAnalyzeEvents(body, send);
            res.end();
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Analyze failed';
            if (!res.headersSent) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: message }));
              return;
            }
            res.write(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`);
            res.end();
          }
        })();
      });
    },
  };
}
