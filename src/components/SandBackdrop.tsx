import { useEffect } from 'react';
import {
  Alignment,
  Fit,
  Layout,
  useRive,
  useViewModel,
  useViewModelInstance,
  useViewModelInstanceNumber,
} from '@rive-app/react-webgl2';
import pageShade from '../assets/bg-shade.png';
import sandRiv from '../assets/rive/sand.riv?url';
import './SandBackdrop.css';

const MOBILE = '(max-width: 48rem)';
const HEIGHT_DESKTOP = 480;
const HEIGHT_MOBILE = 280;

type Props = {
  hidden?: boolean;
};

function sandSize() {
  const mobile = window.matchMedia(MOBILE).matches;
  return {
    width: Math.max(1, window.innerWidth),
    height: mobile ? HEIGHT_MOBILE : HEIGHT_DESKTOP,
  };
}

export default function SandBackdrop({ hidden = false }: Props) {
  const { rive, RiveComponent } = useRive({
    src: sandRiv,
    artboard: 'sand',
    stateMachine: 'SandEffect',
    autoplay: true,
    autoBind: false,
    enableGPUCanvas: true,
    layout: new Layout({
      fit: Fit.Fill,
      alignment: Alignment.TopCenter,
    }),
  });

  const viewModel = useViewModel(rive, { name: 'Sand' });
  const vmi = useViewModelInstance(viewModel, { name: 'Instance', rive });
  const { setValue: setWidth } = useViewModelInstanceNumber('width', vmi);
  const { setValue: setHeight } = useViewModelInstanceNumber('height', vmi);

  useEffect(() => {
    const apply = () => {
      const next = sandSize();
      setWidth(next.width);
      setHeight(next.height);
      rive?.resizeDrawingSurfaceToCanvas();
    };
    apply();
    const mq = window.matchMedia(MOBILE);
    window.addEventListener('resize', apply);
    mq.addEventListener('change', apply);
    return () => {
      window.removeEventListener('resize', apply);
      mq.removeEventListener('change', apply);
    };
  }, [rive, setHeight, setWidth]);

  useEffect(() => {
    if (!rive) return;
    if (hidden) rive.pause();
    else rive.play();
  }, [hidden, rive]);

  return (
    <>
      <img
        className={`sand-backdrop__shade${hidden ? ' is-hidden' : ''}`}
        src={pageShade}
        alt=""
        aria-hidden
      />
      <div className={`sand-backdrop${hidden ? ' is-hidden' : ''}`} aria-hidden>
        <RiveComponent className="sand-backdrop__rive" />
      </div>
    </>
  );
}
