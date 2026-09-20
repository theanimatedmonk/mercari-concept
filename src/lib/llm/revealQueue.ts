import { PILL_REVEAL_MS } from './client.js';
import type { AnalysisAttribute } from './types.js';

export function createRevealQueue(
  onReveal: (attribute: AnalysisAttribute) => void,
  gapMs = PILL_REVEAL_MS,
) {
  const queue: AnalysisAttribute[] = [];
  const seen = new Set<string>();
  let timer = 0;
  let pumping = false;

  function flush() {
    const next = queue.shift();
    if (!next) {
      pumping = false;
      timer = 0;
      return;
    }
    pumping = true;
    onReveal(next);
    timer = window.setTimeout(flush, gapMs);
  }

  return {
    push(attribute: AnalysisAttribute) {
      if (seen.has(attribute.id)) return;
      seen.add(attribute.id);
      queue.push(attribute);
      if (!pumping) flush();
    },
    done() {
      return new Promise<void>((resolve) => {
        const check = () => {
          if (!pumping && queue.length === 0) resolve();
          else window.setTimeout(check, 40);
        };
        check();
      });
    },
    stop() {
      window.clearTimeout(timer);
      queue.length = 0;
      pumping = false;
    },
  };
}
