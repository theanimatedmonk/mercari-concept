import { analyzeWithGrok, analyzeWithGrokStream } from './grok.js';
import type { AnalyzeRequest, AnalyzeResponse, AnalyzeStreamEvent } from './types.js';

function guardRequest(request: AnalyzeRequest) {
  const hasImage = Boolean(request.imageBase64);
  const hasText = Boolean(request.text?.trim());
  if (!hasImage && !hasText) {
    throw new Error('Provide an image or some text');
  }
}

export async function runAnalyze(request: AnalyzeRequest): Promise<AnalyzeResponse> {
  guardRequest(request);
  return analyzeWithGrok(request);
}

export async function streamAnalyzeEvents(
  request: AnalyzeRequest,
  emit: (event: AnalyzeStreamEvent) => void,
): Promise<AnalyzeResponse> {
  guardRequest(request);
  const seen = new Set<string>();
  const result = await analyzeWithGrokStream(request, (attribute) => {
    if (seen.has(attribute.id)) return;
    seen.add(attribute.id);
    emit({ type: 'attribute', attribute });
  });
  emit({ type: 'done', result });
  return result;
}
