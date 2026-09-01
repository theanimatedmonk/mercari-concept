import { Clapperboard, IceCream, Mic, Plus, SquarePen, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DEMO_CONTEXT, DEMO_INSPIRATION } from '../../data/demo';
import '../InspirationInput/InspirationInput.css';
import './CanvasEdit.css';

type Props = {
  onStartOver: () => void;
};

export default function CanvasEdit({ onStartOver }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [tasteOpen, setTasteOpen] = useState(false);
  const [context, setContext] = useState(DEMO_CONTEXT);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
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
          onClick={() => setOpen((v) => !v)}
        >
          <SquarePen size={16} />
        </button>
        {open ? (
          <div className="canvas-edit__menu" role="menu">
            <button
              type="button"
              className="canvas-edit__item"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setContext(DEMO_CONTEXT);
                setTasteOpen(true);
              }}
            >
              <IceCream size={16} />
              Add more taste
            </button>
            <button
              type="button"
              className="canvas-edit__item"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onStartOver();
              }}
            >
              <Clapperboard size={16} />
              Start from scratch
            </button>
          </div>
        ) : null}
      </div>
      {tasteOpen
        ? createPortal(
            <div
              className="studio-taste"
              role="dialog"
              aria-modal="true"
              aria-labelledby="studio-taste-title"
            >
              <button
                type="button"
                className="studio-taste__veil"
                aria-label="Close"
                onClick={() => setTasteOpen(false)}
              />
              <div className="inspiration__sheet studio-taste__sheet">
                <button
                  type="button"
                  className="inspiration__close"
                  aria-label="Close"
                  onClick={() => setTasteOpen(false)}
                >
                  <X size={18} />
                </button>
                <div className="inspiration__stack">
                  <div className="inspiration__remember-wrap">
                    <h2 id="studio-taste-title" className="inspiration__remember">
                      Tell me anything...
                    </h2>
                    <p className="inspiration__remember-sub">
                      A stray thought, an image, whatever's there. Share it, we'll make
                      sense of it together.
                    </p>
                  </div>
                  <div className="inspiration__composer">
                    <textarea
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                      placeholder="Add a little context…"
                    />
                    <button type="button" className="inspiration__mic" aria-label="Speak">
                      <Mic size={16} />
                    </button>
                  </div>
                  <div className="inspiration__media">
                    <div className="inspiration__thumb-wrap">
                      <div className="inspiration__thumb-frame">
                        <img
                          className="inspiration__thumb"
                          src={DEMO_INSPIRATION}
                          alt="Inspiration"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="inspiration__add"
                      disabled
                      aria-label="Add another image"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  className="inspiration__done"
                  onClick={() => setTasteOpen(false)}
                >
                  Let's go!
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
