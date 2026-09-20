import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import SparkleMark from '../../components/icons/SparkleMark';
import StyleOnMeMark from '../../components/icons/StyleOnMeMark';
import { merchantLabel, merchantShopUrl } from '../../lib/recommendation/mapProduct';
import { merchantMark } from '../../lib/recommendation/merchantMark';
import { whyThis } from '../../lib/scoring';
import type { Product, SemanticAttribute } from '../../types';
import ScanOverlay from './ScanOverlay';
import { STYLE_BEATS, type StyleJobStatus } from './styleOnMeTypes';

type Props = {
  product: Product;
  attributes: SemanticAttribute[];
  onOpen?: () => void;
  styleState?: StyleJobStatus | 'idle';
  styledImage?: string;
  onStyleMe?: () => void;
};

export default function ProductCard({
  product,
  attributes,
  onOpen,
  styleState = 'idle',
  styledImage,
  onStyleMe,
}: Props) {
  const [open, setOpen] = useState(false);
  const [beat, setBeat] = useState(0);
  const explanation = whyThis(product, attributes);
  const merchant = merchantLabel(product.merchant);
  const mark = merchantMark(product.merchant);
  const externalUrl = merchantShopUrl(product);
  const generating = styleState === 'generating';
  const image = styledImage || product.image;

  useEffect(() => {
    if (!generating) return;
    const id = window.setInterval(
      () => setBeat((n) => (n + 1) % STYLE_BEATS.length),
      1400,
    );
    return () => window.clearInterval(id);
  }, [generating]);

  return (
    <article className={`product-card${onOpen ? ' is-openable' : ''}`}>
      <div className="product-card__media">
        {onOpen ? (
          <button type="button" className="product-card__open" onClick={onOpen}>
            <img className="product-card__image" src={image} alt={product.name} />
          </button>
        ) : (
          <img className="product-card__image" src={image} alt={product.name} />
        )}
        {generating ? <ScanOverlay label={STYLE_BEATS[beat]} /> : null}
        {onStyleMe && !generating ? (
          <button
            type="button"
            className="product-card__style"
            aria-label="Style it on me"
            onClick={(event) => {
              event.stopPropagation();
              onStyleMe();
            }}
          >
            <StyleOnMeMark />
            <span className="product-card__style-tip">Style it on me</span>
          </button>
        ) : null}
      </div>
      <div className="product-card__body">
        {onOpen ? (
          <button type="button" className="product-card__open-copy" onClick={onOpen}>
            <h3 className="product-card__name">{product.name}</h3>
            <p className="product-card__price">{product.price}</p>
          </button>
        ) : (
          <div className="product-card__open-copy">
            <h3 className="product-card__name">{product.name}</h3>
            <p className="product-card__price">{product.price}</p>
          </div>
        )}
        <p className="product-card__meta">
          {product.condition} · {product.seller}
          {merchant ? ` · ${merchant}` : ''}
        </p>
        {mark ? (
          externalUrl ? (
            <a
              className="product-card__mark"
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`View on ${merchant}`}
              onClick={(event) => event.stopPropagation()}
            >
              <img src={mark} alt="" />
            </a>
          ) : (
            <img className="product-card__mark" src={mark} alt="" />
          )
        ) : null}
        {externalUrl && !onOpen ? (
          <a
            className="product-card__merchant"
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {mark ? <img src={mark} alt="" /> : null}
            View on {merchant ?? 'store'} →
          </a>
        ) : null}
        <button
          type="button"
          className="product-card__why"
          onClick={() => setOpen((v) => !v)}
        >
          <SparkleMark fill="currentColor" stroke="none" />
          Why this
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
