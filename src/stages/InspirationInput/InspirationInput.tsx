import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, Plus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import AvatarOrb from '../../components/AvatarOrb';
import ImageMark from '../../components/icons/ImageMark';
import MicMark from '../../components/icons/MicMark';
import exampleImage from '../../assets/lander-images/image_text.png';
import exampleText from '../../assets/lander-images/text.png';
import exampleVoice from '../../assets/lander-images/voice.png';
import { analysisBeats } from '../../data/analysis';
import { DEMO_CONTEXT } from '../../data/demo';
import generatedSound from '../../assets/audio files/generated.mp3';
import './InspirationInput.css';

const EXAMPLES = [
  { id: 'image', src: exampleImage, alt: 'Describe a look from a photo' },
  { id: 'text', src: exampleText, alt: 'Ask with a short prompt' },
  { id: 'voice', src: exampleVoice, alt: 'Talk through a feeling' },
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

type Props = {
  onContinue: (imageSrc: string, context: string) => void;
  onReadingChange?: (reading: boolean) => void;
};

export default function InspirationInput({ onContinue, onReadingChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [context, setContext] = useState('');
  const [dragging, setDragging] = useState(false);
  const [listening, setListening] = useState(false);
  const [reading, setReading] = useState(false);
  const [beat, setBeat] = useState(0);
  const continued = useRef(false);
  const generatedAudio = useRef<HTMLAudioElement | null>(null);
  const generatedPlayed = useRef(false);

  useEffect(() => {
    onReadingChange?.(reading);
  }, [reading, onReadingChange]);

  function useFile(file: File) {
    setImageSrc(URL.createObjectURL(file));
    setContext((value) => value.trim() || DEMO_CONTEXT);
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
    generatedPlayed.current = false;
    setBeat(0);
    setReading(true);
  }

  useEffect(() => {
    if (!reading || !imageSrc) return;
    if (beat >= LAST_TAG_BEAT) {
      if (!generatedPlayed.current) {
        generatedPlayed.current = true;
        const audio = generatedAudio.current ?? new Audio(generatedSound);
        generatedAudio.current = audio;
        audio.currentTime = 0;
        void audio.play().catch(() => undefined);
      }
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
              <div
                className={`inspiration__bar${dragging ? ' is-dragging' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onPaste={onPaste}
              >
                <input
                  className="inspiration__query"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    e.preventDefault();
                    fileRef.current?.click();
                  }}
                  placeholder="Start with anything..."
                  aria-label="Start with anything..."
                />
                <div className="inspiration__bar-actions">
                  <button
                    type="button"
                    className="inspiration__bar-btn"
                    aria-label="Add an image"
                    onClick={() => fileRef.current?.click()}
                  >
                    <ImageMark />
                  </button>
                  <button
                    type="button"
                    className={`inspiration__bar-btn${listening ? ' is-listening' : ''}`}
                    aria-label="Speak"
                    onClick={onMic}
                  >
                    <MicMark />
                  </button>
                  <button
                    type="button"
                    className="inspiration__submit"
                    aria-label="Continue"
                    onClick={() => fileRef.current?.click()}
                  >
                    <ArrowUp size={18} strokeWidth={2.4} />
                  </button>
                </div>
              </div>
              <div className="inspiration__examples">
                {EXAMPLES.map((item) => (
                  <img
                    key={item.id}
                    className="inspiration__example"
                    src={item.src}
                    alt={item.alt}
                  />
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
              <div className="inspiration__remember-wrap">
              <h2 className="inspiration__remember">Tell me a bit more...</h2>
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
                  <MicMark />
                </button>
              </div>
              </div>
              <button type="button" className="inspiration__done" onClick={submit}>
              Let's find something great
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
