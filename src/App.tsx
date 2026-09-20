import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import SandBackdrop from './components/SandBackdrop';
import InspirationInput from './stages/InspirationInput/InspirationInput';
import NotFashion from './stages/NotFashion/NotFashion';
import SemanticStudio from './stages/SemanticStudio/SemanticStudio';
import type { AnalyzeResponse } from './lib/llm/types';
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
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [hideShade, setHideShade] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void hydrateSession().then((session) => {
      if (cancelled) return;
      if (session?.analysis) {
        setImageSrc(session.imageSrc);
        setAnalysis(session.analysis);
        setStage('sculpt');
        setResume(true);
      }
      setBooted(true);
    });
    function onHide() {
      void flushSession();
    }
    window.addEventListener('pagehide', onHide);
    return () => {
      cancelled = true;
      window.removeEventListener('pagehide', onHide);
    };
  }, []);

  function goHome() {
    void clearSession();
    setResume(false);
    setHideShade(false);
    setImageSrc(null);
    setAnalysis(null);
    setStage('inspiration');
  }

  if (!booted) {
    return <div className="app-shell" />;
  }

  return (
    <LayoutGroup>
    <div className="app-shell">
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
              onReadingChange={setHideShade}
              onNotFashion={() => {
                void clearSession();
                setResume(false);
                setHideShade(false);
                setImageSrc(null);
                setAnalysis(null);
                setStage('not-fashion');
              }}
              onContinue={(payload) => {
                void startSession({
                  imageSrc: payload.imageSrc,
                  analysis: payload.analysis,
                }).then((session) => {
                  setResume(false);
                  setImageSrc(session.imageSrc);
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
              analysis={analysis}
              resume={resume}
              onStartOver={goHome}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
    </LayoutGroup>
  );
}
