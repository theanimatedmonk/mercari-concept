import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './CanvasCoachmark.css';

export const COACH_STEPS = [
  {
    title: 'Pull closer',
    body: 'Want more of this? Bring it closer.',
    target: 'far' as const,
    lock: false,
    prefer: 'above' as const,
  },
  {
    title: 'Push away',
    body: 'Still relevant, just not as much.',
    target: 'near' as const,
    lock: false,
    prefer: 'below' as const,
  },
  {
    title: 'Lock it in',
    body: 'Make this a non-negotiable.',
    target: 'lock' as const,
    lock: true,
    prefer: 'above' as const,
  },
  {
    title: 'Let it go',
    body: "Drop what doesn't feel right.",
    target: 'delete' as const,
    lock: false,
    prefer: 'above' as const,
  },
] as const;

export type CoachStep = (typeof COACH_STEPS)[number];

type Props = {
  step: number;
  targetId: string;
  canvasRef: React.RefObject<HTMLElement | null>;
  onNext: () => void;
  onBack: () => void;
  onDone: () => void;
};

const GAP = 18;
const ARROW = 28;
const HOLE_PAD = 12;

function coachNode(root: Element, id: string) {
  for (const node of root.querySelectorAll('[data-coach-target]')) {
    if (node.getAttribute('data-coach-target') === id) return node;
  }
  return null;
}

export default function CanvasCoachmark({
  step,
  targetId,
  canvasRef,
  onNext,
  onBack,
  onDone,
}: Props) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const current = COACH_STEPS[step];
  const [box, setBox] = useState({
    left: 0,
    top: 0,
    side: 'above' as 'above' | 'below' | 'left',
    hole: { left: 0, top: 0, width: 0, height: 0 },
    placed: false,
  });

  const layout = useCallback(() => {
    const canvas = canvasRef.current;
    const bubble = bubbleRef.current;
    if (!canvas || !bubble || !current) return;

    const spotlight = coachNode(canvas, targetId);
    if (!spotlight) return;
    const lock = spotlight.querySelector('[data-coach-lock]');
    const pointer = current.lock && lock instanceof HTMLElement ? lock : spotlight;

    const t = pointer.getBoundingClientRect();
    const s = spotlight.getBoundingClientRect();
    const b = bubble.getBoundingClientRect();
    const gap = GAP;
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;

    let side: 'above' | 'below' | 'left' = current.lock ? 'left' : current.prefer;
    let left = t.left + t.width / 2 - (b.width - ARROW);
    let top =
      side === 'above' ? t.top - b.height - gap : t.bottom + gap;

    if (current.lock) {
      if (t.left > b.width + gap + 12) {
        side = 'left';
        left = t.left - b.width - gap;
        top = t.top + t.height / 2 - b.height / 2;
      } else {
        side = 'below';
        left = t.left + t.width / 2 - (b.width - ARROW);
        top = t.bottom + gap;
      }
    } else {
      const roomAbove = t.top;
      if (side === 'above' && roomAbove < b.height + gap + 8) side = 'below';
      if (side === 'below' && viewH - t.bottom < b.height + gap + 8) side = 'above';
      left = t.left + t.width / 2 - (b.width - ARROW);
      top =
        side === 'above' ? t.top - b.height - gap : t.bottom + gap;
    }

    left = Math.max(12, Math.min(left, viewW - b.width - 12));
    top = Math.max(12, Math.min(top, viewH - b.height - 12));

    const bubbleBox = {
      left,
      top,
      right: left + b.width,
      bottom: top + b.height,
    };
    const overlapsLock =
      current.lock &&
      bubbleBox.left < t.right &&
      bubbleBox.right > t.left &&
      bubbleBox.top < t.bottom &&
      bubbleBox.bottom > t.top;
    if (overlapsLock) {
      side = 'below';
      left = Math.max(12, Math.min(t.left + t.width / 2 - (b.width - ARROW), viewW - b.width - 12));
      top = Math.max(12, Math.min(t.bottom + gap, viewH - b.height - 12));
    }

    const holeRect = current.lock && t.width >= 8 && t.height >= 8 ? t : s;
    const pad = current.lock ? HOLE_PAD + 6 : HOLE_PAD;
    setBox({
      left,
      top,
      side,
      hole: {
        left: holeRect.left - pad,
        top: holeRect.top - pad,
        width: holeRect.width + pad * 2,
        height: holeRect.height + pad * 2,
      },
      placed: true,
    });
  }, [canvasRef, current, targetId]);

  useLayoutEffect(() => {
    layout();
    let frames = 0;
    let frame = 0;
    const tick = () => {
      layout();
      frames += 1;
      if (frames < 10) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    const canvas = canvasRef.current;
    const bubble = bubbleRef.current;
    const ro = new ResizeObserver(layout);
    if (canvas) ro.observe(canvas);
    if (bubble) ro.observe(bubble);
    window.addEventListener('resize', layout);
    return () => {
      window.cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener('resize', layout);
    };
  }, [layout, canvasRef]);

  if (!current) return null;

  const last = step >= COACH_STEPS.length - 1;
  const first = step <= 0;

  return createPortal(
    <>
      {box.placed ? (
        <div
          className="coachmark__spot"
          style={{
            left: box.hole.left,
            top: box.hole.top,
            width: box.hole.width,
            height: box.hole.height,
          }}
          aria-hidden
        />
      ) : null}
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
    </>,
    document.body,
  );
}
