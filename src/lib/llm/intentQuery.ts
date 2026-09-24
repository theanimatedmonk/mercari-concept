import {
  IMAGE_LEAD,
  IMAGE_REFERENCE_OPTIONS,
  intentClause,
} from './nudgeCatalog.js';

function escapeRe(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function intentPattern(option: string) {
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRe(option)}(?:$|[^\\p{L}\\p{N}])`, 'iu');
}

export function hasIntent(query: string, option: string) {
  const needle = option.trim();
  if (!needle) return false;
  return intentPattern(needle).test(query);
}

export function hasNudgeOption(query: string, key: string, option: string) {
  const clause = intentClause(key, option);
  if (clause && hasIntent(query, clause)) return true;
  return Boolean(option.trim()) && hasIntent(query, option);
}

export function dimensionCovered(query: string, key: string, options: string[]) {
  if (key === 'reference') {
    const parsed = parseImageLead(query);
    return Boolean(
      parsed?.aspects.some((item) =>
        options.some((option) => option.toLowerCase() === item.toLowerCase()),
      ),
    );
  }
  return options.some((option) => hasNudgeOption(query, key, option));
}

function isReferenceOption(value: string) {
  return IMAGE_REFERENCE_OPTIONS.some(
    (item) => item.toLowerCase() === value.trim().toLowerCase(),
  );
}

function joinImageAspects(aspects: string[]) {
  if (aspects.length === 0) return '';
  if (aspects.length === 1) return `${IMAGE_LEAD} ${aspects[0]}`;
  if (aspects.length === 2) return `${IMAGE_LEAD} ${aspects[0]} and ${aspects[1]}`;
  return `${IMAGE_LEAD} ${aspects.slice(0, -1).join(', ')} and ${aspects[aspects.length - 1]}`;
}

function parseImageLead(query: string) {
  const match = new RegExp(`^${escapeRe(IMAGE_LEAD)}\\s+(.+)$`, 'i').exec(query.trim());
  if (!match) return null;
  const chunks = match[1]
    .split(/\s*,\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  const aspects: string[] = [];
  const tail: string[] = [];
  let inTail = false;
  for (const chunk of chunks) {
    if (inTail) {
      tail.push(chunk);
      continue;
    }
    const bits = chunk
      .split(/\s+and\s+/i)
      .map((part) => part.trim())
      .filter(Boolean);
    if (bits.length && bits.every(isReferenceOption)) {
      aspects.push(...bits);
    } else {
      inTail = true;
      tail.push(chunk);
    }
  }
  return { aspects, tail };
}

function formatImageLead(aspects: string[], tail: string[]) {
  const lead = joinImageAspects(aspects);
  if (!tail.length) return lead;
  if (!lead) return tail.join(', ');
  return `${lead}, ${tail.join(', ')}`;
}

function stripPhrase(query: string, phrase: string) {
  const needle = phrase.trim();
  if (!needle) return query.trim();
  return query
    .replace(new RegExp(`(?:,\\s*|\\s+and\\s+)${escapeRe(needle)}`, 'iu'), '')
    .replace(new RegExp(`^${escapeRe(needle)}(?:\\s*,\\s*|\\s+and\\s+|\\s+)`, 'iu'), '')
    .replace(new RegExp(`^${escapeRe(needle)}$`, 'iu'), '')
    .replace(/\s+,/g, ',')
    .replace(/,\s*,/g, ',')
    .replace(/^[\s,]+|[\s,]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function appendIntent(
  query: string,
  option: string,
  hasImage: boolean,
  key = '',
) {
  const opt = option.trim();
  const clause = intentClause(key, opt);
  const trimmed = query.trim();
  if (!opt || hasNudgeOption(trimmed, key, opt)) return trimmed;

  if (hasImage && key === 'reference') {
    const parsed = parseImageLead(trimmed);
    if (!trimmed) return joinImageAspects([opt]);
    if (parsed) return formatImageLead([...parsed.aspects, opt], parsed.tail);
    return `${trimmed}, ${opt}`;
  }

  if (!trimmed) return clause;
  return `${trimmed}, ${clause}`;
}

export function removeIntent(query: string, option: string, key = '') {
  const opt = option.trim();
  const clause = intentClause(key, opt);
  const trimmed = query.trim();
  if (!opt || !hasNudgeOption(trimmed, key, opt)) return trimmed;

  const parsed = parseImageLead(trimmed);
  if (parsed && parsed.aspects.some((item) => item.toLowerCase() === opt.toLowerCase())) {
    return formatImageLead(
      parsed.aspects.filter((item) => item.toLowerCase() !== opt.toLowerCase()),
      parsed.tail,
    );
  }

  let next = stripPhrase(trimmed, clause);
  if (clause.toLowerCase() !== opt.toLowerCase()) next = stripPhrase(next, opt);
  return next;
}

export function toggleIntent(
  query: string,
  option: string,
  hasImage: boolean,
  key = '',
) {
  return hasNudgeOption(query, key, option)
    ? removeIntent(query, option, key)
    : appendIntent(query, option, hasImage, key);
}
