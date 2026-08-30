import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { useState } from 'react';
import pageShade from './assets/bg-shade.png';
import { DEMO_INSPIRATION } from './data/demo';
import InspirationInput from './stages/InspirationInput/InspirationInput';
import SelectFocus from './stages/SelectFocus/SelectFocus';
import SemanticStudio from './stages/SemanticStudio/SemanticStudio';
import type { JourneyStage } from './types';
import './AppShell.css';

export default function App() {
  const [stage, setStage] = useState<JourneyStage>('inspiration');
  const [imageSrc, setImageSrc] = useState(DEMO_INSPIRATION);

  return (
    <LayoutGroup>
    <div className="app-shell">
      <img className="app-shell__shade" src={pageShade} alt="" />
      <AnimatePresence mode="wait">
        {stage === 'inspiration' ? (
          <motion.div
            key="inspiration"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
          >
            <InspirationInput
              onContinue={(src) => {
                setImageSrc(src);
                setStage('focus');
              }}
            />
          </motion.div>
        ) : null}
        {stage === 'focus' ? (
          <motion.div
            key="focus"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <SelectFocus
              imageSrc={imageSrc}
              onSelectDress={() => setStage('sculpt')}
            />
          </motion.div>
        ) : null}
        {stage === 'sculpt' ? (
          <motion.div
            key="sculpt"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <SemanticStudio imageSrc={imageSrc} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
    </LayoutGroup>
  );
}
