export const config = {
  runtime: 'nodejs',
};

const ALLOWED = [
  'myntra.com',
  'www.myntra.com',
  'amazon.com',
  'www.amazon.com',
  'amzn.to',
  'amzn.eu',
];

type VercelReq = {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
};

type VercelRes = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelRes;
  json: (body: unknown) => void;
  end: () => void;
};

function readTarget(query: VercelReq['query']) {
  const raw = query?.target ?? query?.url;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' ? value.trim() : '';
}

function isAllowed(url: URL) {
  return ALLOWED.some(
    (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
  );
}

export default function handler(req: VercelReq, res: VercelRes) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const target = readTarget(req.query);
  if (!target) {
    res.status(400).json({ error: 'Missing target URL' });
    return;
  }

  try {
    const url = new URL(target);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      res.status(400).json({ error: 'Invalid URL protocol' });
      return;
    }
    if (!isAllowed(url)) {
      res.status(403).json({ error: 'Merchant host is not allowlisted' });
      return;
    }
    res.setHeader('Location', url.toString());
    res.status(302).end();
  } catch {
    res.status(400).json({ error: 'Invalid target URL' });
  }
}
