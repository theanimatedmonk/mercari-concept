import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ImageMark from './icons/ImageMark';
import MicMark from './icons/MicMark';
import { PERMISSION_COPY, type PermissionKind } from '../lib/native/permissionCopy';
import { bindPermissionPresenter } from '../lib/native/permissionGate';
import './PermissionDialog.css';

function PermissionIcon({ kind }: { kind: PermissionKind }) {
  if (kind === 'microphone') return <MicMark />;
  return <ImageMark />;
}

export default function PermissionDialogHost() {
  const [kind, setKind] = useState<PermissionKind | null>(null);
  const pending = useRef<((allowed: boolean) => void) | null>(null);

  useEffect(() => {
    bindPermissionPresenter(
      (next: PermissionKind) =>
        new Promise((resolve) => {
          pending.current = resolve;
          setKind(next);
        }),
    );
    return () => bindPermissionPresenter(null);
  }, []);

  function finish(allowed: boolean) {
    pending.current?.(allowed);
    pending.current = null;
    setKind(null);
  }

  if (!kind || typeof document === 'undefined') return null;
  const copy = PERMISSION_COPY[kind];

  return createPortal(
    <div className="permission-dialog" role="dialog" aria-modal="true" aria-labelledby="permission-dialog-title">
      <button
        type="button"
        className="permission-dialog__veil"
        aria-label={copy.deny}
        onClick={() => finish(false)}
      />
      <div className="permission-dialog__sheet">
        <span className="permission-dialog__icon" aria-hidden>
          <PermissionIcon kind={kind} />
        </span>
        <h2 id="permission-dialog-title" className="permission-dialog__title">
          {copy.title}
        </h2>
        <p className="permission-dialog__body">{copy.body}</p>
        <div className="permission-dialog__actions">
          <button type="button" className="permission-dialog__deny" onClick={() => finish(false)}>
            {copy.deny}
          </button>
          <button type="button" className="permission-dialog__allow" onClick={() => finish(true)}>
            {copy.allow}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
