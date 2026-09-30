import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUp, Plus, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import AvatarOrb from '../../components/AvatarOrb';
import ImageMark from '../../components/icons/ImageMark';
import exampleImage from '../../assets/lander-images/image_text.png';
import exampleText from '../../assets/lander-images/text.png';
import exampleVoice from '../../assets/lander-images/voice.png';
import generatedSound from '../../assets/audio files/generated.mp3';
import { imageUrlToBase64, fetchInspirationFromUrl, requestAnalyzeStream } from '../../lib/llm/client';
import { toggleIntent } from '../../lib/llm/intentQuery';
import { splitPromptMedia } from '../../lib/llm/promptMedia';
import { createRevealQueue } from '../../lib/llm/revealQueue';
import type { AnalysisAttribute, AnalyzeResponse } from '../../lib/llm/types';
import useDictation from '../../lib/useDictation';
import { openImagePicker } from '../../lib/native/pickImage';
import type { IncomingShare } from '../../lib/native/shareTarget';
import DictateButton, { VoiceFreq } from './DictateButton';
import GeneratingHero from './GeneratingHero';
import JevNudge from './JevNudge';
import useJevNudge from './useJevNudge';
import useTypedPlaceholder from './useTypedPlaceholder';
import './InspirationInput.css';

const EXAMPLES = [
  { id: 'image', src: exampleImage, alt: 'Describe a look from a photo' },
  { id: 'text', src: exampleText, alt: 'Ask with a short prompt' },
  { id: 'voice', src: exampleVoice, alt: 'Talk through a feeling' },
];

const LAYOUT_SPRING = { type: 'spring' as const, stiffness: 80, damping: 18, mass: 1.05 };
const BAR_SPRING = { type: 'spring' as const, stiffness: 380, damping: 36, mass: 0.85 };

function fitQuery(el: HTMLTextAreaElement | null) {
  if (!el) return;
  const prev = el.offsetHeight;
  el.style.height = 'auto';
  const next = el.scrollHeight;
  if (prev > 0 && prev !== next) {
    el.style.height = `${prev}px`;
    el.offsetHeight;
  }
  el.style.height = `${next}px`;
}

type Props = {
  onContinue: (payload: {
    imageSrc: string | null;
    context: string;
    analysis: AnalyzeResponse;
  }) => void;
  onNotFashion: () => void;
  onReadingChange?: (reading: boolean) => void;
  incomingShare?: IncomingShare | null;
  onIncomingConsumed?: () => void;
};

export default function InspirationInput({
  onContinue,
  onNotFashion,
  onReadingChange,
  incomingShare,
  onIncomingConsumed,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [context, setContext] = useState('');
  const [dragging, setDragging] = useState(false);
  const [linking, setLinking] = useState(false);
  const [linkFailed, setLinkFailed] = useState(false);
  const dictation = useDictation(context, setContext);
  const [queryFocused, setQueryFocused] = useState(false);
  const [imagePrompted, setImagePrompted] = useState(false);
  const typedHint = useTypedPlaceholder(
    Boolean(context.trim()) || dictation.listening || queryFocused,
  );
  const queryRef = useRef<HTMLTextAreaElement>(null);
  const reduceMotion = Boolean(useReducedMotion());
  const barMotion = reduceMotion ? { duration: 0 } : BAR_SPRING;
  const [reading, setReading] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [pills, setPills] = useState<AnalysisAttribute[]>([]);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const continued = useRef(false);
  const generatedAudio = useRef<HTMLAudioElement | null>(null);
  const generatedPlayed = useRef(false);
  const linkingRef = useRef(false);
  const nudge = useJevNudge(
    context,
    Boolean(imageSrc),
    !reading && !linking && !dictation.listening && !linkFailed,
    imagePrompted,
  );
  const nudging = Boolean(nudge.question);

  useEffect(() => {
    if (!imageSrc) {
      setImagePrompted(false);
      return;
    }
    if (queryFocused || dictation.listening) setImagePrompted(true);
  }, [imageSrc, queryFocused, dictation.listening]);

  useLayoutEffect(() => {
    fitQuery(queryRef.current);
  }, [context, nudging, linking, linkFailed, imageSrc, dictation.listening]);

  useLayoutEffect(() => {
    if (!imageSrc || reading || linking) return;
    queryRef.current?.focus();
  }, [imageSrc, reading, linking]);

  useEffect(() => {
    onReadingChange?.(reading);
  }, [reading, onReadingChange]);

  useEffect(() => {
    if (reading) dictation.stop();
  }, [reading, dictation.stop]);

  function replaceImage(next: string | null) {
    setImageSrc((prev) => {
      if (prev?.startsWith('blob:') && prev !== next) URL.revokeObjectURL(prev);
      return next;
    });
    setAnalyzeError(null);
    setLinkFailed(false);
  }

  function applyFile(file: File) {
    replaceImage(URL.createObjectURL(file));
  }

  async function addImage() {
    const native = await openImagePicker(fileRef.current);
    if (native) applyFile(native);
  }

  useEffect(() => {
    if (!incomingShare) return;
    if (incomingShare.file) applyFile(incomingShare.file);
    else if (incomingShare.url) void attachFromUrl(incomingShare.url);
    onIncomingConsumed?.();
  }, [incomingShare]);

  async function attachFromUrl(url: string) {
    if (linkingRef.current) return null;
    linkingRef.current = true;
    dictation.stop();
    setLinking(true);
    setLinkFailed(false);
    setAnalyzeError(null);
    try {
      const image = await fetchInspirationFromUrl(url);
      replaceImage(image.preview);
      return image.preview;
    } catch {
      setLinkFailed(true);
      return null;
    } finally {
      linkingRef.current = false;
      setLinking(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) applyFile(file);
  }

  function onPaste(e: React.ClipboardEvent | ClipboardEvent) {
    const items = e.clipboardData?.items;
    const file = items
      ? [...items].find((item) => item.type.startsWith('image/'))?.getAsFile()
      : null;
    if (file) {
      e.preventDefault();
      applyFile(file);
      return;
    }
    const pasted = e.clipboardData?.getData('text') ?? '';
    const { url, caption } = splitPromptMedia(pasted);
    if (!url || imageSrc || linking || linkingRef.current) return;
    e.preventDefault();
    const keep = [context.trim(), caption].filter(Boolean).join(' ');
    if (keep !== context) onContextChange(keep);
    void attachFromUrl(url);
  }

  useEffect(() => {
    if (imageSrc || linking) return;
    function onWindowPaste(e: ClipboardEvent) {
      onPaste(e);
    }
    window.addEventListener('paste', onWindowPaste);
    return () => window.removeEventListener('paste', onWindowPaste);
  }, [imageSrc, linking, context]);

  function onContextChange(value: string) {
    if (dictation.listening) dictation.stop();
    setLinkFailed(false);
    setContext(value);
  }

  function onQueryChange(el: HTMLTextAreaElement) {
    onContextChange(el.value);
    fitQuery(el);
  }

  function toggleNudgeOption(option: string) {
    onContextChange(toggleIntent(context, option, Boolean(imageSrc), nudge.key));
    queryRef.current?.focus();
  }

  function canSubmit() {
    return !linking && Boolean(imageSrc || context.trim()) && nudge.inScope;
  }

  async function submit() {
    if (!canSubmit() || reading) return;
    dictation.stop();
    continued.current = false;
    generatedPlayed.current = false;
    setAnalyzeError(null);
    setAnalysis(null);
    setPills([]);

    let src = imageSrc;
    let text = context.trim();
    const split = splitPromptMedia(text);
    if (!src && split.url) {
      const preview = await attachFromUrl(split.url);
      if (!preview) return;
      src = preview;
      text = split.caption;
      setContext(text);
    }

    setReading(true);
    setWaiting(true);
    const queue = createRevealQueue((attribute) => {
      setWaiting(false);
      setPills((list) =>
        list.some((item) => item.id === attribute.id) ? list : [...list, attribute],
      );
    });
    try {
      const payload: {
        text?: string;
        imageBase64?: string;
        mimeType?: string;
        imageUrl?: string;
      } = {};
      if (text) payload.text = text;
      if (src) {
        if (src.startsWith('http://') || src.startsWith('https://')) {
          payload.imageUrl = src;
        } else {
          const image = await imageUrlToBase64(src);
          payload.imageBase64 = image.imageBase64;
          payload.mimeType = image.mimeType;
        }
      } else if (split.url) {
        payload.imageUrl = split.url;
      }
      const result = await requestAnalyzeStream(payload, queue.push);
      if (!result.fashion) {
        queue.stop();
        onNotFashion();
        return;
      }
      await queue.done();
      setAnalysis(result);
      setWaiting(false);
    } catch (error) {
      queue.stop();
      setReading(false);
      setWaiting(false);
      setAnalyzeError(
        error instanceof Error ? error.message : 'Could not read that. Try again.',
      );
    }
  }

  function submitFromBar() {
    if (!nudge.inScope) return;
    if (imageSrc || context.trim()) {
      void submit();
      return;
    }
    void addImage();
  }

  const beats = pills;
  const beat = Math.max(pills.length - 1, 0);

  useEffect(() => {
    if (!reading || waiting || !analysis?.fashion) return;
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
    }, 800);
    return () => window.clearTimeout(done);
  }, [reading, waiting, analysis, imageSrc, context, onContinue]);

  return (
    <section
      className={`inspiration${reading ? ' is-reading' : ''}${reading && !imageSrc ? ' is-prompt' : ''}${imageSrc && !reading ? ' is-sheet' : ''}`}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) applyFile(file);
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
            <header className="inspiration__intro">
              <h1 className="inspiration__title">What's on your mind?</h1>
              <p className="inspiration__sub">
                Show me something you saw, describe it, or tell me what you are looking for.
              </p>
            </header>
          ) : null}
          <motion.div
            className={`inspiration__bar${dragging ? ' is-dragging' : ''}${dictation.listening ? ' is-dictating' : ''}${linking ? ' is-resolving' : ''}${linkFailed ? ' is-link-failed' : ''}${nudging ? ' is-nudging' : ''}${imageSrc ? ' has-media' : ''}`}
            aria-busy={linking}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onPaste={onPaste}
          >
            <div className="inspiration__bar-copy">
              {imageSrc ? (
                <div className="inspiration__media">
                  <div className="inspiration__thumb-wrap">
                    <motion.div
                      layoutId="inspiration-frame"
                      className="inspiration__thumb-frame"
                      transition={LAYOUT_SPRING}
                      layout="position"
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
                      onClick={() => replaceImage(null)}
                    >
                      <X size={10} />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="inspiration__add"
                    aria-label="Add another image"
                    disabled={linking}
                    onClick={() => void addImage()}
                  >
                    <Plus size={18} />
                  </button>
                </div>
              ) : null}
              <div className="inspiration__bar-field">
                {linking ? (
                  <span className="inspiration__link-chip is-busy" role="status">
                    <span className="inspiration__link-spin" aria-hidden />
                    getting the photo
                  </span>
                ) : linkFailed ? (
                  <button
                    type="button"
                    className="inspiration__link-chip is-failed"
                    onClick={() => setLinkFailed(false)}
                  >
                    Could not get the photo
                  </button>
                ) : (
                  <>
                    {dictation.listening ? <VoiceFreq /> : null}
                    <textarea
                      ref={queryRef}
                      className={`inspiration__query${
                        !context && !dictation.listening && !imageSrc && !queryFocused
                          ? ' is-empty'
                          : ''
                      }`}
                      rows={1}
                      wrap="soft"
                      value={context}
                      onFocus={() => setQueryFocused(true)}
                      onBlur={() => setQueryFocused(false)}
                      onChange={(e) => onQueryChange(e.target)}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter' || e.shiftKey) return;
                        e.preventDefault();
                        if (dictation.listening || linking || !nudge.inScope) return;
                        submitFromBar();
                      }}
                      aria-label={
                        imageSrc
                          ? 'What caught your eye in this image?'
                          : 'Drop an inspo image, paste a Pinterest pin or URL, or describe using voice'
                      }
                    />
                    {!context && !dictation.listening && !imageSrc && !queryFocused ? (
                      <span className="inspiration__typed" aria-hidden>
                        {typedHint}
                        <span className="inspiration__typed-caret" />
                      </span>
                    ) : null}
                  </>
                )}
              </div>
              <AnimatePresence initial={false}>
                {nudging ? (
                  <motion.div
                    key="jev-nudge"
                    className="inspiration__nudge-slot"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={barMotion}
                  >
                    <JevNudge
                      intentKey={nudge.key}
                      question={nudge.question}
                      options={nudge.options}
                      query={context}
                      onToggle={toggleNudgeOption}
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
            <div className="inspiration__bar-actions">
              {!imageSrc && !dictation.listening ? (
                <button
                  type="button"
                  className="inspiration__bar-btn"
                  aria-label="Add an image"
                  disabled={linking}
                  onClick={() => void addImage()}
                >
                  <ImageMark />
                </button>
              ) : null}
              <DictateButton
                className="inspiration__bar-btn"
                listening={dictation.listening}
                disabled={linking}
                onClick={dictation.toggle}
              />
              <button
                type="button"
                className="inspiration__submit"
                aria-label={
                  nudge.inScope ? 'Continue' : "Lookmind is for women's clothing"
                }
                disabled={dictation.listening || linking || !nudge.inScope}
                onClick={submitFromBar}
              >
                <ArrowUp size={18} strokeWidth={2.4} />
              </button>
            </div>
          </motion.div>
          {analyzeError || dictation.error ? (
            <p className="inspiration__error">{analyzeError || dictation.error}</p>
          ) : null}
          {!imageSrc ? (
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
          ) : null}
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
