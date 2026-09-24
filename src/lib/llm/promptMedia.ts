const URL_RE = /https?:\/\/[^\s<>"'`]+/i;

function trimTrailingPunctuation(url: string) {
  return url.replace(/[),.;!?]+$/g, '');
}

export function splitPromptMedia(text: string): { url: string | null; caption: string } {
  const trimmed = text.trim();
  if (!trimmed) return { url: null, caption: '' };
  const match = URL_RE.exec(trimmed);
  if (!match) return { url: null, caption: trimmed };
  const url = trimTrailingPunctuation(match[0]);
  const caption = `${trimmed.slice(0, match.index)} ${trimmed.slice(match.index + match[0].length)}`
    .replace(/\s+/g, ' ')
    .trim();
  return { url, caption };
}
