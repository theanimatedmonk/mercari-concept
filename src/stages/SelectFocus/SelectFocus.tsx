import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import AvatarOrb from '../../components/AvatarOrb';
import SparkleMark from '../../components/icons/SparkleMark';
import { analysisBeats } from '../../data/analysis';
import './SelectFocus.css';

const BEAT_MS = 1450;

type Props = {
  imageSrc: string;
  onSelectDress: () => void;
};

export default function SelectFocus({ imageSrc, onSelectDress }: Props) {
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    if (beat >= analysisBeats.length - 1) {
      const done = window.setTimeout(onSelectDress, 1100);
      return () => window.clearTimeout(done);
    }
    const id = window.setTimeout(() => setBeat((n) => n + 1), BEAT_MS);
    return () => window.clearTimeout(id);
  }, [beat, onSelectDress]);

  const current = analysisBeats[beat];
  const visibleTags = analysisBeats
    .slice(0, beat + 1)
    .filter((item) => item.tag);

  return (
    <section className="focus">
      <div className="focus__inner">
      <div className="focus__status">
        <AvatarOrb compact />
        <span className="focus__sparkle" aria-hidden>
          <SparkleMark fill="currentColor" stroke="none" />
        </span>
        <AnimatePresence mode="wait">
          <motion.p
            key={current.id}
            className="focus__status-copy"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28 }}
          >
            {current.text}
            <span className="focus__ellipsis" aria-hidden>
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="focus__hero">
        <motion.img
          layoutId="inspiration-dress"
          className="focus__image"
          src={imageSrc}
          alt="Inspiration"
        />
        <AnimatePresence>
          {visibleTags.map((item) => (
            <motion.span
              key={item.id}
              className={`focus__tag focus__tag--${item.tagSide}`}
              initial={{ opacity: 0, scale: 0.86, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            >
              <SparkleMark fill="currentColor" stroke="none" />
              {item.tag}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
      </div>
    </section>
  );
}
