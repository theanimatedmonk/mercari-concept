import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { useState } from 'react';
import pageShade from './assets/bg-shade.png';
import InspirationInput from './stages/InspirationInput/InspirationInput';
import NotFashion from './stages/NotFashion/NotFashion';
import SemanticStudio from './stages/SemanticStudio/SemanticStudio';
import type { AnalyzeResponse } from './lib/llm/types';
import type { JourneyStage } from './types';
import './AppShell.css';

export default function App() {
  const [stage, setStage] = useState<JourneyStage>('inspiration');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [hideShade, setHideShade] = useState(false);

  function goHome() {
    setHideShade(false);
    setImageSrc(null);
    setAnalysis(null);
    setStage('inspiration');
  }

  return (
    <LayoutGroup>
    <div className="app-shell">
      <img
        className={`app-shell__shade${hideShade || stage === 'sculpt' ? ' is-hidden' : ''}`}
        src={pageShade}
        alt=""
      />
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
                setHideShade(false);
                setImageSrc(null);
                setAnalysis(null);
                setStage('not-fashion');
              }}
              onContinue={(payload) => {
                setImageSrc(payload.imageSrc);
                setAnalysis(payload.analysis);
                setStage('sculpt');
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
              onStartOver={goHome}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
    </LayoutGroup>
  );
}
