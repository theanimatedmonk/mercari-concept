import { useEffect, useRef, useState } from 'react';
import generatedSound from '../../assets/audio files/generated.mp3';
import {
  asGeneratedSrc,
  catalogImageUrl,
  requestStyleOnMe,
} from '../../lib/llm/styleOnMeClient';
import { patchSession } from '../../lib/session';
import type { Product } from '../../types';
import type { SelfiePayload } from './PhotoUploader';
import {
  MAX_STYLE_JOBS,
  STYLE_CAP_TOAST,
  type StyleJob,
} from './styleOnMeTypes';

export type PreviewTarget = {
  product: Product;
  image?: string;
};

type InitialStyle = {
  selfie?: SelfiePayload | null;
  jobs?: StyleJob[];
  dockOpen?: boolean;
};

export default function useStyleOnMe(
  onOpenPreview: (target: PreviewTarget) => void,
  initial: InitialStyle = {},
) {
  const [jobs, setJobs] = useState<StyleJob[]>(initial.jobs ?? []);
  const [dockOpen, setDockOpen] = useState(initial.dockOpen ?? false);
  const [selfie, setSelfie] = useState<SelfiePayload | null>(initial.selfie ?? null);
  const [uploaderFor, setUploaderFor] = useState<Product | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const inflightRef = useRef(0);
  const generatingIdsRef = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function inflight() {
    if (typeof inflightRef.current !== 'number') inflightRef.current = 0;
    return inflightRef.current;
  }

  function generatingIds() {
    if (!(generatingIdsRef.current instanceof Set)) {
      generatingIdsRef.current = new Set();
    }
    return generatingIdsRef.current;
  }

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    patchSession({
      selfie,
      jobs,
      dockOpen,
    });
  }, [selfie, jobs, dockOpen]);

  function startJob(product: Product, photo: SelfiePayload) {
    if (inflight() >= MAX_STYLE_JOBS) {
      setToast(STYLE_CAP_TOAST);
      return;
    }
    if (generatingIds().has(product.id)) return;

    inflightRef.current = inflight() + 1;
    generatingIds().add(product.id);
    const id = `${product.id}-${Date.now()}`;
    const next: StyleJob = {
      id,
      product,
      status: 'generating',
      selfieKey: photo.preview,
    };
    setJobs((list) => [next, ...list.filter((job) => job.product.id !== product.id)]);

    void requestStyleOnMe({
      productImageUrl: catalogImageUrl(product.image),
      userImageBase64: photo.imageBase64,
      userMimeType: photo.mimeType,
      productName: product.name,
    })
      .then((result) => {
        const generatedImage = asGeneratedSrc(result.imageBase64, result.mimeType);
        setJobs((list) =>
          list.map((job) =>
            job.id === id ? { ...job, status: 'done', generatedImage } : job,
          ),
        );
        const audio = audioRef.current ?? new Audio(generatedSound);
        audioRef.current = audio;
        audio.currentTime = 0;
        void audio.play().catch(() => undefined);
      })
      .catch((error) => {
        setJobs((list) =>
          list.map((job) => (job.id === id ? { ...job, status: 'error' } : job)),
        );
        setToast(error instanceof Error ? error.message : 'Style it on me failed');
      })
      .finally(() => {
        inflightRef.current = Math.max(0, inflight() - 1);
        generatingIds().delete(product.id);
      });
  }

  function requestStyle(product: Product) {
    if (inflight() >= MAX_STYLE_JOBS) {
      setToast(STYLE_CAP_TOAST);
      return;
    }
    if (generatingIds().has(product.id)) return;
    if (!selfie) {
      setUploaderFor(product);
      return;
    }
    startJob(product, selfie);
  }

  function onUploaderPick(photo: SelfiePayload) {
    const product = uploaderFor;
    setSelfie(photo);
    setUploaderFor(null);
    if (product) startJob(product, photo);
  }

  function styleStateFor(productId: string): StyleJob['status'] | 'idle' {
    return jobs.find((item) => item.product.id === productId)?.status ?? 'idle';
  }

  function styledImageFor(productId: string) {
    return jobs.find((item) => item.product.id === productId)?.generatedImage;
  }

  function canStyle(productId: string) {
    const job = jobs.find((item) => item.product.id === productId);
    if (!job || job.status === 'error') return true;
    if (job.status === 'generating') return false;
    if (job.status === 'done' && job.generatedImage) {
      if (!selfie?.preview) return true;
      return job.selfieKey !== selfie.preview;
    }
    return true;
  }

  function openUploader(product: Product) {
    setUploaderFor(product);
  }

  function openJob(job: StyleJob) {
    onOpenPreview({
      product: job.product,
      image: job.generatedImage,
    });
  }

  return {
    jobs,
    dockOpen,
    setDockOpen,
    uploaderFor,
    selfie,
    toast,
    requestStyle,
    onUploaderPick,
    openUploader,
    closeUploader: () => setUploaderFor(null),
    dismissToast: () => setToast(null),
    styleStateFor,
    styledImageFor,
    canStyle,
    openJob,
  };
}
