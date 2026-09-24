import { useEffect, useMemo, useState } from 'react';
import type { Answer, Answers } from './model';
import { SECTIONS } from './data/questions';
import { hasValue, statsOf, visibleQuestions, visibleSections } from './lib/logic';
import type { BriefFilePayload } from './lib/crypto';
import Welcome from './components/Welcome';
import Stepper from './components/Stepper';
import SectionPage from './components/SectionPage';
import Results from './components/Results';
import AdminUpload from './components/AdminUpload';

const STORAGE_KEY = 'site-brief-draft-v1';
const ADMIN_HASH = '#/admin';

interface Draft {
  answers: Answers;
  stepId: string;
  updatedAt: string;
}

type View = 'welcome' | 'form' | 'results' | 'admin';

function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Draft;
    if (parsed && typeof parsed === 'object' && parsed.answers) return parsed;
    return null;
  } catch {
    return null;
  }
}

export default function App() {
  const [draft] = useState<Draft | null>(() => loadDraft());
  const [view, setView] = useState<View>(() => (window.location.hash === ADMIN_HASH ? 'admin' : 'welcome'));
  const [adminMode, setAdminMode] = useState(false);
  const [exportedAt, setExportedAt] = useState<string | undefined>(undefined);
  const [answers, setAnswers] = useState<Answers>(() => draft?.answers ?? {});
  const [stepId, setStepId] = useState<string>(() => draft?.stepId ?? SECTIONS[0].id);
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [savedAt, setSavedAt] = useState<string | null>(draft?.updatedAt ?? null);

  const visible = useMemo(() => visibleSections(answers), [answers]);
  const stats = useMemo(() => statsOf(answers), [answers]);

  // Реакция на ручной переход по #/admin
  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === ADMIN_HASH) setView('admin');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Если условная логика скрыла текущий шаг — переходим на ближайший видимый
  const current = useMemo(() => {
    const idx = visible.findIndex((s) => s.id === stepId);
    if (idx >= 0) return visible[idx];
    const origIdx = SECTIONS.findIndex((s) => s.id === stepId);
    const after = visible.find((s) => SECTIONS.findIndex((x) => x.id === s.id) >= origIdx);
    return after ?? visible[visible.length - 1] ?? SECTIONS[0];
  }, [visible, stepId]);

  // Автосохранение — только своё заполнение, не чужой загруженный бриф
  useEffect(() => {
    if (view === 'welcome' || view === 'admin' || adminMode) return;
    const payload: Draft = { answers, stepId: current.id, updatedAt: new Date().toISOString() };
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        setSavedAt(payload.updatedAt);
      } catch {
        /* хранилище недоступно — работаем без сохранения */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [answers, current.id, view, adminMode]);

  // При смене шага — наверх
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [current.id, view]);

  const answeredCount = useMemo(
    () =>
      visible.reduce(
        (acc, s) => acc + visibleQuestions(s, answers).filter((q) => hasValue(q, answers[q.id])).length,
        0,
      ),
    [visible, answers],
  );
  const totalCount = useMemo(
    () => visible.reduce((acc, s) => acc + visibleQuestions(s, answers).length, 0),
    [visible, answers],
  );

  const handleChange = (id: string, patch: Partial<Answer>) => {
    setAnswers((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    setErrors((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleNext = () => {
    const missing = visibleQuestions(current, answers).filter((q) => q.required && !hasValue(q, answers[q.id]));
    if (missing.length > 0) {
      setErrors(new Set(missing.map((q) => q.id)));
      document.getElementById(`q-${missing[0].id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const idx = visible.findIndex((s) => s.id === current.id);
    if (idx < visible.length - 1) setStepId(visible[idx + 1].id);
    else setView('results');
  };

  const handleBack = () => {
    const idx = visible.findIndex((s) => s.id === current.id);
    if (idx > 0) setStepId(visible[idx - 1].id);
  };

  const resetAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAnswers({});
    setStepId(SECTIONS[0].id);
    setErrors(new Set());
    setSavedAt(null);
    setView('welcome');
  };

  const handleBriefLoaded = (payload: BriefFilePayload) => {
    setAnswers(payload.answers);
    setExportedAt(payload.exportedAt);
    setAdminMode(true);
    setErrors(new Set());
    setView('results');
  };

  const exitAdmin = () => {
    // Убираем #/admin из адреса, не добавляя запись в историю
    history.replaceState(null, '', window.location.pathname + window.location.search);
    setAdminMode(false);
    setExportedAt(undefined);
    setAnswers({});
    setStepId(SECTIONS[0].id);
    setErrors(new Set());
    setView('welcome');
  };

  if (view === 'admin') {
    return <AdminUpload onLoaded={handleBriefLoaded} onExit={exitAdmin} />;
  }

  if (view === 'welcome') {
    return (
      <Welcome
        hasDraft={!!draft}
        draftInfo={draft ? { answered: answeredCount, total: totalCount, updatedAt: draft.updatedAt } : undefined}
        onStart={() => {
          if (draft && !window.confirm('Начать заново? Текущий черновик будет удалён.')) return;
          if (draft) resetAll();
          setView('form');
        }}
        onContinue={() => setView('form')}
      />
    );
  }

  if (view === 'results') {
    return (
      <Results
        answers={answers}
        stats={stats}
        adminMode={adminMode}
        exportedAt={exportedAt}
        onBack={() => setView('form')}
        onExit={exitAdmin}
        onReset={() => {
          if (window.confirm('Удалить черновик и начать заново?')) resetAll();
        }}
      />
    );
  }

  const displayNumber = visible.findIndex((s) => s.id === current.id) + 1;
  const progress = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  return (
    <div className="app">
      <header className="app-header no-print">
        <div className="app-header-inner">
          <span className="brand">📝 Бриф на разработку сайта</span>
          <span className="header-right muted small">
            {savedAt && <span title="Черновик сохраняется автоматически">💾 сохранено</span>}
            <span>{answeredCount}/{totalCount} · {progress}%</span>
          </span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <Stepper sections={visible} answers={answers} currentId={current.id} onJump={(id) => {
        setErrors(new Set());
        setStepId(id);
      }} />

      <main className="container">
        <SectionPage
          section={current}
          displayNumber={displayNumber}
          total={visible.length}
          answers={answers}
          errors={errors}
          onChange={handleChange}
          onBack={handleBack}
          onNext={handleNext}
          isFirst={displayNumber === 1}
          isLast={displayNumber === visible.length}
        />
      </main>
    </div>
  );
}
