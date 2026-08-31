import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import './CanvasCoachmark.css';

export const COACH_STEPS = [
  {
    title: 'Pull closer',
    body: 'Want more of this? Bring it closer.',
    target: 'statement',
    prefer: 'above' as const,
  },
  {
    title: 'Push away',
    body: 'Still relevant, just not as much.',
    target: 'sculptural',
    prefer: 'below' as const,
  },
  {
    title: 'Lock it in',
    body: 'Make this a non-negotiable.',
    target: 'elegant',
    lock: true,
    prefer: 'above' as const,
  },
  {
    title: 'Let it go',
    body: "Drop what doesn't feel right.",
    target: 'delete',
    prefer: 'above' as const,
  },
] as const;

export type CoachStep = (typeof COACH_STEPS)[number];

type Props = {
  step: number;
  canvasRef: React.RefObject<HTMLElement | null>;
  onNext: () => void;
  onBack: () => void;
  onDone: () => void;
};

const GAP = 18;
const ARROW = 28;

export default function CanvasCoachmark({
  step,
  canvasRef,
  onNext,
  onBack,
  onDone,
}: Props) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const current = COACH_STEPS[step];
  const [box, setBox] = useState({ left: 0, top: 0, side: 'above' as 'above' | 'below' });

  const layout = useCallback(() => {
    const canvas = canvasRef.current;
    const bubble = bubbleRef.current;
    if (!canvas || !bubble || !current) return;

    const selector =
      'lock' in current && current.lock
        ? `[data-coach-target="${current.target}"] .bubble__lock`
        : `[data-coach-target="${current.target}"]`;
    const target = canvas.querySelector(selector);
    if (!target) return;

    const origin = canvas.closest('.studio') ?? canvas;
    const c = origin.getBoundingClientRect();
    const t = target.getBoundingClientRect();
    const b = bubble.getBoundingClientRect();
    const roomAbove = t.top - c.top;
    let side: 'above' | 'below' = current.prefer;
    if (side === 'above' && roomAbove < b.height + GAP + 8) side = 'below';
    if (side === 'below' && c.bottom - t.bottom < b.height + GAP + 8) side = 'above';

    let left = t.left - c.left + t.width / 2 - (b.width - ARROW);
    let top =
      side === 'above' ? t.top - c.top - b.height - GAP : t.bottom - c.top + GAP;
    left = Math.max(12, Math.min(left, c.width - b.width - 12));
    top = Math.max(12, Math.min(top, c.height - b.height - 12));
    setBox({ left, top, side });
  }, [canvasRef, current]);

  useLayoutEffect(() => {
    layout();
    const canvas = canvasRef.current;
    const bubble = bubbleRef.current;
    const ro = new ResizeObserver(layout);
    if (canvas) ro.observe(canvas);
    if (bubble) ro.observe(bubble);
    window.addEventListener('resize', layout);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', layout);
    };
  }, [layout, canvasRef]);

  if (!current) return null;

  const last = step >= COACH_STEPS.length - 1;
  const first = step <= 0;

  return (
    <div
      className={`coachmark coachmark--${box.side}`}
      style={{ left: box.left, top: box.top }}
    >
      <div ref={bubbleRef} className="coachmark__bubble">
        <span className="coachmark__arrow" aria-hidden />
        <h2 className="coachmark__title">{current.title}</h2>
        <p className="coachmark__body">{current.body}</p>
        <div className="coachmark__bar">
          <button type="button" className="coachmark__skip" onClick={onDone}>
            {last ? 'Finish' : 'Skip'}
          </button>
          <div className="coachmark__nav">
            <button
              type="button"
              className="coachmark__back"
              aria-label="Back"
              disabled={first}
              onClick={onBack}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="coachmark__next"
              aria-label="Next"
              disabled={last}
              onClick={onNext}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
