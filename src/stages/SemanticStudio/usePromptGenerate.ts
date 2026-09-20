import { useEffect, useRef, useState } from 'react';
import generatedSound from '../../assets/audio files/generated.mp3';
import { imageUrlToBase64, requestAnalyze } from '../../lib/llm/client';
import type { AnalyzeResponse } from '../../lib/llm/types';
import { GENERATE_BEAT_MS } from '../InspirationInput/GeneratingHero';

export type PromptDraft = {
  imageSrc: string | null;
  context: string;
};

type GenerateState = PromptDraft & {
  analysis: AnalyzeResponse | null;
  waiting: boolean;
  beat: number;
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

  const beats = current?.analysis?.attributes ?? [];
  const lastBeat = Math.max(beats.length - 1, 0);

  useEffect(() => {
    if (!current || current.waiting || !current.analysis?.fashion) return;
    if (beats.length === 0 || current.beat >= lastBeat) {
      if (!played.current) {
        played.current = true;
        const audio = audioRef.current ?? new Audio(generatedSound);
        audioRef.current = audio;
        audio.currentTime = 0;
        void audio.play().catch(() => undefined);
      }
    const done = window.setTimeout(() => {
      if (finished.current || !current.analysis) return;
      finished.current = true;
      const result = current.analysis;
      void Promise.resolve(
        completeRef.current({
          imageSrc: current.imageSrc,
          context: current.context,
          analysis: result,
        }),
      ).finally(() => setCurrent(null));
    }, 900);
      return () => window.clearTimeout(done);
    }
    const id = window.setTimeout(() => {
      setCurrent((prev) => (prev ? { ...prev, beat: prev.beat + 1 } : prev));
    }, GENERATE_BEAT_MS);
    return () => window.clearTimeout(id);
  }, [current, lastBeat, beats.length]);

  async function start(draft: PromptDraft) {
    finished.current = false;
    played.current = false;
    setCurrent({
      imageSrc: draft.imageSrc,
      context: draft.context,
      analysis: null,
      waiting: true,
      beat: 0,
    });
    try {
      const payload: { text?: string; imageBase64?: string; mimeType?: string } = {};
      if (draft.context.trim()) payload.text = draft.context.trim();
      if (draft.imageSrc) {
        const image = await imageUrlToBase64(draft.imageSrc);
        payload.imageBase64 = image.imageBase64;
        payload.mimeType = image.mimeType;
      }
      const result = await requestAnalyze(payload);
      if (!result.fashion) {
        setCurrent(null);
        errorRef.current(NOT_FASHION);
        return;
      }
      setCurrent((prev) =>
        prev
          ? { ...prev, analysis: result, waiting: false, beat: 0 }
          : prev,
      );
    } catch (error) {
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
    beats,
    beat: current?.beat ?? 0,
    waiting: current?.waiting ?? false,
    start,
  };
}
