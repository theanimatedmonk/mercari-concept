import { Capacitor, registerPlugin } from '@capacitor/core';
import { splitPromptMedia } from '../llm/promptMedia';
import { isNativeApp } from './platform';

export type SharedFile = {
  uri: string;
  name: string;
  mimeType: string;
};

export type ShareReceivedEvent = {
  title?: string;
  texts?: string[];
  files?: SharedFile[];
};

export type IncomingShare = {
  file?: File;
  url?: string;
};

type ShareTargetPlugin = {
  addListener(
    eventName: 'shareReceived',
    listener: (event: ShareReceivedEvent) => void,
  ): Promise<{ remove: () => void }>;
};

const ShareTarget = registerPlugin<ShareTargetPlugin>('ShareTarget');

async function fileFromUri(file: SharedFile) {
  const path = file.uri.startsWith('file:') ? file.uri : `file://${file.uri}`;
  const src = Capacitor.convertFileSrc(path);
  const res = await fetch(src);
  const blob = await res.blob();
  const mime = file.mimeType || blob.type || 'image/jpeg';
  return new File([blob], file.name || 'share.jpg', { type: mime });
}

function urlFromTexts(texts: string[]) {
  for (const text of texts) {
    const { url } = splitPromptMedia(text);
    if (url) return url;
  }
  return undefined;
}

export async function parseShareEvent(event: ShareReceivedEvent): Promise<IncomingShare> {
  const image = event.files?.find((file) => file.mimeType.startsWith('image/'));
  const file = image ? await fileFromUri(image) : undefined;
  const url = urlFromTexts(event.texts ?? []);
  return { file, url };
}

export function subscribeShareTarget(onShare: (share: IncomingShare) => void) {
  if (!isNativeApp()) return () => undefined;
  let removed = false;
  let handle: { remove: () => void } | undefined;
  void ShareTarget.addListener('shareReceived', (event) => {
    void parseShareEvent(event).then((share) => {
      if (removed || (!share.file && !share.url)) return;
      onShare(share);
    });
  }).then((listener) => {
    if (removed) {
      void listener.remove();
      return;
    }
    handle = listener;
  });
  return () => {
    removed = true;
    void handle?.remove();
  };
}
