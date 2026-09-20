import { AnimatePresence, motion } from 'framer-motion';
import type { AnalysisAttribute } from '../../lib/llm/types';

export const GENERATE_BEAT_MS = 1400;
const SCAN_COLS = 12;
const SCAN_ROWS = 16;
const SCAN_DOTS = SCAN_COLS * SCAN_ROWS;

type Props = {
  imageSrc: string | null;
  context: string;
  beats: AnalysisAttribute[];
  beat: number;
  waiting: boolean;
  compact?: boolean;
  layoutId?: string;
};

export default function GeneratingHero({
  imageSrc,
  context,
  beats,
  beat,
  waiting,
  compact = false,
  layoutId,
}: Props) {
  const current = beats[beat];
  const visibleTags = beats.slice(0, beat + 1);
  const statusText = waiting
    ? imageSrc
      ? 'Looking at this'
      : 'Reading this'
    : current?.text ?? 'Finding the thread';
  const promptTags = (
    <AnimatePresence>
      {visibleTags.map((item) => (
        <motion.span
          key={item.id}
          className={`inspiration__tag inspiration__tag--${item.tagSide ?? 'left'}`}
          initial={{ opacity: 0, scale: 0.72 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 140, damping: 16 }}
        >
          {item.label}
        </motion.span>
      ))}
    </AnimatePresence>
  );

  return (
    <div
      className={`inspiration__hero${imageSrc ? '' : ' inspiration__hero--prompt'}${compact ? ' inspiration__hero--canvas' : ''}`}
    >
      {imageSrc ? (
        <div className="inspiration__hero-stage">
          <motion.div
            layoutId={layoutId}
            className="inspiration__hero-frame"
            transition={{ type: 'spring', stiffness: 80, damping: 18, mass: 1.05 }}
          >
            <img className="inspiration__hero-img" src={imageSrc} alt="Inspiration" />
            <div className="inspiration__scan" aria-hidden>
              {Array.from({ length: SCAN_DOTS }, (_, i) => {
                const col = i % SCAN_COLS;
                const row = Math.floor(i / SCAN_COLS);
                const delay = ((col * 0.09 + row * 0.06) % 2.2).toFixed(2);
                return (
                  <span
                    key={i}
                    className="inspiration__scan-dot"
                    style={{ animationDelay: `${delay}s` }}
                  />
                );
              })}
            </div>
          </motion.div>
          {promptTags}
        </div>
      ) : (
        <div className="inspiration__hero-stage inspiration__hero-stage--prompt">
          <div className="inspiration__prompt-wrap">
            <p className="inspiration__prompt">{context.trim()}</p>
            {promptTags}
          </div>
        </div>
      )}
      <AnimatePresence mode="wait">
        <motion.p
          key={waiting ? 'waiting' : current?.id ?? 'status'}
          className="inspiration__status-copy"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.32 }}
        >
          {statusText}
          <span className="inspiration__ellipsis" aria-hidden>
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
