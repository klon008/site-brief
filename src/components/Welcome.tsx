interface Props {
  hasDraft: boolean;
  draftInfo?: { answered: number; total: number; updatedAt?: string };
  onStart: () => void;
  onContinue: () => void;
}

export default function Welcome({ hasDraft, draftInfo, onStart, onContinue }: Props) {
  return (
    <div className="welcome">
      <div className="welcome-card">
        <p className="welcome-hello">Привет! 👋</p>
        <h1>Бриф на разработку сайта</h1>
        <p className="welcome-text">
          Перед началом работы мне важно понять ваш бизнес, задачи и ожидания от будущего сайта.
          Бриф разбит на <strong>10 коротких шагов</strong> — вопросы открываются по мере необходимости,
          и вы не увидите ничего лишнего.
        </p>
        <p className="welcome-text">
          Не переживайте, если вы не знаете ответа на какой-то вопрос. <strong>Не нужно придумывать ответ.</strong>
          У каждого вопроса есть отметка:
        </p>
        <ul className="legend">
          <li><span className="chip conf-sure">✓ Знаю</span> — есть конкретный ответ;</li>
          <li><span className="chip conf-unsure">≈ Не уверен</span> — есть предположение, но нужна помощь;</li>
          <li><span className="chip conf-unknown">? Не знаю</span> — хочу, чтобы решение предложил специалист;</li>
          <li><span className="chip conf-na">✕ Не относится</span> — вопрос не имеет отношения к проекту.</li>
        </ul>
        <p className="welcome-text">
          Чем подробнее вы ответите на понятные вопросы, тем точнее я смогу оценить проект, сроки и стоимость.
          <br />
          <span className="muted">Черновик сохраняется автоматически — можно вернуться в любой момент.</span>
        </p>

        <div className="welcome-actions">
          {hasDraft ? (
            <>
              <button type="button" className="btn btn-primary btn-lg" onClick={onContinue}>
                Продолжить заполнение{draftInfo ? ` (${draftInfo.answered}/${draftInfo.total})` : ''}
              </button>
              <button type="button" className="btn btn-ghost" onClick={onStart}>
                Начать заново
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-primary btn-lg" onClick={onStart}>
              Начать бриф →
            </button>
          )}
        </div>
        {hasDraft && draftInfo?.updatedAt && (
          <p className="muted small">Черновик от {new Date(draftInfo.updatedAt).toLocaleString('ru-RU')}</p>
        )}
      </div>
    </div>
  );
}
