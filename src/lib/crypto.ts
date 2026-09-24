import type { Answers } from '../model';
import { buildJson } from './exporters';

/**
 * Микро-защита: файл шифруется AES-GCM ключом, выведенным из секрета ниже.
 * Секрет зашит в бандл, поэтому это защита «от случайного читателя»
 * (клиент/посторонний открывает файл и видит бинарную кашу),
 * а не от реверс-инжиниринга приложения.
 */
const SECRET = 'kR9m-brief-vault-T4qZ-хранилище-74193';

let keyPromise: Promise<CryptoKey> | null = null;

function getKey(): Promise<CryptoKey> {
  if (!keyPromise) {
    keyPromise = crypto.subtle
      .digest('SHA-256', new TextEncoder().encode(SECRET))
      .then((raw) => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']));
  }
  return keyPromise;
}

function toB64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function fromB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function encryptText(text: string): Promise<{ iv: string; data: string }> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text));
  return { iv: toB64(iv), data: toB64(new Uint8Array(cipher)) };
}

async function decryptText(ivB64: string, dataB64: string): Promise<string> {
  const key = await getKey();
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(ivB64) }, key, fromB64(dataB64));
  return new TextDecoder().decode(plain);
}

export interface BriefFilePayload {
  form: string;
  version: number;
  exportedAt: string;
  answers: Answers;
}

/** Зашифрованное содержимое .brief-файла для отправки клиентом */
export async function buildEncryptedBrief(answers: Answers): Promise<string> {
  const { iv, data } = await encryptText(buildJson(answers));
  return JSON.stringify({ app: 'site-brief', format: 2, iv, data }, null, 2);
}

/** Разбор загруженного в админке файла */
export async function readBriefFile(file: File): Promise<BriefFilePayload> {
  const text = await file.text();
  let outer: { app?: string; format?: number; iv?: string; data?: string };
  try {
    outer = JSON.parse(text);
  } catch {
    throw new Error('Файл не читается — это не файл брифа.');
  }
  if (outer?.app !== 'site-brief' || outer?.format !== 2 || typeof outer.iv !== 'string' || typeof outer.data !== 'string') {
    throw new Error('Файл не похож на файл брифа. Нужен файл *.brief, который клиент скачивает в конце.');
  }
  let inner: string;
  try {
    inner = await decryptText(outer.iv, outer.data);
  } catch {
    throw new Error('Не удалось расшифровать файл — он повреждён или создан другим приложением.');
  }
  let payload: BriefFilePayload;
  try {
    payload = JSON.parse(inner) as BriefFilePayload;
  } catch {
    throw new Error('Внутри файла неожиданные данные.');
  }
  if (payload?.form !== 'site-brief' || typeof payload.answers !== 'object' || payload.answers === null) {
    throw new Error('Внутри файла нет ответов брифа.');
  }
  return payload;
}

/** Имя файла не раскрывает название проекта — оно внутри зашифрованной части */
export function briefFileName(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).slice(2, 6);
  return `brief-${ymd}-${rand}.brief`;
}
