import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { panelPhase } from '../../lib/scoring';
import type { Product, SemanticAttribute } from '../../types';
import ProductCard from './ProductCard';
import './ProductPanel.css';

const COPY = {
  start: {
    title: "A few places I'd start",
    sub: "Based on what I'm picking up.",
  },
  shaping: {
    title: 'Shaping around you',
    sub: 'The marketplace is following what you keep.',
  },
  resolved: {
    title: 'This feels more like it',
    sub: "Based on what you've shaped.",
  },
};

type Props = {
  ranked: Product[];
  attributes: SemanticAttribute[];
  meaningfulMoves: number;
};

export default function ProductPanel({ ranked, attributes, meaningfulMoves }: Props) {
  const phase = panelPhase(attributes, meaningfulMoves);
  const copy = COPY[phase];
  const visible = ranked.slice(0, 7);

  return (
    <aside className="panel">
      <header className="panel__header">
        <motion.h1 layout key={copy.title}>
          {copy.title}
        </motion.h1>
        <motion.p layout key={copy.sub}>
          {copy.sub}
        </motion.p>
      </header>
      <LayoutGroup>
        <div className="panel__list">
          <AnimatePresence initial={false}>
            {visible.map((product, index) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                style={{ zIndex: visible.length - index }}
              >
                <ProductCard product={product} attributes={attributes} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </LayoutGroup>
    </aside>
  );
}
