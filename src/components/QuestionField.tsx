import { useRef } from 'react';
import type { Answer, Confidence, Question } from '../model';
import { CONFIDENCE_META } from '../lib/logic';
import { DONT_KNOW, OTHER } from '../data/questions';

const EXCLUSIVE = [DONT_KNOW, 'Ничего'];
const OTHER_VARIANTS = [OTHER, 'Другой', 'Другим', 'Другая'];

interface Props {
  q: Question;
  answer: Answer | undefined;
  onChange: (id: string, patch: Partial<Answer>) => void;
  error?: boolean;
}

export default function QuestionField({ q, answer, onChange, error }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const na = answer?.confidence === 'na';
  const setConfidence = (c: Confidence) =>
    onChange(q.id, { confidence: answer?.confidence === c ? undefined : c });

  const setSingle = (opt: string) => {
    const patch: Partial<Answer> = { value: opt };
    if (opt === DONT_KNOW) patch.confidence = 'unknown';
    else if (answer?.confidence === 'unknown') patch.confidence = 'sure';
    if (opt !== OTHER) patch.otherText = undefined;
    onChange(q.id, patch);
  };

  const toggleMulti = (opt: string) => {
    const current = Array.isArray(answer?.value) ? answer!.value : [];
    const isExclusive = EXCLUSIVE.includes(opt);
    let next: string[];
    if (current.includes(opt)) {
      next = current.filter((v) => v !== opt);
    } else if (isExclusive) {
      next = [opt];
    } else {
      next = [...current.filter((v) => !EXCLUSIVE.includes(v)), opt];
      if (q.maxChoices && next.length > q.maxChoices) return;
    }
    const patch: Partial<Answer> = { value: next };
    if (next.includes(DONT_KNOW)) patch.confidence = 'unknown';
    else if (answer?.confidence === 'unknown') patch.confidence = 'sure';
    if (!next.some((v) => OTHER_VARIANTS.includes(v))) patch.otherText = undefined;
    onChange(q.id, patch);
  };

  const single = typeof answer?.value === 'string' ? answer.value : '';
  const multi = Array.isArray(answer?.value) ? answer.value : [];
  const hasOtherSelected = OTHER_VARIANTS.some((v) =>
    q.type === 'multi' ? multi.includes(v) : single === v,
  );
  const atMax = q.maxChoices !== undefined && multi.length >= q.maxChoices && !multi.some((v) => EXCLUSIVE.includes(v));

  return (
    <div className={`question ${error ? 'has-error' : ''} ${na ? 'is-na' : ''}`} id={`q-${q.id}`}>
      <div className="question-head">
        <label className="question-label" htmlFor={`input-${q.id}`}>
          <span className="question-num">{q.num}</span>
          <span className="question-text">
            {q.label}
            {q.required && <span className="req" title="Обязательный вопрос"> *</span>}
          </span>
        </label>
      </div>

      {q.hint && <p className="hint">{q.hint}</p>}

      <div className="question-body">
        {(q.type === 'text' || q.type === 'email' || q.type === 'url' || q.type === 'date') && (
          <input
            id={`input-${q.id}`}
            type={q.type === 'text' ? 'text' : q.type}
            className="input"
            value={single}
            placeholder={q.placeholder}
            disabled={na}
            onChange={(e) => onChange(q.id, { value: e.target.value })}
          />
        )}

        {q.type === 'textarea' && (
          <textarea
            id={`input-${q.id}`}
            className="input"
            rows={4}
            value={single}
            placeholder={q.placeholder}
            disabled={na}
            onChange={(e) => onChange(q.id, { value: e.target.value })}
          />
        )}

        {q.type === 'select' && (
          <div className="options" role="radiogroup" aria-label={q.label}>
            {q.options?.map((opt) => (
              <label key={opt} className={`option ${single === opt ? 'selected' : ''} ${opt === DONT_KNOW ? 'muted' : ''}`}>
                <input type="radio" name={q.id} checked={single === opt} disabled={na} onChange={() => setSingle(opt)} />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        )}

        {q.type === 'multi' && (
          <>
            <div className="options">
              {q.options?.map((opt) => {
                const isExcl = EXCLUSIVE.includes(opt);
                const disabled = na || (!multi.includes(opt) && atMax && !isExcl);
                return (
                  <label key={opt} className={`option ${multi.includes(opt) ? 'selected' : ''} ${isExcl ? 'muted' : ''}`}>
                    <input type="checkbox" checked={multi.includes(opt)} disabled={disabled} onChange={() => toggleMulti(opt)} />
                    <span>{opt}</span>
                  </label>
                );
              })}
            </div>
            {q.maxChoices && <p className="counter">Выбрано {multi.filter((v) => !EXCLUSIVE.includes(v)).length} из {q.maxChoices}</p>}
          </>
        )}

        {hasOtherSelected && !na && (
          <input
            type="text"
            className="input other-input"
            placeholder="Уточните…"
            value={answer?.otherText ?? ''}
            onChange={(e) => onChange(q.id, { otherText: e.target.value })}
          />
        )}

        {q.type === 'files' && (
          <div className="files">
            <button type="button" className="btn btn-outline" disabled={na} onClick={() => fileInputRef.current?.click()}>
              📎 Выбрать файлы
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                const names = Array.from(e.target.files ?? []).map((f) => f.name);
                const prev = answer?.fileNames ?? [];
                const merged = [...prev, ...names.filter((n) => !prev.includes(n))];
                onChange(q.id, { fileNames: merged });
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            />
            {(answer?.fileNames?.length ?? 0) > 0 && (
              <ul className="file-list">
                {answer!.fileNames!.map((name) => (
                  <li key={name}>
                    <span>📄 {name}</span>
                    <button
                      type="button"
                      aria-label={`Убрать ${name}`}
                      onClick={() => {
                        const next = answer!.fileNames!.filter((n) => n !== name);
                        onChange(q.id, { fileNames: next });
                      }}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="hint">В документ попадёт список имён файлов — сами файлы отправьте в переписке.</p>
          </div>
        )}
      </div>

      {error && <p className="error-text">Это обязательный вопрос — ответьте, чтобы продолжить.</p>}

      {!q.noStatus && (
        <div className="confidence" role="group" aria-label="Насколько вы уверены в ответе">
          {CONFIDENCE_META.map((c) => (
            <button
              key={c.value}
              type="button"
              title={c.title}
              className={`chip conf-${c.value} ${answer?.confidence === c.value ? 'active' : ''}`}
              onClick={() => setConfidence(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
