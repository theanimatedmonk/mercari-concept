/** Naive title/description/tag scores for canvas pill ids. Unmatched ids stay absent (0). */
const KEYWORDS: Record<string, string[]> = {
  plum: ['plum', 'purple', 'violet', 'burgundy', 'wine', 'aubergine'],
  asymmetric: ['asymmetric', 'asymmetrical', 'one-shoulder', 'one shoulder', 'diagonal'],
  draped: ['drape', 'draped', 'wrap', 'cowl', 'cascade'],
  fluid: ['fluid', 'flowing', 'flow', 'chiffon', 'silk', 'satin'],
  definedWaist: ['waist', 'corset', 'belted', 'empire', 'cinch'],
  architectural: ['architectural', 'structured', 'sculpted', 'sharp'],
  modern: ['modern', 'contemporary', 'minimal'],
  elegant: ['elegant', 'evening', 'gown', 'formal', 'sophisticat', 'timeless'],
  sculptural: ['sculptural', 'volume', 'structured', 'corset'],
  statement: ['statement', 'bold', 'edgy', 'dramatic'],
  editorial: ['editorial', 'runway', 'fashion-forward'],
  weddingReady: ['wedding', 'bridal', 'guest', 'formal', 'evening', 'gown'],
  wearable: ['casual', 'everyday', 'wearable', 'comfortable'],
  interestingNeckline: [
    'neckline',
    'neck',
    'one-shoulder',
    'one shoulder',
    'cowl',
    'corset',
    'bardot',
    'v-neck',
  ],
  refined: ['refined', 'tailored', 'clean'],
  sophisticated: ['sophisticated', 'sophisticat', 'elegant'],
  timeless: ['timeless', 'classic'],
  minimal: ['minimal', 'simple', 'clean'],
  structured: ['structured', 'tailored', 'corset'],
  sharpLines: ['sharp', 'line', 'tailored'],
  soft: ['soft', 'knit'],
  feminine: ['feminine', 'floral'],
  flowing: ['flowing', 'flow', 'maxi'],
  delicate: ['delicate', 'lace'],
};

export function deriveAttributes(text: string): Record<string, number> {
  const hay = text.toLowerCase();
  const attributes: Record<string, number> = {};
  for (const [id, words] of Object.entries(KEYWORDS)) {
    let hits = 0;
    for (const word of words) {
      if (hay.includes(word)) hits += 1;
    }
    if (hits > 0) attributes[id] = Math.min(1, 0.55 + hits * 0.12);
  }
  return attributes;
}
