import { useEffect, useState } from 'react';
import { requestJevNudge } from '../../lib/llm/client';
import { dimensionCovered } from '../../lib/llm/intentQuery';
import { firstImageNudge, IMAGE_REFERENCE_OPTIONS } from '../../lib/llm/nudgeCatalog';
import { EMPTY_NUDGE, type JevNudge } from '../../lib/llm/types';

const DEBOUNCE_MS = 560;

function needsFirstImageNudge(text: string, hasImage: boolean) {
  return hasImage && !dimensionCovered(text, 'reference', IMAGE_REFERENCE_OPTIONS);
}

export default function useJevNudge(
  text: string,
  hasImage: boolean,
  enabled: boolean,
  imageLeadReady = true,
) {
  const [nudge, setNudge] = useState<JevNudge>(EMPTY_NUDGE);

  useEffect(() => {
    if (!enabled) {
      setNudge((prev) => ({ ...EMPTY_NUDGE, inScope: prev.inScope }));
      return undefined;
    }
    const trimmed = text.trim();
    if (!hasImage && !trimmed) {
      setNudge(EMPTY_NUDGE);
      return undefined;
    }

    if (needsFirstImageNudge(trimmed, hasImage)) {
      setNudge(imageLeadReady ? firstImageNudge() : EMPTY_NUDGE);
      return undefined;
    }

    const ac = new AbortController();
    const timer = window.setTimeout(() => {
      void requestJevNudge({ text: trimmed, hasImage }, ac.signal)
        .then((next) => {
          if (ac.signal.aborted) return;
          setNudge(next);
        })
        .catch((error: unknown) => {
          if (ac.signal.aborted) return;
          if (error instanceof DOMException && error.name === 'AbortError') return;
          setNudge((prev) => ({ ...EMPTY_NUDGE, inScope: prev.inScope }));
        });
    }, DEBOUNCE_MS);

    return () => {
      ac.abort();
      window.clearTimeout(timer);
    };
  }, [text, hasImage, enabled, imageLeadReady]);

  return nudge;
}
