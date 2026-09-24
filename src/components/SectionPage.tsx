import type { Answer, Answers, Section } from '../model';
import QuestionField from './QuestionField';

interface Props {
  section: Section;
  displayNumber: number;
  total: number;
  answers: Answers;
  errors: Set<string>;
  onChange: (id: string, patch: Partial<Answer>) => void;
  onBack: () => void;
  onNext: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export default function SectionPage({
  section, displayNumber, total, answers, errors, onChange, onBack, onNext, isFirst, isLast,
}: Props) {
  let lastGroup: string | undefined;
  return (
    <div className="section-page">
      <header className="section-head">
        <p className="section-kicker">
          Шаг {displayNumber} из {total}
        </p>
        <h1>
          <span className="section-icon">{section.icon}</span> {section.title}
        </h1>
        {section.intro && <p className="section-intro">{section.intro}</p>}
      </header>

      {section.questions.map((q) => {
        const showGroup = q.group && q.group !== lastGroup;
        lastGroup = q.group;
        return (
          <div key={q.id}>
            {showGroup && <h2 className="group-title">{q.group}</h2>}
            <QuestionField q={q} answer={answers[q.id]} onChange={onChange} error={errors.has(q.id)} />
          </div>
        );
      })}

      <div className="nav-buttons no-print">
        <button type="button" className="btn btn-ghost" onClick={onBack} disabled={isFirst}>
          ← Назад
        </button>
        <button type="button" className="btn btn-primary" onClick={onNext}>
          {isLast ? 'Завершить бриф ✓' : 'Далее →'}
        </button>
      </div>
    </div>
  );
}
