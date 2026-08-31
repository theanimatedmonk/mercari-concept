import { AnimatePresence, motion } from 'framer-motion';
import { ListFilter } from 'lucide-react';
import { useEffect, useState } from 'react';
import { panelPhase } from '../../lib/scoring';
import type { Product, SemanticAttribute } from '../../types';
import ProductCard from './ProductCard';
import './ProductPanel.css';

const COPY = {
  start: {
    title: 'Shaping around you',
    sub: 'The marketplace is following what you keep.',
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

const SLOT_COUNT = 12;
const FIRST_CARD_MS = 520;
const NEXT_CARD_MS = 320;

type Props = {
  ranked: Product[];
  attributes: SemanticAttribute[];
  meaningfulMoves: number;
};

function Slot({
  product,
  showCard,
  index,
  attributes,
}: {
  product?: Product;
  showCard: boolean;
  index: number;
  attributes: SemanticAttribute[];
}) {
  return (
    <div className="panel__slot">
      <AnimatePresence mode="wait">
        {showCard && product ? (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ProductCard product={product} attributes={attributes} />
          </motion.div>
        ) : (
          <motion.div
            key={`shimmer-${index}`}
            className="product-shimmer"
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-hidden
          >
            <span className="product-shimmer__image" />
            <span className="product-shimmer__line" />
            <span className="product-shimmer__line product-shimmer__line--short" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ProductPanel({ ranked, attributes, meaningfulMoves }: Props) {
  const phase = panelPhase(attributes, meaningfulMoves);
  const copy = COPY[phase];
  const visible = ranked.slice(0, SLOT_COUNT);
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (revealed >= visible.length) return;
    const ms = revealed === 0 ? FIRST_CARD_MS : NEXT_CARD_MS;
    const id = window.setTimeout(() => setRevealed((n) => n + 1), ms);
    return () => window.clearTimeout(id);
  }, [revealed, visible.length]);

  const left = Array.from({ length: Math.ceil(SLOT_COUNT / 2) }, (_, i) => i * 2);
  const right = Array.from({ length: Math.floor(SLOT_COUNT / 2) }, (_, i) => i * 2 + 1);

  return (
    <motion.aside
      className="panel"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <header className="panel__header">
        <div className="panel__heading">
          <motion.h1 layout key={copy.title}>
            {copy.title}
          </motion.h1>
          <motion.p layout key={copy.sub}>
            {copy.sub}
          </motion.p>
        </div>
        <button type="button" className="panel__filter">
          <ListFilter size={14} />
          Filter
        </button>
      </header>
      <div className="panel__grid">
        <div className="panel__col">
          {left.map((index) => {
            const product = visible[index];
            return (
              <Slot
                key={product?.id ?? `slot-${index}`}
                product={product}
                showCard={Boolean(product && index < revealed)}
                index={index}
                attributes={attributes}
              />
            );
          })}
        </div>
        <div className="panel__col">
          {right.map((index) => {
            const product = visible[index];
            return (
              <Slot
                key={product?.id ?? `slot-${index}`}
                product={product}
                showCard={Boolean(product && index < revealed)}
                index={index}
                attributes={attributes}
              />
            );
          })}
        </div>
      </div>
    </motion.aside>
  );
}
