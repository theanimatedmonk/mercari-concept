import { useCallback, useEffect, useRef, useState } from 'react';
import { ensurePermission } from './native/permissions';

type SpeechRec = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: {
    resultIndex: number;
    results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
  }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecCtor = new () => SpeechRec;

const RESTART_MS = 350;

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
  const stem = base.replace(/\s+/g, ' ').trimEnd();
  if (!stem) return bit.charAt(0).toUpperCase() + bit.slice(1);

  const words = bit.split(' ');
  const stemLower = stem.toLowerCase();
  for (let n = words.length; n > 0; n -= 1) {
    const head = words.slice(0, n).join(' ');
    if (stemLower.endsWith(head.toLowerCase())) {
      const rest = words.slice(n).join(' ');
      return rest ? `${stem} ${rest}` : stem;
    }
  }
  return `${stem} ${bit}`;
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
  const finalsRef = useRef('');
  const restartRef = useRef<number | null>(null);
  const textRef = useRef(text);
  textRef.current = text;

  const clearRestart = useCallback(() => {
    if (restartRef.current == null) return;
    window.clearTimeout(restartRef.current);
    restartRef.current = null;
  }, []);

  const stop = useCallback(() => {
    wantRef.current = false;
    clearRestart();
    const rec = recRef.current;
    recRef.current = null;
    try {
      rec?.stop();
    } catch {
      /* already stopped */
    }
    setListening(false);
  }, [clearRestart]);

  const toggle = useCallback(async () => {
    if (wantRef.current) {
      stop();
      return;
    }

    if (!(await ensurePermission('microphone'))) return;

    const Engine = speechCtor();
    if (!Engine) {
      setError('Dictation isn’t available in this browser.');
      return;
    }

    function listen(rec: SpeechRec, Recognition: SpeechRecCtor) {
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = navigator.language || 'en-US';
      rec.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const piece = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalsRef.current = glue(finalsRef.current, piece);
          else interim = piece;
        }
        onText(glue(baseRef.current, glue(finalsRef.current, interim)));
      };
      rec.onerror = (event) => {
        if (event.error === 'no-speech' || event.error === 'aborted') return;
        wantRef.current = false;
        clearRestart();
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
        if (!wantRef.current) {
          recRef.current = null;
          setListening(false);
          return;
        }
        baseRef.current = textRef.current.trimEnd();
        finalsRef.current = '';
        clearRestart();
        restartRef.current = window.setTimeout(() => {
          restartRef.current = null;
          if (!wantRef.current) return;
          const next = new Recognition();
          listen(next, Recognition);
          recRef.current = next;
          try {
            next.start();
          } catch {
            wantRef.current = false;
            recRef.current = null;
            setListening(false);
          }
        }, RESTART_MS);
      };
    }

    setError(null);
    baseRef.current = textRef.current.trimEnd();
    finalsRef.current = '';
    const rec = new Engine();
    listen(rec, Engine);
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
  }, [clearRestart, onText, stop]);

  useEffect(() => () => stop(), [stop]);

  return { listening, error, toggle, stop };
}
