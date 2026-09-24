export type Confidence = 'sure' | 'unsure' | 'unknown' | 'na';

export type QType = 'text' | 'textarea' | 'email' | 'url' | 'date' | 'select' | 'multi' | 'files';

export interface Answer {
  value?: string | string[];
  /** Уточнение, если выбран вариант «Другое» */
  otherText?: string;
  confidence?: Confidence;
  /** Имена выбранных файлов (сами файлы не хранятся) */
  fileNames?: string[];
}

export type Answers = Record<string, Answer>;

export interface Question {
  id: string;
  num: number;
  label: string;
  type: QType;
  /** Короткое название области для Internal Spec */
  area: string;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  options?: string[];
  maxChoices?: number;
  /** Подзаголовок внутри экрана (группа вопросов) */
  group?: string;
  showIf?: (a: Answers) => boolean;
  /** Что сделать, если вопрос остался открытым (для Internal Spec) */
  action?: string;
  /** Не показывать переключатель «Знаю / Не уверен / …» */
  noStatus?: boolean;
}

export interface Section {
  id: string;
  title: string;
  icon: string;
  intro?: string;
  showIf?: (a: Answers) => boolean;
  questions: Question[];
}
