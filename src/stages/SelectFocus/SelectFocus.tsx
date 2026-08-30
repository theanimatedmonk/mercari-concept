import { motion } from 'framer-motion';
import { useState } from 'react';
import './SelectFocus.css';

type Props = {
  imageSrc: string;
  onSelectDress: () => void;
};

export default function SelectFocus({ imageSrc, onSelectDress }: Props) {
  const [selected, setSelected] = useState(false);

  function select() {
    setSelected(true);
    window.setTimeout(onSelectDress, 720);
  }

  return (
    <section className="focus">
      <div className="focus__inner">
        <header>
          <h1 className="focus__title">What caught your eye?</h1>
          <p className="focus__sub">I see a few things here.</p>
        </header>

        <div className="focus__frame">
          <motion.img
            layoutId="inspiration-dress"
            className="focus__image"
            src={imageSrc}
            alt="Editorial fashion inspiration"
            animate={{
              scale: selected ? 1.28 : 1,
              filter: selected ? 'saturate(1.05)' : 'saturate(1)',
            }}
            transition={{ type: 'spring', stiffness: 80, damping: 18 }}
          />
          <div
            className="focus__veil"
            style={{ opacity: selected ? 0.45 : 0 }}
          />
          <button
            type="button"
            className={`focus__hotspot${selected ? ' is-selected' : ''}`}
            aria-label="Select the dress"
            onClick={select}
          >
            <span className="focus__glow" />
            <span className="focus__shimmer" />
          </button>
        </div>
      </div>
    </section>
  );
}
