import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Info,
  MoreHorizontal,
  Share,
  Shield,
  Star,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import SparkleMark from '../../components/icons/SparkleMark';
import {
  listingCopy,
  listingGallery,
  listingTryOnResult,
} from '../../data/listing';
import type { Product } from '../../types';
import ListingPhoto from './ListingPhoto';
import StyleOnMe from './StyleOnMe';
import './ProductListing.css';

const PAYMENTS = ['Visa', 'PayPal', 'Mastercard', 'Amex', 'Discover', 'Venmo'];

type Props = {
  product: Product;
  similar: Product[];
  onClose: () => void;
};

export default function ProductListing({ product, similar, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState(0);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [styled, setStyled] = useState(false);
  const gallery = styled ? [listingTryOnResult, ...listingGallery] : listingGallery;
  const photo = gallery[active] ?? gallery[0];

  const onTryOnRevealed = useCallback(() => setStyled(true), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (selfie) {
        setSelfie(null);
        return;
      }
      onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, selfie]);

  function onPickSelfie(file: File) {
    setSelfie(URL.createObjectURL(file));
  }

  function shift(delta: number) {
    setActive((n) => (n + delta + gallery.length) % gallery.length);
  }

  const [sheetUp, setSheetUp] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 48rem)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 48rem)');
    const apply = () => setSheetUp(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const meta = `${listingCopy.size} | ${product.condition} | ${listingCopy.brand}`;
  const sheetMotion = sheetUp
    ? { hidden: { y: '100%' }, show: { y: 0 } }
    : { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div
      className="listing"
      role="dialog"
      aria-modal="true"
      aria-labelledby="listing-title"
      initial="hidden"
      animate="show"
      exit="hidden"
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.button
        type="button"
        className="listing__veil"
        aria-label="Close listing"
        onClick={onClose}
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
      />
      {sheetUp ? null : (
        <button type="button" className="listing__close" aria-label="Close" onClick={onClose}>
          <X size={22} />
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPickSelfie(file);
          e.target.value = '';
        }}
      />
      <motion.div className="listing__sheet" variants={sheetMotion}>
        <div className="listing__main">
          <div className="listing__col listing__col--media">
            <div className="listing__gallery">
              <div className="listing__thumbs">
                {gallery.map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    className={`listing__thumb${i === active ? ' is-active' : ''}`}
                    aria-label={`Photo ${i + 1}`}
                    aria-pressed={i === active}
                    onClick={() => setActive(i)}
                  >
                    <ListingPhoto src={src} alt="" />
                  </button>
                ))}
              </div>
              <div className="listing__hero">
                <ListingPhoto src={photo} alt={product.name} />
                <button
                  type="button"
                  className="listing__nav listing__nav--prev"
                  aria-label="Previous photo"
                  onClick={() => shift(-1)}
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  className="listing__nav listing__nav--next"
                  aria-label="Next photo"
                  onClick={() => shift(1)}
                >
                  <ChevronRight size={20} />
                </button>
                <button
                  type="button"
                  className="listing__style"
                  onClick={() => fileRef.current?.click()}
                >
                  <SparkleMark fill="currentColor" stroke="none" />
                  Style it on me
                </button>
              </div>
            </div>
            <div className="listing__social">
              <button type="button">
                <Heart size={16} />
                Like ({listingCopy.likes})
              </button>
              <button type="button">
                <Share size={16} />
                Share
              </button>
              <button type="button">
                <MoreHorizontal size={16} />
                More
              </button>
            </div>
            <div className="listing__seller">
              <ListingPhoto
                className="listing__avatar"
                src={listingCopy.seller.avatar}
                alt=""
              />
              <div>
                <p className="listing__seller-name">{listingCopy.seller.name}</p>
                <p className="listing__seller-meta">
                  {listingCopy.seller.handle}
                  <span className="listing__stars" aria-label="5 stars">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} size={12} fill="currentColor" />
                    ))}
                  </span>
                </p>
                <p className="listing__seller-stats">
                  {listingCopy.seller.reviews} reviews · {listingCopy.seller.listed} listed ·{' '}
                  {listingCopy.seller.sales} sales
                </p>
              </div>
            </div>
            <div className="listing__bundle">
              <p>Bundle discounts from {listingCopy.seller.name}</p>
              <div className="listing__track" aria-hidden>
                <span className="listing__track-fill" />
                <span className="listing__mark listing__mark--1" />
                <span className="listing__mark listing__mark--2 is-on" />
                <span className="listing__mark listing__mark--3 is-on" />
                <span className="listing__mark listing__mark--4 is-on" />
              </div>
              <ul className="listing__tiers">
                <li>1 item 0% off</li>
                <li>2+ 10% off</li>
                <li>4 15% off</li>
                <li>5+ 25% off</li>
              </ul>
            </div>
          </div>

          <div className="listing__col listing__col--buy">
            <div className="listing__headline">
              <div>
                <h1 id="listing-title">{product.name}</h1>
                <p className="listing__sub">{meta}</p>
              </div>
              <p className="listing__likes">
                <Heart size={16} />
                {listingCopy.likes} Likes
              </p>
            </div>
            <p className="listing__price">
              {product.price.includes('.') ? product.price : `${product.price}.00`}
            </p>
            <p className="listing__fee">
              {listingCopy.fee}
              <Info size={14} />
            </p>
            <p className="listing__promo">
              Up to 25% off when you bundle items from this seller
            </p>
            <div className="listing__actions">
              <button type="button" className="listing__ghost">
                Make offer
              </button>
              <button type="button" className="listing__ghost">
                Add to cart
              </button>
            </div>
            <button type="button" className="listing__buy-now">
              Buy now
            </button>
            <button type="button" className="listing__paypal">
              PayPal Checkout
            </button>
            <div className="listing__protect">
              <Shield size={18} />
              <div>
                <strong>Buyer Protection</strong>
                <p>Shop with confidence. Get your item or your money back.</p>
              </div>
            </div>
            <section className="listing__block">
              <h2>Details</h2>
              <dl>
                <div>
                  <dt>Condition</dt>
                  <dd>{product.condition}</dd>
                </div>
                <div>
                  <dt>Brand</dt>
                  <dd>
                    <a href="#">{listingCopy.brand}</a>
                  </dd>
                </div>
                <div>
                  <dt>Category</dt>
                  <dd>
                    <a href="#">{listingCopy.category}</a>
                  </dd>
                </div>
                <div>
                  <dt>Size</dt>
                  <dd>{listingCopy.size}</dd>
                </div>
                <div>
                  <dt>Posted</dt>
                  <dd>{listingCopy.posted}</dd>
                </div>
              </dl>
            </section>
            <section className="listing__block">
              <h2>Description</h2>
              <p>{listingCopy.description}</p>
            </section>
            <section className="listing__block">
              <h2>Delivery</h2>
              <p>From: {listingCopy.from}</p>
              <p>
                Shipping: {listingCopy.shipping}{' '}
                <s>{listingCopy.shippingWas}</s>
              </p>
            </section>
            <div className="listing__pay">
              {PAYMENTS.map((name) => (
                <span key={name}>{name}</span>
              ))}
            </div>
            <button type="button" className="listing__sell">
              Have a similar item? Sell yours
            </button>
          </div>
        </div>

        <section className="listing__similar">
          <h2>Similar items</h2>
          <div className="listing__rail">
            {similar.map((item) => (
              <article key={item.id} className="listing__card">
                <div className="listing__card-media">
                  <ListingPhoto src={item.image} alt={item.name} />
                  <span className="listing__card-like">
                    <Heart size={12} />
                    {listingCopy.likes}
                  </span>
                </div>
                <h3>{item.name}</h3>
                <p>{item.price}</p>
              </article>
            ))}
          </div>
        </section>
      </motion.div>
      {selfie ? (
        <StyleOnMe
          selfie={selfie}
          result={encodeURI(listingTryOnResult)}
          onClose={() => {
            setSelfie(null);
            if (styled) setActive(0);
          }}
          onRevealed={onTryOnRevealed}
        />
      ) : null}
    </motion.div>
  );
}
