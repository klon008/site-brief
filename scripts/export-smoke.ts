import { buildClientBrief, buildSpec } from '../src/lib/exporters';
import { statsOf } from '../src/lib/logic';
import { buildEncryptedBrief, readBriefFile } from '../src/lib/crypto';
import type { Answers } from '../src/model';

// Тестовый набор ответов с ветками: старый сайт + магазин + CRM + языки
const answers: Answers = {
  q1: { value: 'Иван Петров' },
  q2: { value: 'ООО «Ромашка»' },
  q3: { value: 'ivan@romashka.lv' },
  q5: { value: 'Владелец бизнеса' },
  q6: { value: 'Ромашка' },
  q7: { value: 'Продаём цветы и оформляем букеты на заказ.' },
  q8: { value: 'Другое', otherText: 'Флористика' },
  q11: { value: 'Есть старый сайт' },
  q12: { value: 'Старый сайт не приносит заявок.' },
  q19: { value: ['Тексты', 'SEO'] },
  q35: { value: 'Нет' },
  q43: { value: ['Главная', 'Каталог', 'Контакты'] },
  q46: { value: 'Нет' },
  q52: { value: ['Контактная форма', 'Интернет-магазин', 'Мультиязычность'] },
  q54: { value: '10–50' },
  q56: { value: 'Не знаю' },
  q60: { value: ['CRM', 'Telegram'] },
  q61: { value: 'amoCRM' },
  q64: { value: 'Да' },
  q65: { value: ['Русский', 'Английский'] },
  q81: { value: '€2 500–5 000' },
  q78: { value: '2026-12-01' },
  q82: { value: ['Качество', 'Опыт'] },
  q94: { value: ['Дизайн', 'Тексты'], confidence: 'unsure' },
  q97: { fileNames: ['logo.png', 'price.pdf'] },
  q4: { confidence: 'na' },
};

const stats = statsOf(answers);
console.log('=== STATS ===');
console.log(JSON.stringify(stats));

// Раундтрип шифрования: buildEncryptedBrief → файл → readBriefFile
const enc = await buildEncryptedBrief(answers);
const fakeFile = new File([enc], 'test.brief');
const roundtrip = await readBriefFile(fakeFile);
console.log('=== CRYPTO ROUNDTRIP ===');
console.log(
  roundtrip.answers.q1?.value === answers.q1?.value && roundtrip.form === 'site-brief'
    ? 'OK: файл расшифровывается, ответы совпадают'
    : 'FAIL: ' + JSON.stringify(roundtrip).slice(0, 200),
);
console.log('Первые 120 символов файла (должна быть каша):');
console.log(enc.slice(0, 120));

console.log('=== CLIENT BRIEF ===');
console.log(buildClientBrief(answers));
console.log('=== INTERNAL SPEC ===');
console.log(buildSpec(answers, stats));
