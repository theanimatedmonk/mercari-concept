import { useEffect, useRef, useState } from 'react';
import { requestJevNudge } from '../../lib/llm/client';
import { hasNudgeOption } from '../../lib/llm/intentQuery';
import { EMPTY_NUDGE, type JevNudge } from '../../lib/llm/types';

const DEBOUNCE_MS = 560;

function rememberAnswer(answered: string[], shown: JevNudge, text: string) {
  if (!shown.question) return answered;
  if (!shown.options.some((option) => hasNudgeOption(text, shown.key, option))) {
    return answered;
  }
  if (answered.includes(shown.question)) return answered;
  return [...answered, shown.question];
}

export default function useJevNudge(
  text: string,
  hasImage: boolean,
  enabled: boolean,
) {
  const [nudge, setNudge] = useState<JevNudge>(EMPTY_NUDGE);
  const answeredRef = useRef<string[]>([]);
  const shownRef = useRef<JevNudge>(EMPTY_NUDGE);

  useEffect(() => {
    if (!enabled) {
      setNudge((prev) => ({ ...EMPTY_NUDGE, inScope: prev.inScope }));
      return undefined;
    }
    const trimmed = text.trim();
    if (!hasImage && !trimmed) {
      answeredRef.current = [];
      shownRef.current = EMPTY_NUDGE;
      setNudge(EMPTY_NUDGE);
      return undefined;
    }

    answeredRef.current = rememberAnswer(answeredRef.current, shownRef.current, trimmed);

    const ac = new AbortController();
    const timer = window.setTimeout(() => {
      void requestJevNudge(
        {
          text: trimmed,
          hasImage,
          answeredQuestions: answeredRef.current,
        },
        ac.signal,
      )
        .then((next) => {
          if (ac.signal.aborted) return;
          if (next.question && answeredRef.current.includes(next.question)) {
            shownRef.current = EMPTY_NUDGE;
            setNudge(EMPTY_NUDGE);
            return;
          }
          shownRef.current = next;
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
  }, [text, hasImage, enabled]);

  return nudge;
}
