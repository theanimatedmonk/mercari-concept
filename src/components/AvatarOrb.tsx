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
import { useSystemTheme } from '../lib/theme';
import './AvatarOrb.css';

export type OrbPose = 'lookDown' | 'twitch' | 'idle';

type Props = {
  pose?: OrbPose;
  compact?: boolean;
};

export default function AvatarOrb({ pose, compact = false }: Props) {
  const artboard = useSystemTheme() === 'dark' ? 'Mercari-dark' : 'Mercari';

  return (
    <div
      className={`avatar-orb${compact ? ' avatar-orb--compact' : ''}`}
      role="img"
      aria-label="Assistant"
    >
      {/* useRive only reads its params on first load, so remount per artboard. */}
      <OrbRive key={artboard} artboard={artboard} pose={pose} />
    </div>
  );
}

function OrbRive({ artboard, pose }: { artboard: string; pose?: OrbPose }) {
  const lastPose = useRef<OrbPose | null>(null);
  const { rive, RiveComponent } = useRive(
    {
      src: mercariRiv,
      artboard,
      stateMachine: 'mercari',
      autoplay: true,
      autoBind: false,
      layout: new Layout({
        fit: Fit.Contain,
        alignment: Alignment.Center,
      }),
    },
    { shouldResizeCanvasToContainer: true },
  );

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

  return <RiveComponent />;
}
