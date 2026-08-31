import { useEffect, useState } from 'react';

const FALLBACK = '/listing/placeholder.svg';

type Props = {
  src: string;
  alt: string;
  className?: string;
};

export default function ListingPhoto({ src, alt, className }: Props) {
  const resolved = src.startsWith('blob:') ? src : encodeURI(src);
  const [current, setCurrent] = useState(resolved);
  const classes = ['listing-photo', className].filter(Boolean).join(' ');

  useEffect(() => {
    setCurrent(src.startsWith('blob:') ? src : encodeURI(src));
  }, [src]);

  return (
    <img
      className={classes}
      src={current}
      alt={alt}
      onError={() => {
        if (current !== FALLBACK) setCurrent(FALLBACK);
      }}
    />
  );
}
