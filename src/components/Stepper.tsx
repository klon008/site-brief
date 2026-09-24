import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const trackRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [overflow, setOverflow] = useState(false);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth + 2;
    setOverflow(hasOverflow);
    setCanLeft(el.scrollLeft > 2);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  // Стрелки активны по позиции прокрутки; пересчитываем при изменениях
  useEffect(() => {
    updateArrows();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      window.removeEventListener('resize', updateArrows);
    };
  }, [sections, currentId, updateArrows]);

  // Текущий шаг всегда виден — подводим его к центру дорожки.
  // Используем прямое присвоение scrollLeft: behavior:'smooth' местами ненадёжен.
  useEffect(() => {
    const el = trackRef.current;
    const active = el?.querySelector<HTMLElement>('.step.current');
    if (!el || !active) return;
    const target = active.offsetLeft - el.offsetLeft - (el.clientWidth - active.offsetWidth) / 2;
    el.scrollLeft = Math.max(0, target);
  }, [currentId]);

  // Колесо мыши над степпером листает его горизонтально (не перехватывая края)
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      const atStart = el.scrollLeft <= 0 && delta < 0;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth && delta > 0;
      if (atStart || atEnd) return;
      e.preventDefault();
      el.scrollLeft += delta;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const scrollBy = (dir: number) => {
    const el = trackRef.current;
    if (el) el.scrollLeft += dir * 240;
  };

  return (
    <nav className="stepper no-print" aria-label="Шаги брифа">
      <div className="stepper-inner">
        {overflow && (
          <button type="button" className="step-arrow" aria-label="Прокрутить шаги назад" disabled={!canLeft} onClick={() => scrollBy(-1)}>
            <ChevronLeft size={18} />
          </button>
        )}
        <div className="stepper-track" ref={trackRef}>
          {sections.map((s, i) => {
            const complete = sectionComplete(s, answers);
            return (
              <button
                key={s.id}
                type="button"
                className={`step ${s.id === currentId ? 'current' : ''} ${complete ? 'complete' : ''}`}
                onClick={() => onJump(s.id)}
              >
                <span className="step-num">{complete && s.id !== currentId ? <Check size={12} strokeWidth={3} /> : i + 1}</span>
                <span className="step-title">{s.title}</span>
              </button>
            );
          })}
        </div>
        {overflow && (
          <button type="button" className="step-arrow" aria-label="Прокрутить шаги вперёд" disabled={!canRight} onClick={() => scrollBy(1)}>
            <ChevronRight size={18} />
          </button>
        )}
      </div>
    </nav>
  );
}
