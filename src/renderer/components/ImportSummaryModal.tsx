import React, { useRef, useEffect } from 'react';
import { ImportResult } from '../../shared/types';
import { CloseIcon, CheckIcon } from './Icons';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ImportSummaryModalProps {
  result: ImportResult;
  onClose: () => void;
}

export const ImportSummaryModal: React.FC<ImportSummaryModalProps> = ({ result, onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal-dialog"
        style={{ maxWidth: '480px' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-summary-title"
        tabIndex={-1}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckIcon size={16} style={{ color: 'var(--success-color)' }} />
            <h3 id="import-summary-title">Backup Import Summary</h3>
          </div>
          <button className="btn btn-icon" onClick={onClose} title="Close" aria-label="Close dialog">
            <CloseIcon size={14} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
            The backup data was safely merged into your library:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
            <div style={{ background: 'var(--bg-tertiary)', padding: '10px 14px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Songs Added</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{result.addedSongsCount}</div>
            </div>

            <div style={{ background: 'var(--bg-tertiary)', padding: '10px 14px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Songs Skipped</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{result.skippedSongsCount}</div>
            </div>

            <div style={{ background: 'var(--bg-tertiary)', padding: '10px 14px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Setlists Added</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{result.addedSetlistsCount}</div>
            </div>

            <div style={{ background: 'var(--bg-tertiary)', padding: '10px 14px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Setlist Entries Added</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{result.addedEntriesCount}</div>
            </div>
          </div>

          {result.purgedResurrectionsBlockedCount > 0 && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              {result.purgedResurrectionsBlockedCount} previously purged song(s) were protected from accidental resurrection.
            </div>
          )}

          {result.errors && result.errors.length > 0 && (
            <div style={{ color: 'var(--danger-color)', fontSize: '12px', marginTop: '6px' }}>
              Warnings: {result.errors.join(', ')}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
