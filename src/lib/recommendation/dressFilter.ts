const DRESS_WORDS =
  /\b(dress|dresses|gown|gowns|frock|sundress|saree|sari|lehenga|anarkali|kaftan|wedding guest)\b/i;

const DRESS_CUTS = /\b(midi|maxi|mini|sheath|slip|column)\b/i;

const NOT_DRESS =
  /\b(shoe|shoes|heel|heels|sandal|sandals|boot|boots|sneaker|sneakers|pump|pumps|loafer|flat|flats|mule|espadrille|pant|pants|trouser|trousers|jean|jeans|legging|leggings|joggers|jumpsuit|romper|playsuit|skirt|skort|top|tops|blouse|tee|t-shirt|tshirt|shirt|shirts|jacket|blazer|sweater|hoodie|sweatshirt|cardigan|shrug|bag|bags|clutch|tote|earring|necklace|ring|bracelet|belt|hat|cap|scarf|shorts|brief|bra|lingerie|swim|bikini|watch|sunglass|sunglasses|vest|tunic)\b/i;

const BLOCKED_IMAGES = new Set([
  'architectural-evening.jpg',
  'boho-maxi.jpg',
  'casual-tee.jpg',
  'denim-wrong.jpg',
  'draped-column.jpg',
  'editorial-coatdress.jpg',
  'elegant-midi.jpg',
  'experimental-structured.jpg',
  'leather-wrong.jpg',
  'menswear-wrong.jpg',
  'minimal-oneshoulder.jpg',
  'modern-tailored.jpg',
  'oversized-casual.jpg',
  'refined-satin.jpg',
  'romantic-floral.jpg',
  'runway-black.jpg',
  'satin-midi.jpg',
  'sharp-midi.jpg',
  'soft-architectural.jpg',
  'street-casual.jpg',
  'structured-evening.jpg',
  'tailored-column.jpg',
  'vintage-knit.jpg',
  'wearable-neckline.jpg',
]);

export function isDressProduct(title: string, category = '') {
  const hay = `${title} ${category}`;
  if (/\b(dress|gown)s?\s+(shoe|heel|sandal|boot|pant|jean|trouser)s?\b/i.test(hay)) {
    return false;
  }
  if (DRESS_WORDS.test(hay)) return true;
  if (NOT_DRESS.test(hay)) return false;
  return DRESS_CUTS.test(hay);
}

export function isDressImage(image = '') {
  const file = image.split('/').pop()?.split('?')[0] ?? '';
  return !BLOCKED_IMAGES.has(file);
}

export function isDressListing(title: string, category = '', image = '') {
  return isDressProduct(title, category) && isDressImage(image);
}
