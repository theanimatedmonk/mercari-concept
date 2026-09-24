import { useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';

export const PLACEHOLDER_HINTS = [
  'Drop an inspo image',
  'Paste a Pinterest pin or URL',
  'Describe using voice',
] as const;

const TYPE_MS = 42;
const DELETE_MS = 24;
const HOLD_MS = 1600;
const GAP_MS = 320;
const SWAP_MS = 2800;

export default function useTypedPlaceholder(paused: boolean) {
  const reduceMotion = Boolean(useReducedMotion());
  const [text, setText] = useState(() => (reduceMotion ? PLACEHOLDER_HINTS[0] : ''));

  useEffect(() => {
    if (paused) return undefined;

    const phrases = PLACEHOLDER_HINTS;
    if (reduceMotion) {
      let index = 0;
      setText(phrases[0]);
      const id = window.setInterval(() => {
        index = (index + 1) % phrases.length;
        setText(phrases[index]);
      }, SWAP_MS);
      return () => window.clearInterval(id);
    }

    let index = 0;
    let char = 0;
    let deleting = false;
    let timer = 0;

    const tick = () => {
      const phrase = phrases[index];
      if (!deleting) {
        char += 1;
        setText(phrase.slice(0, char));
        if (char >= phrase.length) {
          deleting = true;
          timer = window.setTimeout(tick, HOLD_MS);
          return;
        }
        timer = window.setTimeout(tick, TYPE_MS);
        return;
      }
      char -= 1;
      setText(phrase.slice(0, Math.max(char, 0)));
      if (char <= 0) {
        deleting = false;
        index = (index + 1) % phrases.length;
        timer = window.setTimeout(tick, GAP_MS);
        return;
      }
      timer = window.setTimeout(tick, DELETE_MS);
    };

    timer = window.setTimeout(tick, GAP_MS);
    return () => window.clearTimeout(timer);
  }, [paused, reduceMotion]);

  return text;
}
