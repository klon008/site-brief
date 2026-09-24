import { useMemo, useState } from 'react';
import type { Answers } from '../model';
import type { Stats } from '../lib/logic';
import { STATUS_META, statusOf, visibleQuestions, visibleSections } from '../lib/logic';
import { buildClientBrief, buildJson, buildSpec, copyText, downloadFile, projectSlug } from '../lib/exporters';
import { briefFileName, buildEncryptedBrief } from '../lib/crypto';

interface Props {
  answers: Answers;
  stats: Stats;
  adminMode: boolean;
  exportedAt?: string;
  onBack: () => void;
  onExit: () => void;
  onReset: () => void;
}

export default function Results({ answers, stats, adminMode, exportedAt, onBack, onExit, onReset }: Props) {
  return adminMode ? (
    <AdminResults answers={answers} stats={stats} exportedAt={exportedAt} onExit={onExit} />
  ) : (
    <ClientResults answers={answers} stats={stats} onBack={onBack} onReset={onReset} />
  );
}

/* ───────────────────────── Клиент: скачать один файл и отправить ───────────────────────── */

function ClientResults({ answers, stats, onBack, onReset }: { answers: Answers; stats: Stats; onBack: () => void; onReset: () => void }) {
  const [busy, setBusy] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = async () => {
    setBusy(true);
    try {
      const content = await buildEncryptedBrief(answers);
      downloadFile(briefFileName(), content, 'application/octet-stream');
      setDownloaded(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="results">
      <header className="results-head no-print">
        <h1>Бриф заполнен 🎉</h1>
        <p className="muted">Остался один шаг — отправить мне файл с вашими ответами.</p>

        <div className="stats-row">
          <div className="stat"><span className="stat-num">{stats.done}</span><span className="stat-label">🟢 Решено</span></div>
          <div className="stat"><span className="stat-num">{stats.unsure}</span><span className="stat-label">🟡 Не уверен</span></div>
          <div className="stat"><span className="stat-num">{stats.open}</span><span className="stat-label">🔴 Открыто</span></div>
        </div>

        <div className="instructions-box">
          <strong>Что делать дальше:</strong>
          <ol>
            <li>Нажмите кнопку ниже — скачается файл с вашими ответами.</li>
            <li>Отправьте этот файл мне любым удобным способом: Telegram или email.</li>
          </ol>
          <p className="instructions-note">🔒 Файл зашифрован — прочитать его смогу только я. Название и ответы не видны нигде в самом файле.</p>
        </div>

        <div className="client-actions">
          <button type="button" className="btn btn-primary btn-lg" onClick={handleDownload} disabled={busy}>
            {busy ? 'Готовим файл…' : downloaded ? '⬇ Скачать файл ещё раз' : '⬇ Скачать файл с ответами'}
          </button>
          {downloaded && <p className="muted small">Файл скачан. Не забудьте его отправить 🙂</p>}
        </div>

        <div className="results-footer no-print">
          <button type="button" className="btn btn-ghost" onClick={onBack}>
            ← Вернуться к ответам
          </button>
          <button type="button" className="btn btn-danger-ghost" onClick={onReset}>
            🗑 Удалить мои данные из этого браузера
          </button>
        </div>
      </header>

      <p className="preview-caption no-print">Ниже — как выглядит ваш бриф (эта часть не отправляется, только файл):</p>
      <BriefDoc answers={answers} />
    </div>
  );
}

/* ───────────────────────── Админ: просмотр загруженного файла ───────────────────────── */

function AdminResults({
  answers,
  stats,
  exportedAt,
  onExit,
}: {
  answers: Answers;
  stats: Stats;
  exportedAt?: string;
  onExit: () => void;
}) {
  const [tab, setTab] = useState<'brief' | 'spec'>('brief');
  const [copied, setCopied] = useState(false);

  const briefMd = useMemo(() => buildClientBrief(answers), [answers]);
  const specMd = useMemo(() => buildSpec(answers, stats), [answers, stats]);
  const slug = useMemo(() => projectSlug(answers), [answers]);
  const activeMd = tab === 'brief' ? briefMd : specMd;

  const handleCopy = async () => {
    setCopied(await copyText(activeMd));
    setTimeout(() => setCopied(false), 2000);
  };

  const projectName = typeof answers['q6']?.value === 'string' ? (answers['q6'].value as string) : '';

  return (
    <div className="results">
      <header className="results-head no-print">
        <p className="section-kicker">Просмотр брифа</p>
        <h1>{projectName || 'Загруженный бриф'}</h1>
        <p className="muted">
          {exportedAt ? `Клиент заполнил: ${new Date(exportedAt).toLocaleString('ru-RU')} · ` : ''}
          {stats.total} вопросов, открытых: {stats.open}
        </p>

        <div className="stats-row">
          <div className="stat"><span className="stat-num">{stats.done}</span><span className="stat-label">🟢 Решено</span></div>
          <div className="stat"><span className="stat-num">{stats.unsure}</span><span className="stat-label">🟡 Не уверен</span></div>
          <div className="stat"><span className="stat-num">{stats.open}</span><span className="stat-label">🔴 Открыто</span></div>
          <div className="stat"><span className="stat-num">{stats.na}</span><span className="stat-label">⚪ Не относится</span></div>
        </div>

        <div className="tabs">
          <button type="button" className={`tab ${tab === 'brief' ? 'active' : ''}`} onClick={() => setTab('brief')}>
            📄 Client Brief <small>бриф клиента</small>
          </button>
          <button type="button" className={`tab ${tab === 'spec' ? 'active' : ''}`} onClick={() => setTab('spec')}>
            🛠 Internal Spec <small>внутренняя спека</small>
          </button>
        </div>

        <div className="results-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => (tab === 'brief' ? downloadFile(`brief-${slug}.md`, briefMd) : downloadFile(`spec-${slug}.md`, specMd))}
          >
            ⬇ Скачать {tab === 'brief' ? 'бриф' : 'спеку'} (.md)
          </button>
          <button type="button" className="btn btn-outline" onClick={handleCopy}>
            {copied ? '✓ Скопировано' : '📋 Копировать'}
          </button>
          <button type="button" className="btn btn-outline" onClick={() => window.print()}>
            🖨 Печать / PDF
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => downloadFile(`brief-${slug}.json`, buildJson(answers), 'application/json')}
          >
            💾 JSON
          </button>
          <button type="button" className="btn btn-ghost" onClick={onExit}>
            ← Загрузить другой бриф
          </button>
        </div>
      </header>

      {tab === 'brief' ? <BriefDoc answers={answers} /> : <SpecDoc answers={answers} stats={stats} />}
    </div>
  );
}

/* ───────────────────────── Превью документов ───────────────────────── */

function BriefDoc({ answers }: { answers: Answers }) {
  return (
    <article className="doc printable">
      <h1>Бриф на разработку сайта</h1>
      <p className="doc-meta">Дата заполнения: {new Date().toLocaleDateString('ru-RU')}</p>
      {visibleSections(answers).map((section, i) => (
        <section key={section.id}>
          <h2>{i + 1}. {section.title}</h2>
          {visibleQuestions(section, answers).map((q) => {
            const st = statusOf(q, answers);
            const meta = STATUS_META[st as Exclude<typeof st, 'hidden'>];
            const text = q.type === 'files'
              ? (answers[q.id]?.fileNames ?? []).join(', ')
              : typeof answers[q.id]?.value === 'string'
                ? (answers[q.id]!.value as string)
                : Array.isArray(answers[q.id]?.value)
                  ? (answers[q.id]!.value as string[]).join(', ')
                  : '';
            const other = answers[q.id]?.otherText;
            const body = text
              ? text + (other ? ` (Другое: ${other})` : '')
              : st === 'na'
                ? '— не относится к проекту'
                : st === 'open'
                  ? '— ответа нет, обсудить'
                  : '— не заполнено';
            return (
              <div className="doc-qa" key={q.id}>
                <p className="doc-q">
                  {q.group && <span className="doc-group">{q.group} · </span>}
                  <strong>{q.num}. {q.label}</strong>
                </p>
                <p className={`doc-a ${text ? '' : 'doc-a-empty'}`}>{body}</p>
                {!text && <p className="doc-status">{meta.icon} {meta.label}</p>}
              </div>
            );
          })}
        </section>
      ))}
      <section>
        <h2>Что дальше</h2>
        <p>
          Я изучу ответы и на их основании подготовлю: предварительную структуру проекта, список необходимого
          функционала, список открытых вопросов, предварительную оценку стоимости и сроки.
        </p>
        <p>Если какие-то решения пока не определены — это нормально. Мы отдельно обсудим их перед началом работы.</p>
      </section>
    </article>
  );
}

function SpecDoc({ answers, stats }: { answers: Answers; stats: Stats }) {
  return (
    <article className="doc printable">
      <h1>Internal Project Spec</h1>
      <p className="doc-meta">
        Сформирован автоматически из брифа · {new Date().toLocaleDateString('ru-RU')}
      </p>
      <p className="doc-meta">
        🟢 Решено: {stats.done} · 🟡 Не уверен: {stats.unsure} · 🔴 Открыто: {stats.open} · ⚪ Не относится: {stats.na}
      </p>
      <table className="spec-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Область</th>
            <th>Ответ клиента</th>
            <th>Статус</th>
            <th>Нужно сделать</th>
          </tr>
        </thead>
        <tbody>
          {visibleSections(answers).map((section, i) => {
            const rows: React.ReactNode[] = [];
            let lastGroup: string | null = null;
            for (const q of visibleQuestions(section, answers)) {
              if ((q.group ?? null) !== lastGroup) {
                rows.push(
                  <tr className="spec-section-row" key={`sec-${section.id}-${q.group ?? 'base'}`}>
                    <td colSpan={5}>{i + 1}. {section.title}{q.group ? ` — ${q.group}` : ''}</td>
                  </tr>,
                );
                lastGroup = q.group ?? null;
              }
              const st = statusOf(q, answers);
              const meta = STATUS_META[st as Exclude<typeof st, 'hidden'>];
              const text = q.type === 'files'
                ? (answers[q.id]?.fileNames ?? []).join(', ')
                : typeof answers[q.id]?.value === 'string'
                  ? (answers[q.id]!.value as string)
                  : Array.isArray(answers[q.id]?.value)
                    ? (answers[q.id]!.value as string[]).join(', ')
                    : '';
              const other = answers[q.id]?.otherText;
              const full = text ? text + (other ? ` (Другое: ${other})` : '') : '—';
              const need = st === 'done' || st === 'na' ? '—' : q.action ?? 'Обсудить';
              rows.push(
                <tr key={q.id} className={`st-${st}`}>
                  <td>{q.num}</td>
                  <td>{q.area}</td>
                  <td>{full}</td>
                  <td className="spec-status">{meta.icon} {meta.label}</td>
                  <td>{need}</td>
                </tr>,
              );
            }
            return rows;
          })}
        </tbody>
      </table>
      <h2>Открытые вопросы к обсуждению</h2>
      <OpenList answers={answers} />
    </article>
  );
}

function OpenList({ answers }: { answers: Answers }) {
  const items: { label: string; action: string }[] = [];
  for (const section of visibleSections(answers)) {
    for (const q of visibleQuestions(section, answers)) {
      const st = statusOf(q, answers);
      if (st === 'open' || st === 'unsure') items.push({ label: `${q.num}. ${q.label}`, action: q.action ?? 'Обсудить' });
    }
  }
  if (items.length === 0) return <p>Открытых вопросов нет — все ключевые решения приняты. 🎉</p>;
  return (
    <ol className="open-list">
      {items.map((it) => (
        <li key={it.label}>
          {it.label} <span className="muted">— {it.action}</span>
        </li>
      ))}
    </ol>
  );
}
