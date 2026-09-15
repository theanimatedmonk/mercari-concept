export function slugId(value: string, index: number) {
  const slug = value
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((part, i) =>
      i === 0 ? part.toLowerCase() : part.slice(0, 1).toUpperCase() + part.slice(1).toLowerCase(),
    )
    .join('');
  return slug || `attr${index}`;
}
