import { useState } from 'react';
import { motion } from 'framer-motion';
import { whyThis } from '../../lib/scoring';
import type { Product, SemanticAttribute } from '../../types';

type Props = {
  product: Product;
  attributes: SemanticAttribute[];
};

export default function ProductCard({ product, attributes }: Props) {
  const [open, setOpen] = useState(false);
  const explanation = whyThis(product, attributes);

  return (
    <article className="product-card">
      <img className="product-card__image" src={product.image} alt={product.name} />
      <div className="product-card__body">
        <h3 className="product-card__name">{product.name}</h3>
        <p className="product-card__price">{product.price}</p>
        <p className="product-card__meta">
          {product.condition} · {product.seller}
        </p>
        <button
          type="button"
          className="product-card__why"
          onClick={() => setOpen((v) => !v)}
        >
          ✦ Why this?
        </button>
        {open ? (
          <motion.div
            className="product-card__why-body"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            <div>
              Matches what you're shaping:
              <ul>
                {explanation.matches.length
                  ? explanation.matches.map((item) => <li key={item}>✓ {item}</li>)
                  : <li>Still gathering signal</li>}
              </ul>
            </div>
            {explanation.less.length ? (
              <div>
                Less of:
                <ul>
                  {explanation.less.map((item) => (
                    <li key={item}>○ {item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </div>
    </article>
  );
}
