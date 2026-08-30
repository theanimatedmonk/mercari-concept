import { useEffect } from 'react';
import {
  Alignment,
  Fit,
  Layout,
  useRive,
  useViewModel,
  useViewModelInstance,
  useViewModelInstanceTrigger,
} from '@rive-app/react-webgl2';
import mercariRiv from '../assets/rive/mercari.riv?url';
import './AvatarOrb.css';

type Props = {
  lookingDown?: boolean;
};

export default function AvatarOrb({ lookingDown = false }: Props) {
  const { rive, RiveComponent } = useRive({
    src: mercariRiv,
    artboard: 'Mercari',
    stateMachine: 'mercari',
    autoplay: true,
    autoBind: false,
    layout: new Layout({
      fit: Fit.Contain,
      alignment: Alignment.Center,
    }),
  });

  const viewModel = useViewModel(rive, { name: 'Mercari' });
  const vmi = useViewModelInstance(viewModel, { name: 'Instance', rive });

  const { trigger: lookDown } = useViewModelInstanceTrigger('lookDown', vmi);
  const { trigger: twitch } = useViewModelInstanceTrigger('twitch', vmi);
  const { trigger: idle } = useViewModelInstanceTrigger('idle', vmi);

  useEffect(() => {
    if (!vmi) return;
    if (lookingDown) lookDown();
    else idle();
  }, [vmi, lookingDown, lookDown, idle]);

  useEffect(() => {
    if (!vmi) return;
    const id = window.setInterval(() => twitch(), 8000);
    return () => window.clearInterval(id);
  }, [vmi, twitch]);

  return (
    <div
      className="avatar-orb"
      role="img"
      aria-label="Assistant"
      onPointerEnter={() => {
        if (!lookingDown) lookDown();
      }}
      onPointerLeave={() => {
        if (!lookingDown) idle();
      }}
    >
      <RiveComponent />
    </div>
  );
}
