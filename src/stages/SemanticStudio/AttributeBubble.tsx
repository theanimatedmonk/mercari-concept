import { useDrag } from '@use-gesture/react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useState } from 'react';
import ContextMark from '../../components/icons/ContextMark';
import SparkleMark from '../../components/icons/SparkleMark';
import { clamp, distancePercent } from '../../lib/scoring';
import type { SemanticAttribute } from '../../types';

type Props = {
  attr: SemanticAttribute;
  onMove: (id: string, x: number, y: number) => void;
  onLock: (id: string) => void;
  onExpand: (id: string) => void;
  onDelete: (id: string) => void;
  canvasRef: React.RefObject<HTMLElement | null>;
  onDeleteArmed: (armed: boolean) => void;
  onGestureEnd: (kind: 'nudge' | 'away') => void;
};

export default function AttributeBubble({
  attr,
  onMove,
  onLock,
  onExpand,
  onDelete,
  canvasRef,
  onDeleteArmed,
  onGestureEnd,
}: Props) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [burst, setBurst] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dist = distancePercent(attr.x, attr.y);
  const close = dist < 16;
  const far = dist > 28;

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
      if (first) setDragging(true);
      const startDist = (memo as number) ?? dist;
      const next = pointToPercent(cx, cy);
      const nextDist = distancePercent(next.x, next.y);
      onDeleteArmed(next.y > 84);
      if (!first) {
        if (nextDist > startDist + 5) setFeedback('Less of this');
        else if (nextDist < startDist - 5) setFeedback('More of this');
      }
      onMove(attr.id, next.x, next.y);
      if (last) {
        setDragging(false);
        onDeleteArmed(false);
        if (next.y > 86) {
          setBurst(true);
          window.setTimeout(() => onDelete(attr.id), 280);
        } else {
          onGestureEnd(nextDist > startDist + 5 ? 'away' : 'nudge');
          window.setTimeout(() => setFeedback(null), 800);
        }
      }
      return first ? dist : memo;
    },
    { pointer: { keys: false }, filterTaps: true },
  );

  return (
    <div
      className={`bubble${close ? ' is-close' : ''}${far ? ' is-far' : ''}${
        attr.state === 'locked' ? ' is-locked' : ''
      }${dragging ? ' is-dragging' : ''}`}
      style={{
        left: `${attr.x}%`,
        top: `${attr.y}%`,
        opacity: burst ? 0 : 1,
        transform: `translate(-50%, -50%) scale(${close ? 1.08 : far ? 0.92 : 1})`,
      }}
    >
      <motion.div
        className="bubble__unit"
        layoutId={`attr-tag-${attr.id}`}
        layout={false}
        role="button"
        aria-label={attr.label}
        tabIndex={0}
        {...bind()}
        onDoubleClick={() => {
          if (attr.expandable) onExpand(attr.id);
        }}
      >
        <div className="bubble__pill">
          {attr.category !== 'user-context' && !far ? (
            <span className="bubble__mark">
              <SparkleMark fill="currentColor" stroke="none" />
            </span>
          ) : null}
          {attr.category === 'user-context' ? (
            <span className="bubble__mark bubble__mark--context">
              <ContextMark />
            </span>
          ) : null}
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
              <Lock size={12} />
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
