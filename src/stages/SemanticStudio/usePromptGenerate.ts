import { useRef, useState } from 'react';
import generatedSound from '../../assets/audio files/generated.mp3';
import { imageUrlToBase64, requestAnalyzeStream } from '../../lib/llm/client';
import { createRevealQueue } from '../../lib/llm/revealQueue';
import type { AnalysisAttribute, AnalyzeResponse } from '../../lib/llm/types';

export type PromptDraft = {
  imageSrc: string | null;
  context: string;
};

type GenerateState = PromptDraft & {
  analysis: AnalyzeResponse | null;
  attributes: AnalysisAttribute[];
  waiting: boolean;
};

const NOT_FASHION = "That doesn't look like fashion. Try another thought or photo.";

export default function usePromptGenerate(
  onComplete: (payload: PromptDraft & { analysis: AnalyzeResponse }) => void | Promise<void>,
  onError: (message: string) => void,
) {
  const [current, setCurrent] = useState<GenerateState | null>(null);
  const finished = useRef(false);
  const played = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const completeRef = useRef(onComplete);
  const errorRef = useRef(onError);
  completeRef.current = onComplete;
  errorRef.current = onError;

  async function start(draft: PromptDraft) {
    finished.current = false;
    played.current = false;
    setCurrent({
      imageSrc: draft.imageSrc,
      context: draft.context,
      analysis: null,
      attributes: [],
      waiting: true,
    });
    const queue = createRevealQueue((attribute) => {
      setCurrent((prev) =>
        prev
          ? {
              ...prev,
              waiting: false,
              attributes: prev.attributes.some((item) => item.id === attribute.id)
                ? prev.attributes
                : [...prev.attributes, attribute],
            }
          : prev,
      );
    });
    try {
      const payload: { text?: string; imageBase64?: string; mimeType?: string } = {};
      if (draft.context.trim()) payload.text = draft.context.trim();
      if (draft.imageSrc) {
        const image = await imageUrlToBase64(draft.imageSrc);
        payload.imageBase64 = image.imageBase64;
        payload.mimeType = image.mimeType;
      }
      const result = await requestAnalyzeStream(payload, queue.push);
      if (!result.fashion) {
        queue.stop();
        setCurrent(null);
        errorRef.current(NOT_FASHION);
        return;
      }
      await queue.done();
      setCurrent((prev) => (prev ? { ...prev, analysis: result, waiting: false } : prev));
      if (!played.current) {
        played.current = true;
        const audio = audioRef.current ?? new Audio(generatedSound);
        audioRef.current = audio;
        audio.currentTime = 0;
        void audio.play().catch(() => undefined);
      }
      window.setTimeout(() => {
        if (finished.current) return;
        finished.current = true;
        void Promise.resolve(
          completeRef.current({
            imageSrc: draft.imageSrc,
            context: draft.context,
            analysis: result,
          }),
        ).finally(() => setCurrent(null));
      }, 800);
    } catch (error) {
      queue.stop();
      setCurrent(null);
      errorRef.current(
        error instanceof Error ? error.message : 'Could not read that. Try again.',
      );
    }
  }

  return {
    active: Boolean(current),
    imageSrc: current?.imageSrc ?? null,
    context: current?.context ?? '',
    beats: current?.attributes ?? [],
    beat: Math.max((current?.attributes.length ?? 1) - 1, 0),
    waiting: current?.waiting ?? false,
    start,
  };
}
