import { AnimatePresence } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import AvatarOrb from '../../components/AvatarOrb';
import { initialAttributes } from '../../data/attributes';
import { DRESS_CENTER, expansions } from '../../data/demo';
import { LISTING_PRODUCT_ID, listingSimilarIds } from '../../data/listing';
import { products } from '../../data/products';
import { rankProducts, spreadFromCenter, weightFromDistance } from '../../lib/scoring';
import type { SemanticAttribute } from '../../types';
import AttributeBubble from './AttributeBubble';
import CanvasEdit from './CanvasEdit';
import CanvasCoachmark, { COACH_STEPS } from './CanvasCoachmark';
import DeleteZone from './DeleteZone';
import ProductPanel from './ProductPanel';
import ProductListing from '../ProductListing/ProductListing';
import './SemanticStudio.css';

type Props = {
  imageSrc: string;
  onStartOver: () => void;
};

export default function SemanticStudio({ imageSrc, onStartOver }: Props) {
  const canvasRef = useRef<HTMLElement>(null);
  const [attributes, setAttributes] = useState<SemanticAttribute[]>(initialAttributes);
  const [moves, setMoves] = useState(0);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [coachStep, setCoachStep] = useState(0);
  const [tourOn, setTourOn] = useState(false);
  const [listingOpen, setListingOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [spread, setSpread] = useState(1);
  const rankedHold = useRef(
    rankProducts(products, initialAttributes).map((row) => row.product),
  );

  useEffect(() => {
    const id = window.setTimeout(() => setTourOn(true), 4000);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 48rem)');
    const apply = () => setSpread(mq.matches ? 1.38 : 1);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const ranked = useMemo(() => {
    if (draggingId) return rankedHold.current;
    const next = rankProducts(products, attributes).map((row) => row.product);
    rankedHold.current = next;
    return next;
  }, [attributes, draggingId]);

  function onMove(id: string, x: number, y: number) {
    setAttributes((list) =>
      list.map((item) => {
        if (item.id !== id || item.state === 'locked' || item.state === 'deleted') {
          return item;
        }
        let nx = x;
        let ny = y;
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

  function onGestureEnd() {
    setDraggingId(null);
    setMoves((n) => n + 1);
  }

  function onLock(id: string) {
    setAttributes((list) =>
      list.map((item) => {
        if (item.id !== id) return item;
        if (item.state === 'locked') {
          const weight = weightFromDistance(item.x, item.y);
          return {
            ...item,
            state: weight <= 0.35 ? 'less-relevant' : 'active',
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
  }

  function onDelete(id: string) {
    setDraggingId(null);
    setAttributes((list) =>
      list.map((item) =>
        item.id === id ? { ...item, state: 'deleted', weight: 0 } : item,
      ),
    );
    setMoves((n) => n + 1);
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
  const coach = tourOn && coachStep >= 0 ? COACH_STEPS[coachStep] : undefined;

  return (
    <div className="studio">
      <div className="studio__layout">
      <section className="canvas" ref={canvasRef}>
        <div className="canvas__atmosphere" />
        <svg className="canvas__links" aria-hidden>
          {visible.map((attr) => {
            const opacity = 0.14 + attr.weight * 0.4;
            const tip = spreadFromCenter(attr.x, attr.y, spread);
            return (
              <line
                key={attr.id}
                x1={`${DRESS_CENTER.x}%`}
                y1={`${DRESS_CENTER.y}%`}
                x2={`${tip.x}%`}
                y2={`${tip.y}%`}
                stroke="currentColor"
                strokeWidth={attr.state === 'locked' ? 2 : 1}
                style={{ color: 'var(--color-connection-strong)', opacity }}
              />
            );
          })}
        </svg>
        <div className="canvas__orb-dock">
          <AvatarOrb compact pose="idle" />
        </div>
        <CanvasEdit onStartOver={onStartOver} />
        <div className="canvas__dress">
          <div className="canvas__dress-glow" />
          <img
            className="canvas__dress-img"
            src={imageSrc}
            alt="Selected dress"
          />
        </div>
        <AnimatePresence>
          {visible.map((attr) => (
            <AttributeBubble
              key={attr.id}
              attr={attr}
              spread={spread}
              canvasRef={canvasRef}
              highlighted={coach?.target === attr.id}
              onMove={onMove}
              onDragStart={() => setDraggingId(attr.id)}
              onLock={onLock}
              onExpand={onExpand}
              onDelete={onDelete}
              onDeleteArmed={setDeleteArmed}
              onGestureEnd={onGestureEnd}
            />
          ))}
        </AnimatePresence>
        <DeleteZone
          active={deleteArmed || coach?.target === 'delete'}
          highlighted={coach?.target === 'delete'}
        />
      </section>
      <ProductPanel
        ranked={ranked}
        attributes={attributes}
        meaningfulMoves={Math.min(moves, 12)}
        onOpenListing={() => setListingOpen(true)}
      />
      </div>
      {coach ? <div className="studio__veil" /> : null}
      {coach ? (
        <CanvasCoachmark
          step={coachStep}
          canvasRef={canvasRef}
          onNext={() => setCoachStep((n) => n + 1)}
          onBack={() => setCoachStep((n) => Math.max(0, n - 1))}
          onDone={() => setCoachStep(-1)}
        />
      ) : null}
      <AnimatePresence>
        {listingOpen ? (
          <ProductListing
            key="listing"
            product={products.find((item) => item.id === LISTING_PRODUCT_ID) ?? products[0]}
            similar={listingSimilarIds
              .map((id) => products.find((item) => item.id === id))
              .filter((item): item is (typeof products)[number] => Boolean(item))}
            onClose={() => setListingOpen(false)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
