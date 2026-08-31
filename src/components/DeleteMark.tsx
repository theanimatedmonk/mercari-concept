import { useEffect } from 'react';
import {
  Alignment,
  Fit,
  Layout,
  useRive,
  useViewModel,
  useViewModelInstance,
  useViewModelInstanceBoolean,
} from '@rive-app/react-webgl2';
import deleteRiv from '../assets/rive/delete.riv?url';
import './DeleteMark.css';

type Props = {
  hover: boolean;
};

export default function DeleteMark({ hover }: Props) {
  const { rive, RiveComponent } = useRive({
    src: deleteRiv,
    artboard: 'delete',
    stateMachine: 'delete',
    autoplay: true,
    autoBind: false,
    shouldDisableRiveListeners: true,
    shouldResizeCanvasToContainer: true,
    layout: new Layout({
      fit: Fit.Contain,
      alignment: Alignment.Center,
    }),
  });

  const viewModel = useViewModel(rive, { name: 'Delete' });
  const vmi = useViewModelInstance(viewModel, { name: 'my instance', rive });
  const { setValue } = useViewModelInstanceBoolean('hover', vmi);

  useEffect(() => {
    if (!rive) return;
    const resize = () => rive.resizeDrawingSurfaceToCanvas();
    resize();
    const id = requestAnimationFrame(resize);
    return () => cancelAnimationFrame(id);
  }, [rive]);

  useEffect(() => {
    if (!vmi) return;
    setValue(hover);
  }, [hover, vmi, setValue]);

  return (
    <div className="delete-mark" aria-hidden>
      <RiveComponent className="delete-mark__canvas" />
    </div>
  );
}
