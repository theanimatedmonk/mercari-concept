export const PERMISSION_KINDS = ['camera', 'photos', 'microphone'] as const;

export type PermissionKind = (typeof PERMISSION_KINDS)[number];

export const PERMISSION_COPY: Record<
  PermissionKind,
  { title: string; body: string; allow: string; deny: string }
> = {
  camera: {
    title: 'Use the camera',
    body: 'Lookmind uses the camera so you can snap a look you want to find, or a photo of you to style a piece on.',
    allow: 'Continue',
    deny: 'Not now',
  },
  photos: {
    title: 'Use your photos',
    body: 'Lookmind uses your photo library so you can pick a saved inspiration image, including looks shared from other apps.',
    allow: 'Continue',
    deny: 'Not now',
  },
  microphone: {
    title: 'Use the microphone',
    body: 'Lookmind uses the microphone so you can describe a look out loud instead of typing.',
    allow: 'Continue',
    deny: 'Not now',
  },
};
