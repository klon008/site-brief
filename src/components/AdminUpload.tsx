import { useRef, useState } from 'react';
import { FileUp, TriangleAlert } from 'lucide-react';
import { readBriefFile, type BriefFilePayload } from '../lib/crypto';

interface Props {
  onLoaded: (payload: BriefFilePayload) => void;
  onExit: () => void;
}

export default function AdminUpload({ onLoaded, onExit }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onLoaded(await readBriefFile(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось прочитать файл.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-page">
      <p className="section-kicker">Просмотр брифа</p>
      <h1>Загрузите файл с ответами</h1>
      <p className="muted">
        Файл <code>*.brief</code>, который клиент скачивает в конце брифа. Данные расшифровываются прямо здесь, в браузере.
      </p>

      <div
        className={`dropzone ${dragOver ? 'over' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void handleFile(e.dataTransfer.files?.[0]);
        }}
      >
        <p className="dropzone-icon">
          <FileUp size={40} strokeWidth={1.6} />
        </p>
        <p><strong>Перетащите файл сюда</strong> или нажмите, чтобы выбрать</p>
        <p className="muted small">{busy ? 'Читаем и расшифровываем…' : 'Файл никуда не отправляется — открывается локально'}</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".brief,application/json"
        hidden
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          if (inputRef.current) inputRef.current.value = '';
        }}
      />

      {error && (
        <p className="admin-error">
          <TriangleAlert size={15} className="inline-icon" /> {error}
        </p>
      )}

      <div className="admin-footer">
        <button type="button" className="btn btn-ghost" onClick={onExit}>
          ← На главную
        </button>
      </div>
    </div>
  );
}
