import { analyzeWithGrok, analyzeWithGrokStream } from './grok.js';
import { splitPromptMedia } from './promptMedia.js';
import { resolveRemoteImage } from './resolveRemoteImage.js';
import type { AnalyzeRequest, AnalyzeResponse, AnalyzeStreamEvent } from './types.js';

async function prepareAnalyze(request: AnalyzeRequest): Promise<AnalyzeRequest> {
  let imageBase64 = request.imageBase64;
  let mimeType = request.mimeType;
  let imageUrl = request.imageUrl?.trim();
  let text = request.text?.trim() || '';

  if (!imageBase64 && !imageUrl && text) {
    const split = splitPromptMedia(text);
    if (split.url) {
      imageUrl = split.url;
      text = split.caption;
    }
  } else if (imageUrl && text) {
    const split = splitPromptMedia(text);
    if (split.url === imageUrl) text = split.caption;
  }

  if (!imageBase64 && imageUrl) {
    const image = await resolveRemoteImage(imageUrl);
    imageBase64 = image.imageBase64;
    mimeType = image.mimeType;
  }

  return {
    imageBase64,
    mimeType,
    text: text || undefined,
  };
}

function guardRequest(request: AnalyzeRequest) {
  const hasImage = Boolean(request.imageBase64);
  const hasText = Boolean(request.text?.trim());
  if (!hasImage && !hasText) {
    throw new Error('Provide an image or some text');
  }
}

export async function runAnalyze(request: AnalyzeRequest): Promise<AnalyzeResponse> {
  const prepared = await prepareAnalyze(request);
  guardRequest(prepared);
  return analyzeWithGrok(prepared);
}

export async function streamAnalyzeEvents(
  request: AnalyzeRequest,
  emit: (event: AnalyzeStreamEvent) => void,
): Promise<AnalyzeResponse> {
  const prepared = await prepareAnalyze(request);
  guardRequest(prepared);
  const seen = new Set<string>();
  const result = await analyzeWithGrokStream(prepared, (attribute) => {
    if (seen.has(attribute.id)) return;
    seen.add(attribute.id);
    emit({ type: 'attribute', attribute });
  });
  emit({ type: 'done', result });
  return result;
}
