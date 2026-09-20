import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import CloseMark from '../../components/icons/CloseMark';
import EditMark from '../../components/icons/EditMark';
import ImageMark from '../../components/icons/ImageMark';
import { fileToImagePayload } from '../../lib/llm/styleOnMeClient';
import './PhotoUploader.css';

export type SelfiePayload = {
  preview: string;
  imageBase64: string;
  mimeType: string;
};

type Props = {
  initial?: SelfiePayload | null;
  onClose: () => void;
  onPick: (selfie: SelfiePayload) => void;
};

export default function PhotoUploader({ initial, onClose, onPick }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<SelfiePayload | null>(initial ?? null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);

  async function readFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Use a photo of you');
      return;
    }
    setReading(true);
    setError(null);
    try {
      const payload = await fileToImagePayload(file);
      setPreview(payload);
    } catch {
      setError('Could not read that photo. Try another.');
    } finally {
      setReading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void readFile(file);
  }

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const file = [...(e.clipboardData?.items ?? [])]
        .find((item) => item.type.startsWith('image/'))
        ?.getAsFile();
      if (file) {
        e.preventDefault();
        void readFile(file);
      }
    }
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);

  return createPortal(
    <div className="photo-uploader" role="dialog" aria-modal="true" aria-labelledby="photo-uploader-title">
      <button type="button" className="photo-uploader__veil" aria-label="Close" onClick={onClose} />
      <div className="photo-uploader__sheet">
        <button type="button" className="photo-uploader__close" aria-label="Close" onClick={onClose}>
          <CloseMark />
        </button>
        <h2 id="photo-uploader-title" className="photo-uploader__title">
          {initial ? 'Change your photo' : 'Add a photo of you'}
        </h2>
        <p className="photo-uploader__sub">We’ll style the piece on this photo.</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void readFile(file);
            e.target.value = '';
          }}
        />
        {preview ? (
          <div className="photo-uploader__picked">
            <div className="photo-uploader__frame">
              <img src={preview.preview} alt="Your photo" />
              <button
                type="button"
                className="photo-uploader__swap"
                aria-label="Edit photo"
                onClick={() => fileRef.current?.click()}
              >
                <EditMark />
              </button>
            </div>
            <button
              type="button"
              className="photo-uploader__done"
              onClick={() => onPick(preview)}
            >
              Style it on me
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={`photo-uploader__drop${dragging ? ' is-dragging' : ''}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <ImageMark />
            <span>{reading ? 'Reading photo…' : 'Drop a photo or click to upload'}</span>
          </button>
        )}
        {error ? <p className="photo-uploader__error">{error}</p> : null}
      </div>
    </div>,
    document.body,
  );
}
