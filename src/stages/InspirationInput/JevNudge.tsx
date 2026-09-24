import { Check } from 'lucide-react';
import { hasNudgeOption } from '../../lib/llm/intentQuery';

type Props = {
  intentKey: string;
  question: string;
  options: string[];
  query: string;
  onToggle: (option: string) => void;
};

export default function JevNudge({
  intentKey,
  question,
  options,
  query,
  onToggle,
}: Props) {
  if (!question || options.length < 3) return null;
  return (
    <div className="inspiration__nudge" role="group" aria-label={question}>
      <p className="inspiration__nudge-q">{question}</p>
      <div className="inspiration__nudge-list">
        {options.map((option) => {
          const on = hasNudgeOption(query, intentKey, option);
          return (
            <button
              key={option}
              type="button"
              className={`inspiration__nudge-opt${on ? ' is-on' : ''}`}
              aria-pressed={on}
              onClick={() => onToggle(option)}
            >
              <span className="inspiration__nudge-mark" aria-hidden>
                {on ? <Check size={14} strokeWidth={2.6} /> : null}
              </span>
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
