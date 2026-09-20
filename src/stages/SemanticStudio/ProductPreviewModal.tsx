import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import CloseMark from '../../components/icons/CloseMark';
import DownloadMark from '../../components/icons/DownloadMark';
import SparkleMark from '../../components/icons/SparkleMark';
import StyleOnMeMark from '../../components/icons/StyleOnMeMark';
import { merchantLabel, merchantShopUrl } from '../../lib/recommendation/mapProduct';
import { merchantMark } from '../../lib/recommendation/merchantMark';
import { whyThis } from '../../lib/scoring';
import type { Product, SemanticAttribute } from '../../types';
import './ProductPreviewModal.css';

type Props = {
  product: Product;
  attributes: SemanticAttribute[];
  generatedImage?: string;
  selfiePreview?: string;
  styling?: boolean;
  canStyle?: boolean;
  onStyleMe: () => void;
  onChangeSelfie: () => void;
  onClose: () => void;
};

export default function ProductPreviewModal({
  product,
  attributes,
  generatedImage,
  selfiePreview,
  styling,
  canStyle = true,
  onStyleMe,
  onChangeSelfie,
  onClose,
}: Props) {
  const explanation = whyThis(product, attributes);
  const merchant = merchantLabel(product.merchant);
  const mark = merchantMark(product.merchant);
  const shopUrl = merchantShopUrl(product);
  const slides = useMemo(
    () =>
      generatedImage && generatedImage !== product.image
        ? [generatedImage, product.image]
        : [product.image],
    [generatedImage, product.image],
  );
  const [index, setIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef({ start: 0, width: 1, active: false });

  const last = Math.max(0, slides.length - 1);

  useEffect(() => {
    setIndex((n) => Math.min(n, last));
  }, [last]);

  useEffect(() => {
    if (slides.length < 2) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'ArrowRight') setIndex((n) => Math.min(n + 1, last));
      if (event.key === 'ArrowLeft') setIndex((n) => Math.max(n - 1, 0));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [last, slides.length]);

  function settle(delta: number, width: number) {
    const threshold = Math.max(40, width * 0.18);
    if (delta < -threshold) setIndex((n) => Math.min(n + 1, last));
    else if (delta > threshold) setIndex((n) => Math.max(n - 1, 0));
    setDragX(0);
    setDragging(false);
    drag.current.active = false;
  }

  async function download() {
    const src = current;
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${product.name}.jpg`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(src, '_blank', 'noopener,noreferrer');
    }
  }

  const many = slides.length > 1;
  const current = slides[Math.min(index, last)] ?? slides[0];
  const onCatalog = current === product.image;

  return createPortal(
    <div className="product-preview" role="dialog" aria-modal="true" aria-labelledby="product-preview-title">
      <button type="button" className="product-preview__veil" aria-label="Close" onClick={onClose} />
      <div className="product-preview__sheet">
        <button type="button" className="product-preview__close" aria-label="Close" onClick={onClose}>
          <CloseMark />
        </button>
        <div
          className={`product-preview__media${onCatalog ? ' is-catalog' : ''}${selfiePreview ? ' has-selfie' : ''}${many ? ' has-slides' : ''}`}
          onPointerDown={(event) => {
            if (!many) return;
            drag.current = {
              start: event.clientX,
              width: event.currentTarget.clientWidth || 1,
              active: true,
            };
            setDragging(true);
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!drag.current.active) return;
            let dx = event.clientX - drag.current.start;
            if ((index === 0 && dx > 0) || (index === last && dx < 0)) dx *= 0.32;
            setDragX(dx);
          }}
          onPointerUp={(event) => {
            if (!drag.current.active) return;
            settle(event.clientX - drag.current.start, drag.current.width);
          }}
          onPointerCancel={() => {
            if (!drag.current.active) return;
            settle(0, drag.current.width);
          }}
        >
          <div
            className={`product-preview__track${dragging ? ' is-dragging' : ''}`}
            style={{
              transform: `translate3d(calc(${-index * 100}% + ${dragX}px), 0, 0)`,
            }}
          >
            {slides.map((src) => (
              <img
                key={src}
                className="product-preview__image"
                src={src}
                alt={product.name}
                draggable={false}
              />
            ))}
          </div>
          {onCatalog && !styling && canStyle ? (
            <button
              type="button"
              className="product-preview__style"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={onStyleMe}
            >
              <StyleOnMeMark />
              Style it on me
            </button>
          ) : null}
          <button
            type="button"
            className="product-preview__download"
            aria-label="Download photo"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => void download()}
          >
            <DownloadMark />
          </button>
          {selfiePreview ? (
            <button
              type="button"
              className="product-preview__selfie"
              aria-label="Change your photo"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={onChangeSelfie}
            >
              <img src={selfiePreview} alt="" />
            </button>
          ) : null}
          {many ? (
            <div className="product-preview__dots" role="tablist" aria-label="Photos">
              {slides.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  role="tab"
                  aria-label={`Photo ${i + 1} of ${slides.length}`}
                  aria-selected={i === index}
                  className={`product-preview__dot${i === index ? ' is-active' : ''}`}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => setIndex(i)}
                />
              ))}
            </div>
          ) : null}
        </div>
        <div className="product-preview__body">
          <h2 id="product-preview-title" className="product-preview__title">
            {product.name}
          </h2>
          <p className="product-preview__price">{product.price}</p>
          <p className="product-preview__meta">
            {product.condition} · {product.seller}
            {merchant ? ` · ${merchant}` : ''}
          </p>
          <div className="product-preview__why">
            <SparkleMark fill="currentColor" stroke="none" />
            <div>
              <strong>Why this</strong>
              <ul>
                {explanation.matches.length
                  ? explanation.matches.map((item) => <li key={item}>✓ {item}</li>)
                  : <li>Still gathering signal</li>}
              </ul>
              {explanation.less.length ? (
                <>
                  <strong>Less of</strong>
                  <ul>
                    {explanation.less.map((item) => (
                      <li key={item}>○ {item}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          </div>
          {shopUrl ? (
            <a
              className="product-preview__cta"
              href={shopUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {mark ? <img className="product-preview__cta-mark" src={mark} alt="" /> : null}
              View on {merchant ?? 'store'} →
            </a>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
