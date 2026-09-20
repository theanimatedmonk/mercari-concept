import { motion } from 'framer-motion';
import { ArrowUp, Plus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import AvatarOrb from '../../components/AvatarOrb';
import ImageMark from '../../components/icons/ImageMark';
import exampleImage from '../../assets/lander-images/image_text.png';
import exampleText from '../../assets/lander-images/text.png';
import exampleVoice from '../../assets/lander-images/voice.png';
import generatedSound from '../../assets/audio files/generated.mp3';
import { imageUrlToBase64, requestAnalyze } from '../../lib/llm/client';
import type { AnalyzeResponse } from '../../lib/llm/types';
import useDictation from '../../lib/useDictation';
import DictateButton, { VoiceFreq } from './DictateButton';
import GeneratingHero, { GENERATE_BEAT_MS } from './GeneratingHero';
import './InspirationInput.css';

const EXAMPLES = [
  { id: 'image', src: exampleImage, alt: 'Describe a look from a photo' },
  { id: 'text', src: exampleText, alt: 'Ask with a short prompt' },
  { id: 'voice', src: exampleVoice, alt: 'Talk through a feeling' },
];

const LAYOUT_SPRING = { type: 'spring' as const, stiffness: 80, damping: 18, mass: 1.05 };

type Props = {
  onContinue: (payload: {
    imageSrc: string | null;
    context: string;
    analysis: AnalyzeResponse;
  }) => void;
  onNotFashion: () => void;
  onReadingChange?: (reading: boolean) => void;
};

export default function InspirationInput({
  onContinue,
  onNotFashion,
  onReadingChange,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [context, setContext] = useState('');
  const [dragging, setDragging] = useState(false);
  const dictation = useDictation(context, setContext);
  const [reading, setReading] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [beat, setBeat] = useState(0);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const continued = useRef(false);
  const generatedAudio = useRef<HTMLAudioElement | null>(null);
  const generatedPlayed = useRef(false);

  useEffect(() => {
    onReadingChange?.(reading);
  }, [reading, onReadingChange]);

  useEffect(() => {
    if (reading) dictation.stop();
  }, [reading, dictation.stop]);

  function useFile(file: File) {
    setImageSrc(URL.createObjectURL(file));
    setAnalyzeError(null);
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

  function onContextChange(value: string) {
    if (dictation.listening) dictation.stop();
    setContext(value);
  }

  function canSubmit() {
    return Boolean(imageSrc || context.trim());
  }

  async function submit() {
    if (!canSubmit() || reading) return;
    dictation.stop();
    continued.current = false;
    generatedPlayed.current = false;
    setAnalyzeError(null);
    setAnalysis(null);
    setBeat(0);
    setReading(true);
    setWaiting(true);
    try {
      const payload: { text?: string; imageBase64?: string; mimeType?: string } = {};
      const text = context.trim();
      if (text) payload.text = text;
      if (imageSrc) {
        const image = await imageUrlToBase64(imageSrc);
        payload.imageBase64 = image.imageBase64;
        payload.mimeType = image.mimeType;
      }
      const result = await requestAnalyze(payload);
      if (!result.fashion) {
        onNotFashion();
        return;
      }
      setAnalysis(result);
      setWaiting(false);
    } catch (error) {
      setReading(false);
      setWaiting(false);
      setAnalyzeError(
        error instanceof Error ? error.message : 'Could not read that. Try again.',
      );
    }
  }

  function submitFromBar() {
    if (context.trim()) {
      void submit();
      return;
    }
    fileRef.current?.click();
  }

  const beats = analysis?.attributes ?? [];
  const lastBeat = Math.max(beats.length - 1, 0);

  useEffect(() => {
    if (!reading || waiting || !analysis?.fashion) return;
    if (beats.length === 0 || beat >= lastBeat) {
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
        onContinue({
          imageSrc,
          context: context.trim(),
          analysis,
        });
      }, 900);
      return () => window.clearTimeout(done);
    }
    const id = window.setTimeout(() => setBeat((n) => n + 1), GENERATE_BEAT_MS);
    return () => window.clearTimeout(id);
  }, [reading, waiting, analysis, beat, lastBeat, beats.length, imageSrc, context, onContinue]);

  return (
    <section
      className={`inspiration${reading ? ' is-reading' : ''}${reading && !imageSrc ? ' is-prompt' : ''}`}
    >
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
        className={`inspiration__orb-dock${reading && imageSrc ? ' inspiration__orb-dock--corner' : ''}`}
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
                className={`inspiration__bar${dragging ? ' is-dragging' : ''}${dictation.listening ? ' is-dictating' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onPaste={onPaste}
              >
                <div className="inspiration__bar-field">
                  {dictation.listening ? <VoiceFreq /> : null}
                  <input
                    className="inspiration__query"
                    value={context}
                    onChange={(e) => onContextChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      if (dictation.listening) return;
                      submitFromBar();
                    }}
                    placeholder="Start with anything..."
                    aria-label="Start with anything..."
                  />
                </div>
                <div className="inspiration__bar-actions">
                  {dictation.listening ? null : (
                    <button
                      type="button"
                      className="inspiration__bar-btn"
                      aria-label="Add an image"
                      onClick={() => fileRef.current?.click()}
                    >
                      <ImageMark />
                    </button>
                  )}
                  <DictateButton
                    className="inspiration__bar-btn"
                    listening={dictation.listening}
                    onClick={dictation.toggle}
                  />
                  <button
                    type="button"
                    className="inspiration__submit"
                    aria-label="Continue"
                    disabled={dictation.listening}
                    onClick={submitFromBar}
                  >
                    <ArrowUp size={18} strokeWidth={2.4} />
                  </button>
                </div>
              </div>
              {analyzeError || dictation.error ? (
                <p className="inspiration__error">{analyzeError || dictation.error}</p>
              ) : null}
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
                <div className={`inspiration__composer${dictation.listening ? ' is-dictating' : ''}`}>
                  <textarea
                    value={context}
                    onChange={(e) => onContextChange(e.target.value)}
                    placeholder="What caught your eye in this image?"
                    aria-label="What caught your eye in this image?"
                  />
                  {dictation.listening ? <VoiceFreq /> : null}
                  <DictateButton
                    className="inspiration__mic"
                    listening={dictation.listening}
                    onClick={dictation.toggle}
                  />
                </div>
              </div>
              {analyzeError || dictation.error ? (
                <p className="inspiration__error">{analyzeError || dictation.error}</p>
              ) : null}
              <button type="button" className="inspiration__done" onClick={() => void submit()}>
                Let's find something great
              </button>
            </div>
          )}
        </div>
      ) : (
        <GeneratingHero
          imageSrc={imageSrc}
          context={context}
          beats={beats}
          beat={beat}
          waiting={waiting}
          layoutId={imageSrc ? 'inspiration-frame' : undefined}
        />
      )}
    </section>
  );
}
