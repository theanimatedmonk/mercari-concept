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
import mercariRiv from '../assets/rive/mercari.riv?url';
import './DeleteMark.css';

type Props = {
  hover: boolean;
};

export default function DeleteMark({ hover }: Props) {
  const { rive, RiveComponent } = useRive({
    src: mercariRiv,
    artboard: 'delete',
    stateMachine: 'delete',
    autoplay: true,
    autoBind: false,
    shouldDisableRiveListeners: true,
    layout: new Layout({
      fit: Fit.Contain,
      alignment: Alignment.Center,
    }),
  });

  const viewModel = useViewModel(rive, { name: 'Delete' });
  const vmi = useViewModelInstance(viewModel, { name: 'my instance', rive });
  const { setValue } = useViewModelInstanceBoolean('hover', vmi);

  useEffect(() => {
    setValue(hover);
  }, [hover, setValue]);

  return (
    <div className="delete-mark" aria-hidden>
      <RiveComponent />
    </div>
  );
}
