import { useEffect, useRef } from 'react';
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

export type OrbPose = 'lookDown' | 'twitch' | 'idle';

type Props = {
  pose?: OrbPose;
  compact?: boolean;
};

export default function AvatarOrb({ pose, compact = false }: Props) {
  const lastPose = useRef<OrbPose | null>(null);
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
    if (!pose) {
      lastPose.current = null;
      return;
    }
    if (lastPose.current === pose) return;
    lastPose.current = pose;
    if (pose === 'lookDown') lookDown();
    if (pose === 'twitch') twitch();
    if (pose === 'idle') idle();
  }, [vmi, pose, lookDown, twitch, idle]);

  return (
    <div
      className={`avatar-orb${compact ? ' avatar-orb--compact' : ''}`}
      role="img"
      aria-label="Assistant"
    >
      <RiveComponent />
    </div>
  );
}
