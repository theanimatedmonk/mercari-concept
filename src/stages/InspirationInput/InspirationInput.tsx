import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Mic, Plus, X } from 'lucide-react';
import AvatarOrb from '../../components/AvatarOrb';
import giftIcon from '../../assets/hero-icons/gift.svg';
import vibeIcon from '../../assets/hero-icons/vibe.svg';
import spaceIcon from '../../assets/hero-icons/space.svg';
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

type Props = {
  onContinue: (imageSrc: string, context: string) => void;
};

export default function InspirationInput({ onContinue }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [context, setContext] = useState(DEMO_CONTEXT);
  const [dragging, setDragging] = useState(false);
  const [listening, setListening] = useState(false);

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
    if (!imageSrc) return;
    onContinue(imageSrc, context || DEMO_CONTEXT);
  }

  return (
    <section className="inspiration">
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

      <div className="inspiration__inner">
        <header className="inspiration__intro">
          <AvatarOrb lookingDown={Boolean(imageSrc)} />
          {!imageSrc ? (
            <>
              <h1 className="inspiration__title">What's on your mind?</h1>
              <p className="inspiration__sub">
                Show me something you saw, describe it, or tell me what you're looking
                for.
              </p>
            </>
          ) : null}
        </header>

        {!imageSrc ? (
          <>
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
                <img className="inspiration__thumb" src={imageSrc} alt="Inspiration" />
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
    </section>
  );
}
