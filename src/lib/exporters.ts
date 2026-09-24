import type { Answers } from '../model';
import { SECTIONS } from '../data/questions';
import { displayValue, STATUS_META, statusOf, visibleQuestions, visibleSections, type Stats } from './logic';

const today = () => new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });

const clean = (s: string) => s.replace(/\r\n/g, '\n').trim();

/** Многострочный ответ → строки markdown (цитата или абзацы) */
const mdAnswer = (text: string): string =>
  clean(text)
    .split('\n')
    .map((line) => line.trim())
    .join(' ');

const cell = (s: string) => mdAnswer(s).replace(/\|/g, '\\|') || '—';

export function buildClientBrief(a: Answers): string {
  const lines: string[] = [];
  const company = displayValue(SECTIONS[0].questions[5], a['q6']);
  lines.push('# Бриф на разработку сайта', '');
  lines.push(`**Компания:** ${company || '—'}  `, `**Дата заполнения:** ${today()}`, '');
  lines.push('---', '');

  visibleSections(a).forEach((section, i) => {
    lines.push(`## ${i + 1}. ${section.title}`, '');
    if (section.intro) lines.push(`*${section.intro}*`, '');
    let lastGroup: string | undefined;
    for (const q of visibleQuestions(section, a)) {
      if (q.group && q.group !== lastGroup) {
        lines.push(`### ${q.group}`, '');
        lastGroup = q.group;
      } else if (!q.group) {
        lastGroup = undefined;
      }
      const text = displayValue(q, a[q.id]);
      const status = statusOf(q, a);
      let body: string;
      if (text) body = mdAnswer(text);
      else if (status === 'na') body = '*— не относится к проекту*';
      else if (status === 'open') body = '*— ответа нет, обсудить*';
      else body = '*— не заполнено*';
      lines.push(`**${q.num}. ${clean(q.label)}**`, '', body, '');
    }
    lines.push('---', '');
  });

  lines.push(
    '## Что дальше',
    '',
    'Спасибо! Я изучу ответы и на их основании подготовлю:',
    '',
    '1. предварительную структуру проекта;',
    '2. список необходимого функционала;',
    '3. список открытых вопросов;',
    '4. предварительную оценку стоимости;',
    '5. предварительные сроки.',
    '',
    'Если какие-то решения пока не определены — это нормально. Мы отдельно обсудим их перед началом работы.',
    '',
  );
  return lines.join('\n');
}

export function buildSpec(a: Answers, stats: Stats): string {
  const company = displayValue(SECTIONS[0].questions[5], a['q6']);
  const lines: string[] = [];
  lines.push('# INTERNAL PROJECT SPEC', '');
  lines.push(`> Сформирован автоматически из брифа · ${today()}${company ? ` · ${company}` : ''}`, '');
  lines.push(
    `**Сводка:** 🟢 Решено: ${stats.done} · 🟡 Не уверен: ${stats.unsure} · 🔴 Открыто: ${stats.open} · ⚪ Не относится: ${stats.na}`,
    '',
  );

  lines.push('| # | Область | Ответ клиента | Статус | Нужно сделать |');
  lines.push('|---|---------|---------------|--------|---------------|');
  const openItems: { label: string; action: string }[] = [];

  visibleSections(a).forEach((section, i) => {
    let lastGroup: string | null = null;
    for (const q of visibleQuestions(section, a)) {
      if ((q.group ?? null) !== lastGroup) {
        lines.push(`| | **${i + 1}. ${section.title}${q.group ? ` — ${q.group}` : ''}** | | | |`);
        lastGroup = q.group ?? null;
      }
      const status = statusOf(q, a);
      const meta = STATUS_META[status as Exclude<typeof status, 'hidden'>];
      const answer = cell(displayValue(q, a[q.id]));
      const need = status === 'done' || status === 'na' ? '—' : q.action ?? 'Обсудить';
      lines.push(`| ${q.num} | ${cell(q.area)} | ${answer} | ${meta.icon} ${meta.label} | ${cell(need)} |`);
      if (status === 'open' || status === 'unsure') openItems.push({ label: `${q.num}. ${q.label}`, action: q.action ?? 'Обсудить' });
    }
  });

  lines.push('', '## Открытые вопросы к обсуждению', '');
  if (openItems.length === 0) {
    lines.push('Открытых вопросов нет — все ключевые решения приняты.', '');
  } else {
    lines.push('| Вопрос | Что сделать |', '|--------|-------------|');
    for (const item of openItems) lines.push(`| ${cell(item.label)} | ${cell(item.action)} |`);
    lines.push('');
  }
  return lines.join('\n');
}

export function buildJson(a: Answers): string {
  return JSON.stringify(
    {
      form: 'site-brief',
      version: 1,
      exportedAt: new Date().toISOString(),
      answers: a,
    },
    null,
    2,
  );
}

export function downloadFile(filename: string, content: string, mime = 'text/markdown;charset=utf-8'): void {
  const blob = new Blob(['\ufeff' + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Slug из названия компании для имён файлов */
export function projectSlug(a: Answers): string {
  const raw = displayValue(SECTIONS[0].questions[5], a['q6']) || 'brief';
  return (
    raw
      .toLowerCase()
      .replace(/[^a-zа-яё0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'brief'
  );
}
