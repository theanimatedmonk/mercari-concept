import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { hasNudgeOption } from '../../lib/llm/intentQuery';

const SWAP_SPRING = { type: 'spring' as const, stiffness: 380, damping: 36, mass: 0.85 };
const CHIP_SPRING = { type: 'spring' as const, stiffness: 520, damping: 28, mass: 0.55 };

function keepNudgeAboveKeyboard(el: HTMLElement) {
  const vv = window.visualViewport;
  if (!vv) return;
  const visibleBottom = vv.offsetTop + vv.height;
  const overflow = el.getBoundingClientRect().bottom - visibleBottom + 12;
  if (overflow <= 1) return;
  const parent = el.closest(
    '.inspiration__bar, .studio-taste__sheet, .inspiration__sheet',
  );
  if (parent instanceof HTMLElement && parent.scrollHeight > parent.clientHeight + 1) {
    parent.scrollTop += overflow;
    return;
  }
  window.scrollBy(0, overflow);
}

type Props = {
  intentKey: string;
  question: string;
  options: string[];
  query: string;
  onToggle: (option: string) => void;
};

export default function JevNudge({
  intentKey,
  question,
  options,
  query,
  onToggle,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduceMotion = Boolean(useReducedMotion());
  const swap = reduceMotion ? { duration: 0 } : SWAP_SPRING;
  const chip = reduceMotion ? { duration: 0 } : CHIP_SPRING;

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const pin = () => keepNudgeAboveKeyboard(el);
    pin();
    const later = window.setTimeout(pin, 320);
    const vv = window.visualViewport;
    vv?.addEventListener('resize', pin);
    return () => {
      window.clearTimeout(later);
      vv?.removeEventListener('resize', pin);
    };
  }, [question, options]);

  if (!question || options.length < 3) return null;
  return (
    <div ref={rootRef} className="inspiration__nudge" role="group" aria-label={question}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={intentKey || question}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
          transition={swap}
        >
          <p className="inspiration__nudge-q">{question}</p>
          <motion.div
            className="inspiration__nudge-list"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: {
                transition: { staggerChildren: reduceMotion ? 0 : 0.035 },
              },
            }}
          >
            {options.map((option) => {
              const on = hasNudgeOption(query, intentKey, option);
              return (
                <motion.button
                  key={option}
                  type="button"
                  className={`inspiration__nudge-opt${on ? ' is-on' : ''}`}
                  aria-pressed={on}
                  variants={{
                    hidden: reduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.92 },
                    show: { opacity: 1, scale: 1 },
                  }}
                  whileHover={reduceMotion ? undefined : { scale: 1.045 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                  transition={chip}
                  onClick={() => onToggle(option)}
                >
                  {option}
                </motion.button>
              );
            })}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
