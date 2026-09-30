import { AnimatePresence } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import AvatarOrb from '../../components/AvatarOrb';
import { DRESS_CENTER, expansions } from '../../data/demo';
import { products as fallbackProducts } from '../../data/products';
import { isDressListing } from '../../lib/recommendation/dressFilter';
import { publicHttpUrl } from '../../lib/native/apiUrl';
import { useRecommendationFeed } from '../../lib/recommendation/useRecommendationFeed';
import { layoutAttributes } from '../../lib/llm/layoutAttributes';
import type { AnalyzeResponse } from '../../lib/llm/types';
import { patchSession, peekSession, persistableImage } from '../../lib/session';
import {
  pickCoachPills,
  spreadFromCenter,
  weightFromDistance,
} from '../../lib/scoring';
import type { Product, SemanticAttribute } from '../../types';
import AttributeBubble from './AttributeBubble';
import CanvasEdit from './CanvasEdit';
import CanvasCoachmark, { COACH_STEPS } from './CanvasCoachmark';
import DeleteZone from './DeleteZone';
import ProductPanel from './ProductPanel';
import ProductPreviewModal from './ProductPreviewModal';
import PhotoUploader from './PhotoUploader';
import GeneratingHero from '../InspirationInput/GeneratingHero';
import usePromptGenerate from './usePromptGenerate';
import useStyleOnMe from './useStyleOnMe';
import '../InspirationInput/InspirationInput.css';
import './SemanticStudio.css';

type Props = {
  imageSrc: string | null;
  context: string;
  analysis: AnalyzeResponse;
  resume?: boolean;
  onStartOver: () => void;
  onCommitted: (payload: {
    imageSrc: string | null;
    context: string;
    analysis: AnalyzeResponse;
  }) => void;
};

export default function SemanticStudio({
  imageSrc,
  context,
  analysis,
  resume = false,
  onStartOver,
  onCommitted,
}: Props) {
  const pills = layoutAttributes(analysis.attributes);
  const stored = resume ? peekSession() : null;
  const skipCoachRef = useRef(resume);
  const canvasRef = useRef<HTMLElement>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const generate = usePromptGenerate(async (payload) => {
    const storedImage = await persistableImage(payload.imageSrc);
    const nextPills = layoutAttributes(payload.analysis.attributes);
    setAttributes(nextPills);
    patchSession({
      imageSrc: storedImage,
      context: payload.context,
      analysis: payload.analysis,
      attributes: nextPills,
      coachDone: true,
    });
    onCommitted({
      imageSrc: storedImage,
      context: payload.context,
      analysis: payload.analysis,
    });
  }, setNotice);
  const [attributes, setAttributes] = useState<SemanticAttribute[]>(
    stored?.attributes?.length ? stored.attributes : pills,
  );
  const inspirationForApi = useMemo(() => {
    if (!imageSrc) return undefined;
    if (imageSrc.startsWith('http://') || imageSrc.startsWith('https://')) {
      return publicHttpUrl(imageSrc);
    }
    return undefined;
  }, [imageSrc]);
  const { catalog } = useRecommendationFeed(
    attributes,
    analysis.catalogQuery,
    inspirationForApi,
  );
  const [moves, setMoves] = useState(stored?.moves ?? 0);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [coachStep, setCoachStep] = useState(resume ? -1 : 0);
  const [tourOn, setTourOn] = useState(false);
  const [coachPick, setCoachPick] = useState<{
    far: string;
    near: string;
    lock: string;
  } | null>(null);
  const [preview, setPreview] = useState<{ product: Product; image?: string } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [spread, setSpread] = useState(1);
  const rankedHold = useRef(fallbackProducts.filter((item) => isDressListing(item.name, '', item.image)));
  const styleOnMe = useStyleOnMe((target) => setPreview(target), {
    selfie: stored?.selfie ?? null,
    jobs: stored?.jobs ?? [],
    dockOpen: stored?.dockOpen ?? false,
  });

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 2800);
    return () => window.clearTimeout(id);
  }, [notice]);

  useEffect(() => {
    if (resume) return;
    setAttributes(pills);
  }, [analysis, resume]);

  const attributesRef = useRef(attributes);
  attributesRef.current = attributes;
  const spreadRef = useRef(spread);
  spreadRef.current = spread;

  useEffect(() => {
    if (resume) return;
    const id = window.setTimeout(() => {
      if (skipCoachRef.current) return;
      setCoachPick(pickCoachPills(attributesRef.current, spreadRef.current));
      setTourOn(true);
    }, 4000);
    return () => window.clearTimeout(id);
  }, [resume]);

  useEffect(() => {
    patchSession({ attributes, moves, coachDone: coachStep < 0 || resume });
  }, [attributes, moves, coachStep, resume]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 48rem)');
    const apply = () => setSpread(mq.matches ? 1.38 : 1);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const ranked = useMemo(() => {
    if (draggingId || generate.active) return rankedHold.current;
    rankedHold.current = catalog;
    return catalog;
  }, [catalog, draggingId, generate.active]);
  const panelHold = useRef(attributes);
  const panelAttributes = useMemo(() => {
    if (generate.active) return panelHold.current;
    panelHold.current = attributes;
    return attributes;
  }, [attributes, generate.active]);

  function onRetaste(draft: { imageSrc: string | null; context: string }) {
    skipCoachRef.current = true;
    setTourOn(false);
    setCoachStep(-1);
    void generate.start(draft);
  }

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

  const visible = generate.active ? [] : attributes.filter((a) => a.state !== 'deleted');
  const coach = !generate.active && tourOn && coachStep >= 0 ? COACH_STEPS[coachStep] : undefined;
  const coachTarget =
    !coach || !coachPick
      ? undefined
      : coach.target === 'delete'
        ? 'delete'
        : coach.target === 'far'
        ? coachPick.far
        : coach.target === 'lock'
          ? coachPick.lock
          : coachPick.near;

  return (
    <div className={`studio${coach && coachTarget ? ' is-touring' : ''}`}>
      <div className="studio__layout">
      <section className={`canvas${generate.active ? ' is-generating' : ''}`}>
        <div className="canvas__atmosphere" />
        <div className="canvas__orb-dock">
          <AvatarOrb compact pose={generate.active ? 'twitch' : 'idle'} />
        </div>
        <CanvasEdit
          imageSrc={imageSrc}
          context={context}
          busy={generate.active}
          onStartOver={onStartOver}
          onRetaste={onRetaste}
        />
        <div className="canvas__field" ref={canvasRef as React.Ref<HTMLDivElement>}>
        {generate.active ? (
          <div className="canvas__generating">
            <GeneratingHero
              compact
              imageSrc={generate.imageSrc}
              context={generate.context}
              beats={generate.beats}
              beat={generate.beat}
              waiting={generate.waiting}
            />
          </div>
        ) : (
          <>
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
        <div className={`canvas__dress${imageSrc ? '' : ' is-prompt'}`}>
          <div className="canvas__dress-glow" />
          {imageSrc ? (
            <img
              className="canvas__dress-img"
              src={imageSrc}
              alt="Selected look"
            />
          ) : context.trim() ? (
            <p className="inspiration__prompt">{context.trim()}</p>
          ) : (
            <div className="canvas__dress-empty" aria-hidden />
          )}
        </div>
        <AnimatePresence>
          {visible.map((attr) => (
            <AttributeBubble
              key={attr.id}
              attr={attr}
              spread={spread}
              canvasRef={canvasRef}
              highlighted={coachTarget === attr.id}
              lockHint={Boolean(coach?.lock && coachTarget === attr.id)}
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
          active={deleteArmed || coachTarget === 'delete'}
          highlighted={coachTarget === 'delete'}
        />
          </>
        )}
        </div>
      </section>
      <ProductPanel
        ranked={ranked}
        attributes={panelAttributes}
        meaningfulMoves={Math.min(moves, 12)}
        onOpenPreview={(product) =>
          setPreview({
            product,
            image: styleOnMe.styledImageFor(product.id),
          })
        }
        jobs={styleOnMe.jobs}
        dockOpen={styleOnMe.dockOpen}
        onToggleDock={() => styleOnMe.setDockOpen((open) => !open)}
        onOpenJob={styleOnMe.openJob}
        styleStateFor={styleOnMe.styleStateFor}
        styledImageFor={styleOnMe.styledImageFor}
        canStyle={styleOnMe.canStyle}
        onStyleMe={styleOnMe.requestStyle}
      />
      </div>
      {coach && coachTarget ? (
        <CanvasCoachmark
          step={coachStep}
          targetId={coachTarget}
          canvasRef={canvasRef}
          onNext={() => setCoachStep((n) => n + 1)}
          onBack={() => setCoachStep((n) => Math.max(0, n - 1))}
          onDone={() => setCoachStep(-1)}
        />
      ) : null}
      {preview ? (
        <ProductPreviewModal
          key={preview.product.id}
          product={preview.product}
          generatedImage={styleOnMe.styledImageFor(preview.product.id)}
          selfiePreview={styleOnMe.selfie?.preview}
          attributes={panelAttributes}
          styling={styleOnMe.styleStateFor(preview.product.id) === 'generating'}
          canStyle={styleOnMe.canStyle(preview.product.id)}
          onStyleMe={() => styleOnMe.requestStyle(preview.product)}
          onChangeSelfie={() => styleOnMe.openUploader(preview.product)}
          onClose={() => setPreview(null)}
        />
      ) : null}
      {styleOnMe.uploaderFor ? (
        <PhotoUploader
          initial={styleOnMe.selfie}
          onClose={styleOnMe.closeUploader}
          onPick={styleOnMe.onUploaderPick}
        />
      ) : null}
      {styleOnMe.toast || notice ? (
        <div className="studio__toast" role="status">
          {styleOnMe.toast || notice}
        </div>
      ) : null}
    </div>
  );
}
