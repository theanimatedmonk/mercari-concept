import { analyzeWithGrok } from './grok.js';
import type { AnalyzeRequest, AnalyzeResponse } from './types.js';

export async function runAnalyze(request: AnalyzeRequest): Promise<AnalyzeResponse> {
  const hasImage = Boolean(request.imageBase64);
  const hasText = Boolean(request.text?.trim());
  if (!hasImage && !hasText) {
    throw new Error('Provide an image or some text');
  }
  return analyzeWithGrok(request);
}
