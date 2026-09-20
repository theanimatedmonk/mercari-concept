import { catalogEnv } from './env.js';

export type PaapiLocale = {
  host: string;
  region: string;
  marketplace: string;
  currency: string;
};

const LOCALES: Record<string, PaapiLocale> = {
  IN: {
    host: 'webservices.amazon.in',
    region: 'eu-west-1',
    marketplace: 'www.amazon.in',
    currency: 'INR',
  },
  US: {
    host: 'webservices.amazon.com',
    region: 'us-east-1',
    marketplace: 'www.amazon.com',
    currency: 'USD',
  },
};

function hex(bytes: Uint8Array) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function toArrayBuffer(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return hex(new Uint8Array(digest));
}

async function hmac(key: Uint8Array, value: string) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signed = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(value));
  return new Uint8Array(signed);
}

async function signingKey(secret: string, date: string, region: string, service: string) {
  const kDate = await hmac(new TextEncoder().encode(`AWS4${secret}`), date);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}

export function amazonLocale(): PaapiLocale {
  const code = (catalogEnv('AMAZON_MARKETPLACE') || 'IN').toUpperCase();
  return LOCALES[code] ?? LOCALES.IN;
}

export function amazonPaapiConfigured() {
  return Boolean(
    catalogEnv('AMAZON_PAAPI_ACCESS_KEY') &&
      catalogEnv('AMAZON_PAAPI_SECRET_KEY') &&
      catalogEnv('AMAZON_ASSOCIATE_TAG'),
  );
}

export async function searchPaapi(keywords: string): Promise<unknown> {
  const access = catalogEnv('AMAZON_PAAPI_ACCESS_KEY');
  const secret = catalogEnv('AMAZON_PAAPI_SECRET_KEY');
  const tag = catalogEnv('AMAZON_ASSOCIATE_TAG');
  const locale = amazonLocale();
  const path = '/paapi5/searchitems';
  const service = 'ProductAdvertisingAPI';
  const target = 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems';
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const payload = JSON.stringify({
    Keywords: keywords,
    SearchIndex: catalogEnv('AMAZON_SEARCH_INDEX') || 'Fashion',
    ItemCount: 10,
    PartnerTag: tag,
    PartnerType: 'Associates',
    Marketplace: locale.marketplace,
    Resources: [
      'Images.Primary.Large',
      'ItemInfo.Title',
      'ItemInfo.ByLineInfo',
      'Offers.Listings.Price',
    ],
  });

  const payloadHash = await sha256Hex(payload);
  const canonicalHeaders =
    `content-encoding:amz-1.0\n` +
    `content-type:application/json; charset=utf-8\n` +
    `host:${locale.host}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-target:${target}\n`;
  const signedHeaders = 'content-encoding;content-type;host;x-amz-date;x-amz-target';
  const canonicalRequest = [
    'POST',
    path,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');
  const credentialScope = `${dateStamp}/${locale.region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join('\n');
  const key = await signingKey(secret, dateStamp, locale.region, service);
  const signature = hex(await hmac(key, stringToSign));

  const res = await fetch(`https://${locale.host}${path}`, {
    method: 'POST',
    headers: {
      'content-encoding': 'amz-1.0',
      'content-type': 'application/json; charset=utf-8',
      host: locale.host,
      'x-amz-date': amzDate,
      'x-amz-target': target,
      Authorization: `AWS4-HMAC-SHA256 Credential=${access}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
    body: payload,
  });
  if (!res.ok) return { items: [] };
  return res.json();
}
