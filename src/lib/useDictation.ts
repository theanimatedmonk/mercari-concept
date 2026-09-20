import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechRec = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: {
    results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
  }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecCtor = new () => SpeechRec;

function speechCtor(): SpeechRecCtor | undefined {
  const w = window as Window & {
    SpeechRecognition?: SpeechRecCtor;
    webkitSpeechRecognition?: SpeechRecCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

function glue(base: string, spoken: string) {
  const bit = spoken.replace(/\s+/g, ' ').trim();
  if (!bit) return base;
  if (!base) return bit.charAt(0).toUpperCase() + bit.slice(1);
  if (/\s$/.test(base)) return `${base}${bit}`;
  return `${base} ${bit}`;
}

export default function useDictation(
  text: string,
  onText: (next: string) => void,
) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRec | null>(null);
  const wantRef = useRef(false);
  const baseRef = useRef('');
  const textRef = useRef(text);
  textRef.current = text;

  const stop = useCallback(() => {
    wantRef.current = false;
    const rec = recRef.current;
    recRef.current = null;
    try {
      rec?.stop();
    } catch {
      /* already stopped */
    }
    setListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (wantRef.current) {
      stop();
      return;
    }

    const Ctor = speechCtor();
    if (!Ctor) {
      setError('Dictation isn’t available in this browser.');
      return;
    }

    setError(null);
    baseRef.current = textRef.current.trimEnd();
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = navigator.language || 'en-US';
    rec.onresult = (event) => {
      let committed = '';
      let interim = '';
      for (let i = 0; i < event.results.length; i += 1) {
        const piece = event.results[i][0].transcript;
        if (event.results[i].isFinal) committed += piece;
        else interim += piece;
      }
      onText(glue(baseRef.current, `${committed} ${interim}`));
    };
    rec.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      wantRef.current = false;
      recRef.current = null;
      setListening(false);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Allow the microphone to dictate.');
        return;
      }
      if (event.error === 'audio-capture') {
        setError('No microphone found.');
        return;
      }
      setError('Could not hear that. Try again.');
    };
    rec.onend = () => {
      if (wantRef.current) {
        try {
          rec.start();
        } catch {
          /* already running */
        }
        return;
      }
      recRef.current = null;
      setListening(false);
    };

    recRef.current = rec;
    wantRef.current = true;
    try {
      rec.start();
      setListening(true);
    } catch {
      wantRef.current = false;
      recRef.current = null;
      setError('Could not start the mic. Try again.');
    }
  }, [onText, stop]);

  useEffect(() => () => stop(), [stop]);

  return { listening, error, toggle, stop };
}
