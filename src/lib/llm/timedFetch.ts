/** Stay under Vercel Hobby's 10s cap so we return JSON instead of FUNCTION_INVOCATION_TIMEOUT. */
export const LLM_DEADLINE_MS = 7000;

export async function timedFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(LLM_DEADLINE_MS) });
  } catch (error) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new Error('The model took too long. Try a shorter description.');
    }
    throw error;
  }
}
