import { useRef, useState } from 'react';
import { ArrowUp, Mic } from 'lucide-react';
import { DEMO_CONTEXT, DEMO_INSPIRATION } from '../../data/demo';
import './InspirationInput.css';

const PROMPTS = [
  'I saw something like this somewhere',
  'Help me find a gift',
  "I'm looking for a specific vibe",
  'Help me find something for my space',
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
    const url = URL.createObjectURL(file);
    setImageSrc(url);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) useFile(file);
  }

  function onMic() {
    setListening(true);
    setContext('');
    window.setTimeout(() => {
      setContext(DEMO_CONTEXT);
      setListening(false);
    }, 900);
  }

  function submit() {
    onContinue(imageSrc ?? DEMO_INSPIRATION, context || DEMO_CONTEXT);
  }

  return (
    <section className="inspiration">
      <div className="inspiration__inner">
        <header className="inspiration__intro">
          <p className="inspiration__eyebrow">Mercari</p>
          <h1 className="inspiration__title">What's on your mind?</h1>
          <p className="inspiration__sub">
            Show me something you saw, describe it, or tell me what you're looking
            for.
          </p>
        </header>

        <div
          className={`inspiration__card${dragging ? ' is-dragging' : ''}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          {imageSrc ? (
            <img className="inspiration__preview" src={imageSrc} alt="Inspiration" />
          ) : (
            <>
              <h2>Show me what caught your eye</h2>
              <p>Drop an image or paste from anywhere.</p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) useFile(file);
            }}
          />
          <button
            type="button"
            className="inspiration__demo"
            onClick={(e) => {
              e.stopPropagation();
              setImageSrc(DEMO_INSPIRATION);
            }}
          >
            Use demo inspiration
          </button>
        </div>

        <div className="inspiration__context">
          <h3>Anything else you remember?</h3>
          <div className="inspiration__field">
            <button
              type="button"
              className={`inspiration__icon-btn${listening ? ' is-listening' : ''}`}
              onClick={onMic}
              aria-label="Speak"
            >
              <Mic size={18} />
            </button>
            <input
              value={context}
              onChange={(e) => setContext(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
              }}
              placeholder="Add a little context…"
            />
            <button
              type="button"
              className="inspiration__icon-btn inspiration__submit"
              onClick={submit}
              aria-label="Continue"
            >
              <ArrowUp size={18} />
            </button>
          </div>
        </div>

        <div className="inspiration__prompts">
          {PROMPTS.map((prompt) => (
            <button key={prompt} type="button" className="inspiration__chip">
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
