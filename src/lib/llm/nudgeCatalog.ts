export type NudgeSpec = { question: string; options: string[] };

export const TEXT_NUDGES: Record<string, NudgeSpec> = {
  product: {
    question: 'What are you looking for?',
    options: ['dress', 'top', 'shoes', 'bag', 'jewelry'],
  },
  vibe: {
    question: 'What vibe are you going for?',
    options: ['minimal', 'romantic', 'edgy', 'elegant'],
  },
  fit: {
    question: 'What kind of fit?',
    options: ['relaxed', 'regular', 'fitted', 'bodycon'],
  },
  occasion: {
    question: 'Where are you wearing it?',
    options: ['date night', 'party', 'club', 'dinner'],
  },
  avoid: {
    question: 'Anything you want to avoid?',
    options: ['too short', 'too revealing', 'bright details', 'high heels'],
  },
};

export const IMAGE_NUDGES: Record<string, NudgeSpec> = {
  reference: {
    question: 'What do you like about this?',
    options: ['silhouette', 'color', 'vibe', 'details', 'overall look'],
  },
  occasion: {
    question: 'Where would you wear it?',
    options: ['date night', 'office', 'vacation', 'party'],
  },
  change: {
    question: 'Want to change anything?',
    options: ['more casual', 'more elegant', 'less fitted', 'longer', 'different color'],
  },
  avoid: {
    question: 'Anything you want to avoid?',
    options: ['too short', 'too revealing', 'bright details', 'high heels'],
  },
};

export const IMAGE_LEAD = 'Find something with this';
export const IMAGE_REFERENCE_OPTIONS = IMAGE_NUDGES.reference.options;

export function catalogFor(hasImage: boolean) {
  return hasImage ? IMAGE_NUDGES : TEXT_NUDGES;
}

export function keyForQuestion(question: string) {
  const q = question.trim();
  if (!q) return '';
  for (const catalog of [TEXT_NUDGES, IMAGE_NUDGES]) {
    for (const [key, spec] of Object.entries(catalog)) {
      if (spec.question === q) return key;
    }
  }
  return '';
}

export function intentClause(key: string, option: string) {
  const opt = option.trim();
  if (!opt) return '';
  switch (key) {
    case 'avoid':
      return /^avoid\s/i.test(opt) ? opt : `avoid ${opt}`;
    case 'vibe':
      return /vibe$/i.test(opt) ? opt : `${opt} vibe`;
    case 'fit':
      return /fit/i.test(opt) ? opt : `${opt} fit`;
    case 'occasion':
      return /^(for|at|on)\s/i.test(opt) ? opt : `for ${opt}`;
    default:
      return opt;
  }
}
