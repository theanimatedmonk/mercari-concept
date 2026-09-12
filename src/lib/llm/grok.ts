import type { AnalyzeRequest, AnalyzeResponse } from './types';

export async function analyzeWithGrok(_request: AnalyzeRequest): Promise<AnalyzeResponse> {
  throw new Error('Grok is not configured. Set LLM_PROVIDER=gemini or implement the Grok adapter.');
}
