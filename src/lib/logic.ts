import type { Answer, Answers, Confidence, Question, Section } from '../model';
import { DONT_KNOW, OTHER, SECTIONS } from '../data/questions';

export type Status = 'done' | 'unsure' | 'open' | 'na' | 'hidden';

/** Вопрос скрыт условной логикой? */
export function isHidden(q: Question, a: Answers): boolean {
  return q.showIf !== undefined && !q.showIf(a);
}

export function isHiddenSection(s: Section, a: Answers): boolean {
  return s.showIf !== undefined && !s.showIf(a);
}

export function visibleSections(a: Answers): Section[] {
  return SECTIONS.filter((s) => !isHiddenSection(s, a));
}

export function visibleQuestions(s: Section, a: Answers): Question[] {
  return s.questions.filter((q) => !isHidden(q, a));
}

export function hasValue(q: Question, ans?: Answer): boolean {
  if (!ans) return false;
  if (q.type === 'files') return (ans.fileNames?.length ?? 0) > 0;
  if (Array.isArray(ans.value)) return ans.value.length > 0;
  return typeof ans.value === 'string' && ans.value.trim().length > 0;
}

const valueIncludesDontKnow = (q: Question, ans?: Answer): boolean => {
  if (!ans || !q.options?.includes(DONT_KNOW)) return false;
  if (Array.isArray(ans.value)) return ans.value.includes(DONT_KNOW);
  return ans.value === DONT_KNOW;
};

/** Итоговый статус вопроса для Internal Spec */
export function statusOf(q: Question, a: Answers): Status {
  if (isHidden(q, a)) return 'hidden';
  const ans = a[q.id];
  if (ans?.confidence === 'na') return 'na';
  if (!hasValue(q, ans)) return 'open';
  if (ans.confidence === 'unsure') return 'unsure';
  if (ans.confidence === 'unknown' || valueIncludesDontKnow(q, ans)) return 'open';
  return 'done';
}

export interface Stats {
  total: number;
  done: number;
  unsure: number;
  open: number;
  na: number;
}

export function statsOf(a: Answers): Stats {
  const stats: Stats = { total: 0, done: 0, unsure: 0, open: 0, na: 0 };
  for (const s of visibleSections(a)) {
    for (const q of visibleQuestions(s, a)) {
      stats.total += 1;
      const st = statusOf(q, a);
      if (st === 'done') stats.done += 1;
      else if (st === 'unsure') stats.unsure += 1;
      else if (st === 'na') stats.na += 1;
      else if (st === 'open') stats.open += 1;
    }
  }
  return stats;
}

/** Все обязательные вопросы раздела заполнены? Раздел без обязательных — не «завершён». */
export function sectionComplete(s: Section, a: Answers): boolean {
  const required = visibleQuestions(s, a).filter((q) => q.required);
  if (required.length === 0) return false;
  return required.every((q) => hasValue(q, a[q.id]));
}

/** Массив из visibleSections с индексами исходного списка — для навигации */
export function sectionVisibleInNav(s: Section, a: Answers): boolean {
  return !isHiddenSection(s, a);
}

export const STATUS_META: Record<Exclude<Status, 'hidden'>, { icon: string; label: string; short: string }> = {
  done: { icon: '🟢', label: 'Решено', short: 'Знаю' },
  unsure: { icon: '🟡', label: 'Не уверен', short: 'Не уверен' },
  open: { icon: '🔴', label: 'Открытый вопрос', short: 'Не знаю' },
  na: { icon: '⚪', label: 'Не относится', short: 'Не относится' },
};

export const CONFIDENCE_META: { value: Confidence; label: string; title: string }[] = [
  { value: 'sure', label: '✓ Знаю', title: 'Есть конкретный ответ' },
  { value: 'unsure', label: '≈ Не уверен', title: 'Есть предположение, но нужна помощь' },
  { value: 'unknown', label: '? Не знаю', title: 'Пусть специалист предложит решение' },
  { value: 'na', label: '✕ Не относится', title: 'Вопрос не имеет отношения к проекту' },
];

/** Человекочитаемый ответ для документов */
export function displayValue(q: Question, ans?: Answer): string {
  if (!ans) return '';
  if (q.type === 'files') return (ans.fileNames ?? []).join(', ');
  let text: string;
  if (Array.isArray(ans.value)) {
    text = ans.value.join(', ');
  } else {
    text = (ans.value ?? '').trim();
  }
  const other = ans.otherText?.trim();
  if (other) {
    const otherVariants = [OTHER, 'Другой', 'Другим', 'Другая'];
    const hasOther = Array.isArray(ans.value) ? ans.value.some((v) => otherVariants.includes(v)) : otherVariants.includes(ans.value ?? '');
    if (hasOther) text = text.replace(new RegExp(`(^|,\\s*)(${otherVariants.join('|')})(,\\s*|$)`, 'g'), '$1').replace(/^,|,$/g, '').trim();
    text = text ? `${text}, Другое: ${other}` : `Другое: ${other}`;
  }
  return text;
}
