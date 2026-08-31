import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { listingTryOnBeats } from '../../data/listing';
import './StyleOnMe.css';

const SCAN_COLS = 12;
const SCAN_ROWS = 16;
const SCAN_DOTS = SCAN_COLS * SCAN_ROWS;
const BEAT_MS = 1400;
const REVEAL_MS = 700;

type Props = {
  selfie: string;
  result: string;
  onClose: () => void;
  onRevealed: () => void;
};

export default function StyleOnMe({ selfie, result, onClose, onRevealed }: Props) {
  const [beat, setBeat] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const onRevealedRef = useRef(onRevealed);
  onRevealedRef.current = onRevealed;
  const last = listingTryOnBeats.length - 1;

  useEffect(() => {
    const ticks = window.setInterval(() => {
      setBeat((n) => (n >= last ? n : n + 1));
    }, BEAT_MS);
    return () => window.clearInterval(ticks);
  }, [last]);

  useEffect(() => {
    if (beat < last || revealed) return;
    const id = window.setTimeout(() => {
      setRevealed(true);
      onRevealedRef.current();
    }, REVEAL_MS);
    return () => window.clearTimeout(id);
  }, [beat, last, revealed]);

  const line = listingTryOnBeats[beat];

  return (
    <div className="style-on-me" role="dialog" aria-modal="true" aria-labelledby="style-on-me-status">
      <button type="button" className="style-on-me__veil" aria-label="Close" onClick={onClose} />
      <button type="button" className="style-on-me__close" aria-label="Close" onClick={onClose}>
        <X size={18} />
      </button>
      <div className="style-on-me__stage">
        <div className="style-on-me__frame">
          <img
            className="style-on-me__img"
            src={revealed ? result : selfie}
            alt={revealed ? 'Styled on you' : 'Your photo'}
          />
          {!revealed ? (
            <div className="style-on-me__scan" aria-hidden>
              {Array.from({ length: SCAN_DOTS }, (_, i) => {
                const col = i % SCAN_COLS;
                const row = Math.floor(i / SCAN_COLS);
                const delay = ((col * 0.09 + row * 0.06) % 2.2).toFixed(2);
                return (
                  <span
                    key={i}
                    className="style-on-me__dot"
                    style={{ animationDelay: `${delay}s` }}
                  />
                );
              })}
            </div>
          ) : null}
        </div>
        <AnimatePresence mode="wait">
          <motion.p
            key={revealed ? 'done' : line}
            id="style-on-me-status"
            className="style-on-me__status"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.32 }}
          >
            {revealed ? 'Styled on you' : line}
            {revealed ? null : (
              <span className="style-on-me__ellipsis" aria-hidden>
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </span>
            )}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
