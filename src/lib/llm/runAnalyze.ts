import { analyzeWithGemini } from './gemini';
import { analyzeWithGrok } from './grok';
import type { AnalyzeRequest, AnalyzeResponse } from './types';

function env(name: string) {
  const runtime = globalThis as { process?: { env?: Record<string, string | undefined> } };
  return runtime.process?.env?.[name];
}

export async function runAnalyze(request: AnalyzeRequest): Promise<AnalyzeResponse> {
  const hasImage = Boolean(request.imageBase64);
  const hasText = Boolean(request.text?.trim());
  if (!hasImage && !hasText) {
    throw new Error('Provide an image or some text');
  }
  const provider = (env('LLM_PROVIDER') || 'gemini').toLowerCase();
  if (provider === 'grok') return analyzeWithGrok(request);
  return analyzeWithGemini(request);
}
