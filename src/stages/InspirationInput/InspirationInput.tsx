import { AnimatePresence, motion } from 'framer-motion';
import { ImagePlus, Mic, Plus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import AvatarOrb from '../../components/AvatarOrb';
import DitherField from '../../components/DitherField';
import giftIcon from '../../assets/hero-icons/gift.svg';
import vibeIcon from '../../assets/hero-icons/vibe.svg';
import spaceIcon from '../../assets/hero-icons/space.svg';
import { analysisBeats } from '../../data/analysis';
import { DEMO_CONTEXT } from '../../data/demo';
import './InspirationInput.css';

const PROMPTS = [
  {
    id: 'gift',
    label: 'Help me find a gift for someone',
    icon: giftIcon,
  },
  {
    id: 'vibe',
    label: "I'm looking for a specific vibe",
    icon: vibeIcon,
  },
  {
    id: 'space',
    label: 'Help me find something for my space',
    icon: spaceIcon,
  },
];

const BEAT_MS = 1750;
const LAST_TAG_BEAT = analysisBeats.reduce(
  (index, item, i) => (item.tag ? i : index),
  0,
);
const LAYOUT_SPRING = { type: 'spring' as const, stiffness: 80, damping: 18, mass: 1.05 };
const SCAN_COLS = 12;
const SCAN_ROWS = 16;
const SCAN_DOTS = SCAN_COLS * SCAN_ROWS;
const SHOW_DITHER = false;

type Props = {
  onContinue: (imageSrc: string, context: string) => void;
};

export default function InspirationInput({ onContinue }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [context, setContext] = useState(DEMO_CONTEXT);
  const [dragging, setDragging] = useState(false);
  const [listening, setListening] = useState(false);
  const [reading, setReading] = useState(false);
  const [beat, setBeat] = useState(0);
  const continued = useRef(false);

  function useFile(file: File) {
    setImageSrc(URL.createObjectURL(file));
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) useFile(file);
  }

  function onPaste(e: React.ClipboardEvent | ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    const file = [...items]
      .find((item) => item.type.startsWith('image/'))
      ?.getAsFile();
    if (file) {
      e.preventDefault();
      useFile(file);
    }
  }

  useEffect(() => {
    if (imageSrc) return;
    function onWindowPaste(e: ClipboardEvent) {
      onPaste(e);
    }
    window.addEventListener('paste', onWindowPaste);
    return () => window.removeEventListener('paste', onWindowPaste);
  }, [imageSrc]);

  function onMic() {
    setListening(true);
    setContext('');
    window.setTimeout(() => {
      setContext(DEMO_CONTEXT);
      setListening(false);
    }, 900);
  }

  function submit() {
    if (!imageSrc || reading) return;
    continued.current = false;
    setBeat(0);
    setReading(true);
  }

  useEffect(() => {
    if (!reading || !imageSrc) return;
    if (beat >= LAST_TAG_BEAT) {
      const done = window.setTimeout(() => {
        if (continued.current) return;
        continued.current = true;
        onContinue(imageSrc, context || DEMO_CONTEXT);
      }, 900);
      return () => window.clearTimeout(done);
    }
    const id = window.setTimeout(() => setBeat((n) => n + 1), BEAT_MS);
    return () => window.clearTimeout(id);
  }, [reading, beat, imageSrc, context, onContinue]);

  const current = analysisBeats[beat];
  const visibleTags = analysisBeats.slice(0, beat + 1).filter((item) => item.tag);

  return (
    <section className={`inspiration${reading ? ' is-reading' : ''}`}>
      {SHOW_DITHER && !reading ? <DitherField /> : null}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) useFile(file);
          e.target.value = '';
        }}
      />

      <div
        className={`inspiration__orb-dock${reading ? ' inspiration__orb-dock--corner' : ''}`}
      >
        <motion.div
          layout="position"
          layoutId="avatar-orb-slot"
          transition={LAYOUT_SPRING}
        >
          <AvatarOrb
            pose={reading ? 'twitch' : imageSrc ? 'lookDown' : undefined}
          />
        </motion.div>
      </div>

      {!reading ? (
        <div className="inspiration__inner">
          {!imageSrc ? (
            <>
              <header className="inspiration__intro">
                <h1 className="inspiration__title">What's on your mind?</h1>
                <p className="inspiration__sub">
                  Show me something you saw, describe it, or tell me what you're looking
                  for.
                </p>
              </header>
              <button
                type="button"
                className={`inspiration__drop${dragging ? ' is-dragging' : ''}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onPaste={onPaste}
              >
                <span className="inspiration__drop-icon">
                  <ImagePlus size={18} />
                </span>
                <p>Drop an image or paste from anywhere</p>
              </button>
              <div className="inspiration__prompts">
                {PROMPTS.map(({ id, label, icon }) => (
                  <button key={id} type="button" className="inspiration__chip">
                    <img className="inspiration__chip-icon" src={icon} alt="" />
                    {label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="inspiration__sheet">
              <button
                type="button"
                className="inspiration__close"
                aria-label="Close"
                onClick={() => setImageSrc(null)}
              >
                <X size={18} />
              </button>
              <div className="inspiration__media">
                <div className="inspiration__thumb-wrap">
                  <motion.div
                    layoutId="inspiration-frame"
                    className="inspiration__thumb-frame"
                    transition={LAYOUT_SPRING}
                  >
                    <img
                      className="inspiration__thumb"
                      src={imageSrc}
                      alt="Inspiration"
                    />
                  </motion.div>
                  <button
                    type="button"
                    className="inspiration__remove"
                    aria-label="Remove image"
                    onClick={() => setImageSrc(null)}
                  >
                    <X size={10} />
                  </button>
                </div>
                <button
                  type="button"
                  className="inspiration__add"
                  aria-label="Add another image"
                  onClick={() => fileRef.current?.click()}
                >
                  <Plus size={18} />
                </button>
              </div>
              <h2 className="inspiration__remember">Anything else you remember?</h2>
              <div className="inspiration__composer">
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Add a little context…"
                />
                <button
                  type="button"
                  className={`inspiration__mic${listening ? ' is-listening' : ''}`}
                  onClick={onMic}
                  aria-label="Speak"
                >
                  <Mic size={16} />
                </button>
              </div>
              <button type="button" className="inspiration__done" onClick={submit}>
                Done
              </button>
            </div>
          )}
        </div>
      ) : imageSrc ? (
        <div className="inspiration__hero">
          <div className="inspiration__hero-stage">
          <motion.div
            layoutId="inspiration-frame"
            className="inspiration__hero-frame"
            transition={LAYOUT_SPRING}
          >
            <img
              className="inspiration__hero-img"
              src={imageSrc}
              alt="Inspiration"
            />
            <div className="inspiration__scan" aria-hidden>
              {Array.from({ length: SCAN_DOTS }, (_, i) => {
                const col = i % SCAN_COLS;
                const row = Math.floor(i / SCAN_COLS);
                const delay = ((col * 0.09 + row * 0.06) % 2.2).toFixed(2);
                return (
                  <span
                    key={i}
                    className="inspiration__scan-dot"
                    style={{ animationDelay: `${delay}s` }}
                  />
                );
              })}
            </div>
          </motion.div>
          <AnimatePresence>
            {visibleTags.map((item) => (
              <motion.span
                key={item.id}
                className={`inspiration__tag inspiration__tag--${item.tagSide}`}
                initial={{ opacity: 0, scale: 0.72 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 140, damping: 16 }}
              >
                {item.id === 'plum' ? (
                  <span className="inspiration__swatch" aria-hidden />
                ) : null}
                {item.tag}
              </motion.span>
            ))}
          </AnimatePresence>
          </div>
          <AnimatePresence mode="wait">
            <motion.p
              key={current.id}
              className="inspiration__status-copy"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.32 }}
            >
              {current.text}
              <span className="inspiration__ellipsis" aria-hidden>
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </span>
            </motion.p>
          </AnimatePresence>
        </div>
      ) : null}
    </section>
  );
}
