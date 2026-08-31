import { useDrag } from '@use-gesture/react';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import LockMark from '../../components/icons/LockMark';
import { clamp, distancePercent } from '../../lib/scoring';
import type { SemanticAttribute } from '../../types';

const MORE_ENTER = 17;
const LESS_ENTER = 27;

type Band = 'more' | 'less';

type Props = {
  attr: SemanticAttribute;
  highlighted?: boolean;
  onMove: (id: string, x: number, y: number) => void;
  onDragStart: () => void;
  onLock: (id: string) => void;
  onExpand: (id: string) => void;
  onDelete: (id: string) => void;
  canvasRef: React.RefObject<HTMLElement | null>;
  onDeleteArmed: (armed: boolean) => void;
  onGestureEnd: (kind: 'nudge' | 'away') => void;
};

function bandFromDist(dist: number, current: Band): Band {
  if (dist >= LESS_ENTER) return 'less';
  if (dist <= MORE_ENTER) return 'more';
  return current;
}

export default function AttributeBubble({
  attr,
  highlighted,
  onMove,
  onDragStart,
  onLock,
  onExpand,
  onDelete,
  canvasRef,
  onDeleteArmed,
  onGestureEnd,
}: Props) {
  const dist = distancePercent(attr.x, attr.y);
  const locked = attr.state === 'locked';
  const [dragging, setDragging] = useState(false);
  const [burst, setBurst] = useState(false);
  const [band, setBand] = useState<Band>(dist < 22 ? 'more' : 'less');
  const bandRef = useRef(band);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (dragging) return;
    const next = dist < 22 ? 'more' : 'less';
    bandRef.current = next;
    setBand(next);
  }, [dist, dragging]);

  function pointToPercent(clientX: number, clientY: number) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: attr.x, y: attr.y };
    return {
      x: clamp(((clientX - rect.left) / rect.width) * 100, 6, 94),
      y: clamp(((clientY - rect.top) / rect.height) * 100, 8, 92),
    };
  }

  const bind = useDrag(
    ({ xy: [cx, cy], last, first, memo }) => {
      if (attr.state === 'locked') return memo;
      if (first) {
        setDragging(true);
        onDragStart();
      }
      const startDist = (memo as number) ?? dist;
      const next = pointToPercent(cx, cy);
      const nextDist = distancePercent(next.x, next.y);
      const zone = canvasRef.current?.querySelector('[data-coach-target="delete"]');
      const zoneRect = zone?.getBoundingClientRect();
      const overDelete = zoneRect
        ? cx >= zoneRect.left &&
          cx <= zoneRect.right &&
          cy >= zoneRect.top &&
          cy <= zoneRect.bottom
        : next.y > 84;
      onDeleteArmed(overDelete);
      const nextBand = bandFromDist(nextDist, bandRef.current);
      if (nextBand !== bandRef.current) {
        bandRef.current = nextBand;
        setBand(nextBand);
      }
      if (!first) {
        setFeedback(nextBand === 'less' ? 'Less of this' : 'More of this');
      }
      onMove(attr.id, next.x, next.y);
      if (last) {
        setDragging(false);
        onDeleteArmed(false);
        if (overDelete) {
          setBurst(true);
          window.setTimeout(() => onDelete(attr.id), 280);
        } else {
          onGestureEnd(nextDist > startDist + 5 ? 'away' : 'nudge');
          window.setTimeout(() => setFeedback(null), 900);
        }
      }
      return first ? dist : memo;
    },
    { pointer: { keys: false }, filterTaps: true },
  );

  const more = !locked && band === 'more';
  const less = !locked && band === 'less';

  return (
    <div
      data-coach-target={attr.id}
      className={`bubble${more ? ' is-more' : ''}${less ? ' is-less' : ''}${
        locked ? ' is-locked' : ''
      }${dragging ? ' is-dragging' : ''}${highlighted ? ' is-coach-target' : ''}`}
      style={{
        left: `${attr.x}%`,
        top: `${attr.y}%`,
        opacity: burst ? 0 : 1,
      }}
    >
      <motion.div
        className="bubble__unit"
        role="button"
        aria-label={attr.label}
        tabIndex={0}
        {...bind()}
        onDoubleClick={() => {
          if (attr.expandable) onExpand(attr.id);
        }}
      >
        <div className="bubble__pill">
          {attr.id === 'plum' ? <span className="bubble__swatch" aria-hidden /> : null}
          {attr.label}
          <span className="bubble__lock-wrap">
            <span
              role="button"
              tabIndex={0}
              className="bubble__lock"
              aria-label={
                attr.state === 'locked' ? `Unlock ${attr.label}` : `Lock ${attr.label}`
              }
              onClick={() => onLock(attr.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onLock(attr.id);
                }
              }}
            >
              <LockMark filled={attr.state === 'locked'} />
            </span>
            <span className="bubble__tooltip" role="tooltip">
              {attr.state === 'locked' ? 'Unlock this quality' : 'Lock this quality'}
            </span>
          </span>
        </div>
        {feedback ? <span className="bubble__feedback">{feedback}</span> : null}
      </motion.div>
      {burst
        ? Array.from({ length: 8 }).map((_, i) => (
            <motion.span
              key={i}
              className="bubble__particle"
              initial={{ opacity: 1, x: 0, y: 0 }}
              animate={{
                opacity: 0,
                x: Math.cos((i / 8) * Math.PI * 2) * 36,
                y: Math.sin((i / 8) * Math.PI * 2) * 36,
              }}
            />
          ))
        : null}
    </div>
  );
}
