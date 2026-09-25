import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import SandBackdrop from './components/SandBackdrop';
import PermissionDialogHost from './components/PermissionDialog';
import InspirationInput from './stages/InspirationInput/InspirationInput';
import NotFashion from './stages/NotFashion/NotFashion';
import SemanticStudio from './stages/SemanticStudio/SemanticStudio';
import type { AnalyzeResponse } from './lib/llm/types';
import { subscribeShareTarget, type IncomingShare } from './lib/native/shareTarget';
import {
  clearSession,
  flushSession,
  hydrateSession,
  startSession,
} from './lib/session';
import type { JourneyStage } from './types';
import './AppShell.css';

export default function App() {
  const [booted, setBooted] = useState(false);
  const [resume, setResume] = useState(false);
  const [stage, setStage] = useState<JourneyStage>('inspiration');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [context, setContext] = useState('');
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [hideShade, setHideShade] = useState(false);
  const [incomingShare, setIncomingShare] = useState<IncomingShare | null>(null);

  useEffect(() => {
    let cancelled = false;
    const failSafe = window.setTimeout(() => {
      if (!cancelled) setBooted(true);
    }, 400);
    void hydrateSession()
      .then((session) => {
        if (cancelled) return;
        if (session?.analysis) {
          setImageSrc(session.imageSrc);
          setContext(session.context ?? '');
          setAnalysis(session.analysis);
          setStage('sculpt');
          setResume(true);
        }
      })
      .finally(() => {
        window.clearTimeout(failSafe);
        if (!cancelled) setBooted(true);
      });
    function onHide() {
      void flushSession();
    }
    window.addEventListener('pagehide', onHide);
    return () => {
      cancelled = true;
      window.clearTimeout(failSafe);
      window.removeEventListener('pagehide', onHide);
    };
  }, []);

  useEffect(() => {
    return subscribeShareTarget((share) => {
      void clearSession();
      setResume(false);
      setHideShade(false);
      setImageSrc(null);
      setContext('');
      setAnalysis(null);
      setStage('inspiration');
      setIncomingShare(share);
    });
  }, []);

  function goHome() {
    void clearSession();
    setResume(false);
    setHideShade(false);
    setImageSrc(null);
    setContext('');
    setAnalysis(null);
    setStage('inspiration');
  }

  if (!booted) {
    return <div className="app-shell" />;
  }

  return (
    <LayoutGroup>
    <div className="app-shell">
      <PermissionDialogHost />
      {stage === 'inspiration' ? <SandBackdrop hidden={hideShade} /> : null}
      <AnimatePresence mode="wait">
        {stage === 'inspiration' ? (
          <motion.div
            key="inspiration"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
          >
            <InspirationInput
              incomingShare={incomingShare}
              onIncomingConsumed={() => setIncomingShare(null)}
              onReadingChange={setHideShade}
              onNotFashion={() => {
                void clearSession();
                setResume(false);
                setHideShade(false);
                setImageSrc(null);
                setContext('');
                setAnalysis(null);
                setStage('not-fashion');
              }}
              onContinue={(payload) => {
                void startSession({
                  imageSrc: payload.imageSrc,
                  context: payload.context,
                  analysis: payload.analysis,
                }).then((session) => {
                  setResume(false);
                  setImageSrc(session.imageSrc);
                  setContext(session.context);
                  setAnalysis(session.analysis);
                  setStage('sculpt');
                });
              }}
            />
          </motion.div>
        ) : null}
        {stage === 'not-fashion' ? (
          <motion.div
            key="not-fashion"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
          >
            <NotFashion onTryAgain={goHome} />
          </motion.div>
        ) : null}
        {stage === 'sculpt' && analysis ? (
          <motion.div
            key="sculpt"
            className="app-shell__stage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.32 }}
          >
            <SemanticStudio
              imageSrc={imageSrc}
              context={context}
              analysis={analysis}
              resume={resume}
              onStartOver={goHome}
              onCommitted={(payload) => {
                setImageSrc(payload.imageSrc);
                setContext(payload.context);
                setAnalysis(payload.analysis);
              }}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
    </LayoutGroup>
  );
}
