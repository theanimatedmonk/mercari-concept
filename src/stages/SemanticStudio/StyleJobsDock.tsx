import { AnimatePresence, motion } from 'framer-motion';
import CheckCircleMark from '../../components/icons/CheckCircleMark';
import ChevronRightMark from '../../components/icons/ChevronRightMark';
import CloseMark from '../../components/icons/CloseMark';
import StyleOnMeMark from '../../components/icons/StyleOnMeMark';
import ScanOverlay from './ScanOverlay';
import type { StyleJob } from './styleOnMeTypes';
import './StyleJobsDock.css';

type Props = {
  jobs: StyleJob[];
  expanded: boolean;
  onToggle: () => void;
  onOpen: (job: StyleJob) => void;
};

export default function StyleJobsDock({ jobs, expanded, onToggle, onOpen }: Props) {
  if (!jobs.length) return null;

  const generating = jobs.filter((job) => job.status === 'generating');
  const done = jobs.filter((job) => job.status === 'done').length;
  const busy = generating.length > 0;
  const latest = generating[0] ?? jobs[0];

  return (
    <div className="style-dock">
      <motion.div
        className={`style-dock__card${expanded ? ' is-open' : ''}`}
        layout
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}
      >
        <button
          type="button"
          className="style-dock__toggle"
          onClick={onToggle}
          aria-expanded={expanded}
        >
          {busy && !expanded ? (
            <span className="style-dock__thumb">
              <img src={latest.generatedImage ?? latest.product.image} alt="" />
              <ScanOverlay compact />
            </span>
          ) : busy ? (
            <StyleOnMeMark />
          ) : (
            <span className="style-dock__check" aria-hidden>
              <CheckCircleMark />
            </span>
          )}
          <span className="style-dock__label">
            {busy ? (
              <>
                Generating your look
                <span className="product-card__ellipsis">
                  <span>.</span>
                  <span>.</span>
                  <span>.</span>
                </span>
              </>
            ) : (
              `${done}/${jobs.length} Generated`
            )}
          </span>
          {expanded ? <CloseMark className="style-dock__plus" /> : null}
        </button>
        <AnimatePresence initial={false}>
          {expanded ? (
            <motion.ul
              className="style-dock__list"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
            >
              {jobs.map((job) => (
                <li key={job.id}>
                  <button
                    type="button"
                    className="style-dock__row"
                    onClick={() => onOpen(job)}
                  >
                    <span className="style-dock__swatch">
                      <img
                        src={
                          job.status === 'done' && job.generatedImage
                            ? job.generatedImage
                            : job.product.image
                        }
                        alt=""
                      />
                      {job.status === 'generating' ? <ScanOverlay compact /> : null}
                    </span>
                    <span className="style-dock__row-copy">
                      {job.status === 'error' ? 'Couldn’t generate' : job.product.name}
                    </span>
                    <ChevronRightMark />
                  </button>
                </li>
              ))}
            </motion.ul>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
