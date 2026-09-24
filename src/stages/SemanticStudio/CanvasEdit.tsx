import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Clapperboard, IceCream, Plus, SquarePen, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ImageMark from '../../components/icons/ImageMark';
import { fetchInspirationFromUrl } from '../../lib/llm/client';
import { toggleIntent } from '../../lib/llm/intentQuery';
import { splitPromptMedia } from '../../lib/llm/promptMedia';
import useDictation from '../../lib/useDictation';
import DictateButton, { VoiceFreq } from '../InspirationInput/DictateButton';
import JevNudge from '../InspirationInput/JevNudge';
import useJevNudge from '../InspirationInput/useJevNudge';
import '../InspirationInput/InspirationInput.css';
import './CanvasEdit.css';

const MOBILE = '(max-width: 48rem)';
const SHEET_SPRING = { type: 'spring' as const, stiffness: 420, damping: 38, mass: 0.86 };
const VEIL_TWEEN = { duration: 0.22, ease: [0.2, 0.8, 0.2, 1] as const };

function useMobile() {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(MOBILE);
    const apply = () => setMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return mobile;
}

type PromptDraft = {
  imageSrc: string | null;
  context: string;
};

type Props = {
  imageSrc: string | null;
  context: string;
  busy?: boolean;
  onStartOver: () => void;
  onRetaste: (draft: PromptDraft) => void;
};

function EditMenuItems({
  busy,
  onTaste,
  onScratch,
}: {
  busy: boolean;
  onTaste: () => void;
  onScratch: () => void;
}) {
  return (
    <>
      <button
        type="button"
        className="canvas-edit__item"
        role="menuitem"
        disabled={busy}
        onClick={onTaste}
      >
        <IceCream size={16} />
        Add more taste
      </button>
      <button
        type="button"
        className="canvas-edit__item"
        role="menuitem"
        onClick={onScratch}
      >
        <Clapperboard size={16} />
        Start from scratch
      </button>
    </>
  );
}

export default function CanvasEdit({
  imageSrc,
  context,
  busy = false,
  onStartOver,
  onRetaste,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingTaste = useRef(false);
  const pendingRetaste = useRef<PromptDraft | null>(null);
  const mobile = useMobile();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [tasteOpen, setTasteOpen] = useState(false);
  const [draftContext, setDraftContext] = useState(context);
  const [draftImage, setDraftImage] = useState<string | null>(imageSrc);
  const [tasteError, setTasteError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [linkFailed, setLinkFailed] = useState(false);
  const linkingRef = useRef(false);
  const dictation = useDictation(draftContext, setDraftContext);
  const nudge = useJevNudge(
    draftContext,
    Boolean(draftImage),
    tasteOpen && !linking && !dictation.listening && !linkFailed,
  );
  const instant = Boolean(reduceMotion);
  const veilMotion = instant ? { duration: 0 } : VEIL_TWEEN;
  const sheetMotion = instant ? { duration: 0 } : SHEET_SPRING;
  const sheetSlide = mobile
    ? { hidden: { y: '100%' }, show: { y: 0 } }
    : { hidden: { y: 16, opacity: 0 }, show: { y: 0, opacity: 1 } };

  function closeTaste() {
    dictation.stop();
    if (draftImage?.startsWith('blob:') && draftImage !== imageSrc) {
      URL.revokeObjectURL(draftImage);
    }
    setTasteOpen(false);
  }

  function openTaste() {
    setDraftContext(context);
    setDraftImage(imageSrc);
    setTasteError(null);
    setLinkFailed(false);
    if (mobile && open) {
      pendingTaste.current = true;
      setOpen(false);
      return;
    }
    setOpen(false);
    setTasteOpen(true);
  }

  function useFile(file: File) {
    setTasteError(null);
    setLinkFailed(false);
    setDraftImage((prev) => {
      if (prev?.startsWith('blob:') && prev !== imageSrc) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  async function attachFromUrl(url: string) {
    if (linkingRef.current) return null;
    linkingRef.current = true;
    dictation.stop();
    setLinking(true);
    setLinkFailed(false);
    setTasteError(null);
    try {
      const image = await fetchInspirationFromUrl(url);
      setDraftImage((prev) => {
        if (prev?.startsWith('blob:') && prev !== imageSrc) URL.revokeObjectURL(prev);
        return image.preview;
      });
      return image.preview;
    } catch {
      setLinkFailed(true);
      return null;
    } finally {
      linkingRef.current = false;
      setLinking(false);
    }
  }

  function onPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData?.items;
    const file = items
      ? [...items].find((item) => item.type.startsWith('image/'))?.getAsFile()
      : null;
    if (file) {
      e.preventDefault();
      useFile(file);
      return;
    }
    const pasted = e.clipboardData.getData('text');
    const { url, caption } = splitPromptMedia(pasted);
    if (!url || draftImage || linking || linkingRef.current) return;
    e.preventDefault();
    const keep = [draftContext.trim(), caption].filter(Boolean).join(' ');
    if (keep !== draftContext) {
      if (dictation.listening) dictation.stop();
      setDraftContext(keep);
    }
    void attachFromUrl(url);
  }

  function toggleNudgeOption(option: string) {
    dictation.stop();
    setLinkFailed(false);
    setDraftContext((prev) =>
      toggleIntent(prev, option, Boolean(draftImage), nudge.key),
    );
  }

  function removeImage() {
    setDraftImage((prev) => {
      if (prev?.startsWith('blob:') && prev !== imageSrc) URL.revokeObjectURL(prev);
      return null;
    });
  }

  function canSubmit() {
    return !linking && Boolean(draftImage || draftContext.trim()) && nudge.inScope;
  }

  async function submitTaste() {
    if (!canSubmit() || busy) return;
    dictation.stop();
    let image = draftImage;
    let text = draftContext.trim();
    const split = splitPromptMedia(text);
    if (!image && split.url) {
      const preview = await attachFromUrl(split.url);
      if (!preview) return;
      image = preview;
      text = split.caption;
      setDraftContext(text);
    }
    pendingRetaste.current = {
      imageSrc: image,
      context: text,
    };
    setTasteOpen(false);
  }

  useEffect(() => {
    if (!tasteOpen) dictation.stop();
  }, [tasteOpen, dictation.stop]);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || layerRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  return (
    <>
      <div className="canvas-edit" ref={rootRef}>
        <button
          type="button"
          className="canvas-edit__btn"
          aria-label="Edit"
          aria-expanded={open}
          disabled={busy}
          onClick={() => setOpen((v) => !v)}
        >
          <SquarePen size={16} />
        </button>
        {open ? (
          <div className="canvas-edit__menu" role="menu">
            <EditMenuItems
              busy={busy}
              onTaste={openTaste}
              onScratch={() => {
                setOpen(false);
                onStartOver();
              }}
            />
          </div>
        ) : null}
      </div>
      {createPortal(
        <AnimatePresence
          onExitComplete={() => {
            if (!pendingTaste.current) return;
            pendingTaste.current = false;
            setTasteOpen(true);
          }}
        >
          {open ? (
            <motion.div
              key="edit-layer"
              className="canvas-edit__layer"
              ref={layerRef}
              initial={false}
              exit={{ opacity: 1 }}
              transition={instant ? { duration: 0 } : { duration: 0.42 }}
            >
              <motion.button
                type="button"
                className="canvas-edit__veil"
                aria-label="Close"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={veilMotion}
                onClick={() => setOpen(false)}
              />
              <motion.div
                className="canvas-edit__sheet"
                role="menu"
                initial={sheetSlide.hidden}
                animate={sheetSlide.show}
                exit={sheetSlide.hidden}
                transition={sheetMotion}
              >
                <div className="canvas-edit__handle" aria-hidden />
                <EditMenuItems
                  busy={busy}
                  onTaste={openTaste}
                  onScratch={() => {
                    setOpen(false);
                    onStartOver();
                  }}
                />
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      )}
      {createPortal(
        <AnimatePresence
          onExitComplete={() => {
            const draft = pendingRetaste.current;
            if (!draft) return;
            pendingRetaste.current = null;
            onRetaste(draft);
          }}
        >
          {tasteOpen ? (
            <motion.div
              key="taste"
              className="studio-taste"
              role="dialog"
              aria-modal="true"
              aria-labelledby="studio-taste-title"
              initial={false}
              exit={{ opacity: 1 }}
              transition={instant ? { duration: 0 } : { duration: 0.42 }}
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
              <motion.button
                type="button"
                className="studio-taste__veil"
                aria-label="Close"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={veilMotion}
                onClick={closeTaste}
              />
              <motion.div
                className="inspiration__sheet studio-taste__sheet"
                initial={sheetSlide.hidden}
                animate={sheetSlide.show}
                exit={sheetSlide.hidden}
                transition={sheetMotion}
              >
                <div className="studio-taste__handle" aria-hidden />
                <button
                  type="button"
                  className="inspiration__close"
                  aria-label="Close"
                  onClick={closeTaste}
                >
                  <X size={18} />
                </button>
                <div className="inspiration__stack">
                  <div className="inspiration__remember-wrap">
                    <h2 id="studio-taste-title" className="inspiration__remember">
                      Tell me anything...
                    </h2>
                    <p className="inspiration__remember-sub">
                      A stray thought, a Pinterest or Instagram link, or an image.
                    </p>
                  </div>
                  {draftImage ? (
                    <div className="inspiration__media">
                      <div className="inspiration__thumb-wrap">
                        <div className="inspiration__thumb-frame">
                          <img
                            className="inspiration__thumb"
                            src={draftImage}
                            alt="Inspiration"
                          />
                        </div>
                        <button
                          type="button"
                          className="inspiration__remove"
                          aria-label="Remove image"
                          onClick={removeImage}
                        >
                          <X size={10} />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="inspiration__add"
                        aria-label="Replace image"
                        onClick={() => fileRef.current?.click()}
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  ) : null}
                  <div
                    className={`inspiration__composer${dictation.listening ? ' is-dictating' : ''}${!draftImage ? ' has-upload' : ''}${linking ? ' is-resolving' : ''}${linkFailed ? ' is-link-failed' : ''}`}
                    aria-busy={linking}
                  >
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
                      <textarea
                        value={draftContext}
                        onChange={(e) => {
                          if (dictation.listening) dictation.stop();
                          setLinkFailed(false);
                          setDraftContext(e.target.value);
                        }}
                        onPaste={onPaste}
                        placeholder={
                          draftImage
                            ? 'What caught your eye in this image?'
                            : 'A photo, a link, or a thought…'
                        }
                      />
                    )}
                    <div className="inspiration__composer-actions">
                      {dictation.listening ? <VoiceFreq /> : null}
                      {!draftImage && !dictation.listening ? (
                        <button
                          type="button"
                          className="inspiration__bar-btn"
                          aria-label="Add an image"
                          disabled={linking}
                          onClick={() => fileRef.current?.click()}
                        >
                          <ImageMark />
                        </button>
                      ) : null}
                      <DictateButton
                        className="inspiration__mic"
                        listening={dictation.listening}
                        disabled={linking}
                        onClick={dictation.toggle}
                      />
                    </div>
                  </div>
                  <AnimatePresence initial={false}>
                    {nudge.question ? (
                      <motion.div
                        key="jev-nudge"
                        className="inspiration__nudge-slot"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={instant ? { duration: 0 } : SHEET_SPRING}
                      >
                        <JevNudge
                          intentKey={nudge.key}
                          question={nudge.question}
                          options={nudge.options}
                          query={draftContext}
                          onToggle={toggleNudgeOption}
                        />
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
                {tasteError || dictation.error ? (
                  <p className="inspiration__error">{tasteError || dictation.error}</p>
                ) : null}
                <button
                  type="button"
                  className="inspiration__done"
                  disabled={!canSubmit() || dictation.listening || linking}
                  onClick={() => void submitTaste()}
                >
                  Let's go!
                </button>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
