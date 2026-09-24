import { dimensionCovered } from './intentQuery.js';
import { catalogFor, IMAGE_NUDGES, TEXT_NUDGES } from './nudgeCatalog.js';
import { EMPTY_NUDGE, type JevNudge, type JevNudgeRequest } from './types.js';

const JEV_URL = 'https://api.typesafe.ai/v1/systemone';
const MODEL = 'jev-latest';

const SCOPE_CRITERIA: Record<string, string> = {
  women:
    "Women's clothing, shoes, bags, jewelry, or a women's outfit. Lookmind can help.",
  other:
    "Not women's fashion: men's, kids, electronics, food, home, animals, beauty-only, or anything else.",
};

const TEXT_CRITERIA: Record<string, string> = {
  product: 'Garment type is missing (dress, top, shoes, bag, jewelry).',
  vibe: 'Style or vibe is missing (minimal, romantic, edgy, elegant).',
  fit: 'Fit or silhouette is missing (relaxed, fitted, bodycon).',
  occasion: 'Occasion or where they will wear it is missing.',
  avoid: 'Constraints or things to avoid are missing.',
  none: 'The query already has enough intent. Do not interrupt.',
};

const IMAGE_CRITERIA: Record<string, string> = {
  reference: 'They have not said what to take from the reference photo.',
  occasion: 'Occasion or where they will wear it is missing.',
  change: 'They have not said what should change from the reference.',
  avoid: 'Constraints or things to avoid are missing.',
  none: 'The query already has enough intent. Do not interrupt.',
};

function env(name: string) {
  const runtime = globalThis as { process?: { env?: Record<string, string | undefined> } };
  return runtime.process?.env?.[name];
}

function keysForQuestions(questions: string[]) {
  const keys: string[] = [];
  for (const question of questions) {
    const q = question.trim();
    if (!q) continue;
    for (const catalog of [TEXT_NUDGES, IMAGE_NUDGES]) {
      for (const [key, spec] of Object.entries(catalog)) {
        if (spec.question === q && !keys.includes(key)) keys.push(key);
      }
    }
  }
  return keys;
}

function skipKeys(text: string, hasImage: boolean, answeredQuestions: string[]) {
  const skip = new Set(keysForQuestions(answeredQuestions));
  for (const [key, spec] of Object.entries(catalogFor(hasImage))) {
    if (dimensionCovered(text, key, spec.options)) skip.add(key);
  }
  return skip;
}

function criteriaFor(hasImage: boolean, skip: Set<string>) {
  const criteria = { ...(hasImage ? IMAGE_CRITERIA : TEXT_CRITERIA) };
  for (const key of skip) {
    if (key !== 'none') delete criteria[key];
  }
  return criteria;
}

function pickNudge(
  choice: string | undefined,
  hasImage: boolean,
  skip: Set<string>,
  inScope: boolean,
): JevNudge {
  if (!inScope) return { ...EMPTY_NUDGE, inScope: false };
  if (!choice || choice === 'none' || skip.has(choice)) return EMPTY_NUDGE;
  const spec = catalogFor(hasImage)[choice];
  if (!spec) return EMPTY_NUDGE;
  return { key: choice, question: spec.question, options: spec.options, inScope: true };
}

export async function runJevNudge(request: JevNudgeRequest): Promise<JevNudge> {
  const text = request.text?.trim() ?? '';
  const hasImage = Boolean(request.hasImage);
  const answeredQuestions = request.answeredQuestions ?? [];
  if (!hasImage && !text) return EMPTY_NUDGE;

  const key = env('TYPESAFE_API_KEY');
  if (!key) throw new Error('TYPESAFE_API_KEY is not set');

  const skip = skipKeys(text, hasImage, answeredQuestions);

  const res = await fetch(JEV_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      state: {
        query: text,
        hasImage,
        answeredQuestions,
        task: "Lookmind is a women's clothing shopping assistant. Decide if the query is in scope for women's fashion. If it is, pick the single highest-value MISSING intent dimension. Never ask about budget. Do not ask for anything already in the query. Do not interpret a photo. Never repeat a dimension in answeredQuestions.",
      },
      questions: {
        scope: {
          type: 'choice',
          instructions:
            "Is this in scope for a women's clothing shopping assistant? If the text is empty or ambiguous fashion, choose women. Choose other only when the text clearly is not women's clothing. Do not use the photo.",
          criteria: SCOPE_CRITERIA,
        },
        next: {
          type: 'choice',
          instructions:
            'Which follow-up should Lookmind ask next? Choose none if nothing useful is missing, or if scope is other. Never choose budget. Never choose a dimension already answered.',
          criteria: criteriaFor(hasImage, skip),
        },
      },
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`TypeSafe Jev ${res.status}: ${detail.slice(0, 200)}`);
  }
  const body = (await res.json()) as {
    answers?: { scope?: { choice?: string }; next?: { choice?: string } };
  };
  const inScope = body.answers?.scope?.choice !== 'other';
  return pickNudge(body.answers?.next?.choice, hasImage, skip, inScope);
}
