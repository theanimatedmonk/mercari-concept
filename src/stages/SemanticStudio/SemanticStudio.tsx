import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useRef, useState } from 'react';
import AvatarOrb from '../../components/AvatarOrb';
import { initialAttributes } from '../../data/attributes';
import { DRESS_CENTER, expansions } from '../../data/demo';
import { products } from '../../data/products';
import { distancePercent, rankProducts, weightFromDistance } from '../../lib/scoring';
import type { SemanticAttribute } from '../../types';
import AttributeBubble from './AttributeBubble';
import DeleteZone from './DeleteZone';
import ProductPanel from './ProductPanel';
import './SemanticStudio.css';

type Props = {
  imageSrc: string;
};

export default function SemanticStudio({ imageSrc }: Props) {
  const canvasRef = useRef<HTMLElement>(null);
  const [attributes, setAttributes] = useState<SemanticAttribute[]>(initialAttributes);
  const [moves, setMoves] = useState(0);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [hint, setHint] = useState(1);

  const ranked = useMemo(
    () => rankProducts(products, attributes).map((row) => row.product),
    [attributes],
  );

  function bumpHint(next: number) {
    setHint((h) => (h === 0 ? 0 : Math.max(h, next)));
  }

  function onMove(id: string, x: number, y: number) {
    setAttributes((list) =>
      list.map((item) => {
        if (item.id !== id || item.state === 'locked' || item.state === 'deleted') {
          return item;
        }
        let nx = x;
        let ny = y;
        const dist = distancePercent(x, y);
        if (dist < 11) {
          nx += (DRESS_CENTER.x - x) * 0.12;
          ny += (DRESS_CENTER.y - y) * 0.12;
        }
        const weight = weightFromDistance(nx, ny);
        return {
          ...item,
          x: nx,
          y: ny,
          weight,
          state: weight <= 0.35 ? 'less-relevant' : 'active',
        };
      }),
    );
  }

  function onGestureEnd(kind: 'nudge' | 'away') {
    setMoves((n) => n + 1);
    bumpHint(kind === 'away' ? 3 : 2);
  }

  function onLock(id: string) {
    setAttributes((list) =>
      list.map((item) => {
        if (item.id !== id) return item;
        if (item.state === 'locked') {
          const weight = weightFromDistance(item.x, item.y);
          return {
            ...item,
            state: (weight <= 0.35 ? 'less-relevant' : 'active') as const,
            weight,
          };
        }
        const angle = Math.atan2(item.y - DRESS_CENTER.y, item.x - DRESS_CENTER.x);
        return {
          ...item,
          state: 'locked' as const,
          weight: 1,
          x: DRESS_CENTER.x + Math.cos(angle) * 12,
          y: DRESS_CENTER.y + Math.sin(angle) * 12,
        };
      }),
    );
    setMoves((n) => n + 1);
    setHint(0);
  }

  function onDelete(id: string) {
    setAttributes((list) =>
      list.map((item) =>
        item.id === id ? { ...item, state: 'deleted', weight: 0 } : item,
      ),
    );
    setMoves((n) => n + 1);
    bumpHint(4);
  }

  function onExpand(id: string) {
    const kids = expansions[id];
    if (!kids) return;
    setAttributes((list) => {
      const parent = list.find((a) => a.id === id);
      if (!parent) return list;
      const existing = new Set(list.map((a) => a.id));
      const spawned: SemanticAttribute[] = kids
        .filter((kid) => !existing.has(kid.id))
        .map((kid, index) => {
          const angle = -Math.PI / 2 + index * (Math.PI / 2);
          return {
            id: kid.id,
            label: kid.label,
            category: parent.category,
            weight: 0.6,
            x: parent.x + Math.cos(angle) * 12,
            y: parent.y + Math.sin(angle) * 12,
            state: 'active' as const,
            parentId: parent.id,
          };
        });
      return list
        .map((item) =>
          item.id === id ? { ...item, expandable: false, weight: 0.45 } : item,
        )
        .concat(spawned);
    });
    setMoves((n) => n + 1);
  }

  const visible = attributes.filter((a) => a.state !== 'deleted');
  const hintCopy =
    hint === 1
      ? 'Pull qualities closer to keep more of them'
      : hint === 2
        ? 'Move this away if you want less of it'
        : hint === 3
          ? 'Drop irrelevant ideas here'
          : hint === 4
            ? "Lock what you don't want to compromise on"
            : null;

  return (
    <div className="studio">
      <section className="canvas" ref={canvasRef}>
        <div className="canvas__atmosphere" />
        <svg className="canvas__links" aria-hidden>
          {visible.map((attr) => {
            const opacity = 0.14 + attr.weight * 0.4;
            return (
              <line
                key={attr.id}
                x1={`${DRESS_CENTER.x}%`}
                y1={`${DRESS_CENTER.y}%`}
                x2={`${attr.x}%`}
                y2={`${attr.y}%`}
                stroke="currentColor"
                strokeWidth={attr.state === 'locked' ? 2 : 1}
                style={{ color: 'var(--color-connection-strong)', opacity }}
              />
            );
          })}
        </svg>
        <div className="canvas__orb-dock">
          <motion.div layout layoutId="avatar-orb-slot">
            <AvatarOrb compact twitching />
          </motion.div>
          {hintCopy ? <p className="canvas__hint">{hintCopy}</p> : null}
        </div>
        <div className="canvas__dress">
          <div className="canvas__dress-glow" />
          <motion.img
            layoutId="inspiration-dress"
            className="canvas__dress-img"
            src={imageSrc}
            alt="Selected dress"
            transition={{ type: 'spring', stiffness: 52, damping: 18, mass: 1 }}
          />
        </div>
        <AnimatePresence>
          {visible.map((attr) => (
            <AttributeBubble
              key={attr.id}
              attr={attr}
              canvasRef={canvasRef}
              onMove={onMove}
              onLock={onLock}
              onExpand={onExpand}
              onDelete={onDelete}
              onDeleteArmed={setDeleteArmed}
              onGestureEnd={onGestureEnd}
            />
          ))}
        </AnimatePresence>
        <DeleteZone active={deleteArmed} />
      </section>
      <ProductPanel
        ranked={ranked}
        attributes={attributes}
        meaningfulMoves={Math.min(moves, 12)}
      />
    </div>
  );
}
