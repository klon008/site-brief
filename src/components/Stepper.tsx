import type { Section } from '../model';
import { sectionComplete } from '../lib/logic';
import type { Answers } from '../model';

interface Props {
  sections: Section[];
  answers: Answers;
  currentId: string;
  onJump: (id: string) => void;
}

export default function Stepper({ sections, answers, currentId, onJump }: Props) {
  return (
    <nav className="stepper no-print" aria-label="Шаги брифа">
      <div className="stepper-track">
        {sections.map((s, i) => {
          const complete = sectionComplete(s, answers);
          return (
            <button
              key={s.id}
              type="button"
              className={`step ${s.id === currentId ? 'current' : ''} ${complete ? 'complete' : ''}`}
              onClick={() => onJump(s.id)}
            >
              <span className="step-num">{complete && s.id !== currentId ? '✓' : i + 1}</span>
              <span className="step-title">{s.title}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
