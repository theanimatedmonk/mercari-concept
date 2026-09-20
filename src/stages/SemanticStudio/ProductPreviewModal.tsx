import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import SparkleMark from '../../components/icons/SparkleMark';
import { merchantLabel, merchantShopUrl } from '../../lib/recommendation/mapProduct';
import { whyThis } from '../../lib/scoring';
import type { Product, SemanticAttribute } from '../../types';
import './ProductPreviewModal.css';

type Props = {
  product: Product;
  attributes: SemanticAttribute[];
  onClose: () => void;
};

export default function ProductPreviewModal({ product, attributes, onClose }: Props) {
  const explanation = whyThis(product, attributes);
  const merchant = merchantLabel(product.merchant);
  const shopUrl = merchantShopUrl(product);

  return createPortal(
    <div className="product-preview" role="dialog" aria-modal="true" aria-labelledby="product-preview-title">
      <button type="button" className="product-preview__veil" aria-label="Close" onClick={onClose} />
      <div className="product-preview__sheet">
        <button type="button" className="product-preview__close" aria-label="Close" onClick={onClose}>
          <X size={18} />
        </button>
        <img className="product-preview__image" src={product.image} alt={product.name} />
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
              View on {merchant ?? 'store'} →
            </a>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
