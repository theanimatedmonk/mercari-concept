import MicMark from '../../components/icons/MicMark';

type ButtonProps = {
  listening: boolean;
  className: string;
  onClick: () => void;
};

const FREQ_BARS = 5;

export function VoiceFreq() {
  return (
    <span className="inspiration__freq" aria-hidden>
      {Array.from({ length: FREQ_BARS }, (_, i) => (
        <span key={i} />
      ))}
    </span>
  );
}

export default function DictateButton({ listening, className, onClick }: ButtonProps) {
  return (
    <button
      type="button"
      className={`${className}${listening ? ' is-listening' : ''}`}
      aria-label={listening ? 'Stop dictation' : 'Dictate'}
      aria-pressed={listening}
      onClick={onClick}
    >
      {listening ? <span className="inspiration__stop" /> : <MicMark />}
    </button>
  );
}
