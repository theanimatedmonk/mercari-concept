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
  twitching?: boolean;
  compact?: boolean;
};

export default function AvatarOrb({
  lookingDown = false,
  twitching = false,
  compact = false,
}: Props) {
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
    if (twitching) twitch();
    else if (lookingDown) lookDown();
    else idle();
  }, [vmi, twitching, lookingDown, twitch, lookDown, idle]);

  useEffect(() => {
    if (!vmi) return;
    const ms = twitching ? 2800 : 8000;
    const id = window.setInterval(() => twitch(), ms);
    return () => window.clearInterval(id);
  }, [vmi, twitching, twitch]);

  return (
    <div
      className={`avatar-orb${compact ? ' avatar-orb--compact' : ''}`}
      role="img"
      aria-label="Assistant"
      onPointerEnter={() => {
        if (!lookingDown && !twitching) lookDown();
      }}
      onPointerLeave={() => {
        if (!lookingDown && !twitching) idle();
      }}
    >
      <RiveComponent />
    </div>
  );
}
