import React, { useState } from 'react';
import { useStore } from '../hooks/useStore';
import { TextSize, ThemePreference, ImportResult } from '../../shared/types';
import { ImportSummaryModal } from './ImportSummaryModal';
import { CloseIcon, SettingsIcon, TrashIcon } from './Icons';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const {
    state,
    updatePreferences,
    exportBackup,
    importBackup,
    setIsRecentlyDeletedOpen,
    setIsTourOpen,
  } = useStore();

  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importAppearance, setImportAppearance] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [importErrorMessage, setImportErrorMessage] = useState<string | null>(null);

  const textSize = state?.preferences.textSize || 'standard';
  const theme = state?.preferences.theme || 'system';

  const handleTextSizeChange = (size: TextSize) => {
    updatePreferences({ textSize: size });
  };

  const handleThemeChange = (newTheme: ThemePreference) => {
    updatePreferences({ theme: newTheme });
  };

  const handleExport = async () => {
    setExportMessage(null);
    const res = await exportBackup();
    if (!res.cancelled) {
      if (res.error) {
        setExportMessage(`Export error: ${res.error}`);
      } else if (res.filePath) {
        setExportMessage(`Backup successfully saved to: ${res.filePath}`);
      }
    }
  };

  const handleImport = async () => {
    setImportErrorMessage(null);
    const res = await importBackup({ importPreferences: importAppearance });
    if (!res.cancelled) {
      if (res.error) {
        setImportErrorMessage(res.error);
      } else if (res.result) {
        setImportResult(res.result);
      }
    }
  };

  const handleReplayTour = () => {
    onClose();
    setIsTourOpen(true);
  };

  const handleOpenRecentlyDeleted = () => {
    onClose();
    setIsRecentlyDeletedOpen(true);
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-dialog"
          style={{ maxWidth: '560px' }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-dialog-title"
        >
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SettingsIcon size={16} />
              <h3 id="settings-dialog-title">Settings & Studio Information</h3>
            </div>
            <button className="btn btn-icon" onClick={onClose} title="Close" aria-label="Close dialog">
              <CloseIcon size={14} />
            </button>
          </div>

          <div className="modal-body" style={{ maxHeight: '70vh' }}>
            {/* Appearance & Text Size */}
            <section>
              <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Appearance</h4>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Theme</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['system', 'light', 'dark'] as const).map((t) => (
                    <button
                      key={t}
                      className={`btn ${theme === t ? 'btn-primary' : ''}`}
                      style={{ flex: 1, textTransform: 'capitalize' }}
                      onClick={() => handleThemeChange(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Accessible Studio Text Size</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(['small', 'standard', 'large', 'x-large'] as const).map((s) => (
                    <button
                      key={s}
                      className={`btn ${textSize === s ? 'btn-primary' : ''}`}
                      style={{ flex: 1, textTransform: 'capitalize' }}
                      onClick={() => handleTextSizeChange(s)}
                    >
                      {s.replace('-', ' ')}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Scales both musical readouts (Key, BPM, Signature) and arrangement notes together.
                </div>
              </div>
            </section>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)' }} />

            {/* Backups & Recovery */}
            <section>
              <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Library Backup & Restore</h4>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                Export your entire song library, setlists, and preferences to a portable offline JSON file, or merge an existing backup. Note: Backup files contain plain-text song information.
              </p>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button className="btn" onClick={handleExport}>
                  Export Backup File…
                </button>
                <button className="btn" onClick={handleImport}>
                  Merge Import Backup…
                </button>
              </div>

              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="import-appearance-pref"
                  checked={importAppearance}
                  onChange={(e) => setImportAppearance(e.target.checked)}
                />
                <label htmlFor="import-appearance-pref" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Import appearance and text-size settings from backup
                </label>
              </div>

              {exportMessage && (
                <div style={{ marginTop: '8px', padding: '6px 10px', background: 'var(--bg-tertiary)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-primary)' }}>
                  {exportMessage}
                </div>
              )}

              {importErrorMessage && (
                <div style={{ marginTop: '8px', padding: '6px 10px', background: 'var(--danger-bg)', color: 'var(--danger-color)', borderRadius: '6px', fontSize: '12px' }}>
                  {importErrorMessage}
                </div>
              )}
            </section>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)' }} />

            {/* Recently Deleted */}
            <section style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 600 }}>Recently Deleted</h4>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Recover songs deleted within the last 30 days
                </div>
              </div>
              <button className="btn" onClick={handleOpenRecentlyDeleted}>
                <TrashIcon size={13} />
                <span>View Deleted</span>
              </button>
            </section>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)' }} />

            {/* Guided Tour & Shortcuts */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 600 }}>Guided Walkthrough</h4>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Replay the 4-step studio quick-start tour
                  </div>
                </div>
                <button className="btn" onClick={handleReplayTour}>
                  Replay Tour
                </button>
              </div>

              <h4 style={{ fontSize: '13px', fontWeight: 600, marginTop: '14px', marginBottom: '8px' }}>Keyboard Shortcuts</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px' }}>
                <div><kbd style={{ background: 'var(--bg-tertiary)', padding: '2px 5px', borderRadius: '4px' }}>⌘F</kbd> Focus search</div>
                <div><kbd style={{ background: 'var(--bg-tertiary)', padding: '2px 5px', borderRadius: '4px' }}>⌘N</kbd> Add new song</div>
                <div><kbd style={{ background: 'var(--bg-tertiary)', padding: '2px 5px', borderRadius: '4px' }}>Esc</kbd> Cancel / Close modal</div>
                <div><kbd style={{ background: 'var(--bg-tertiary)', padding: '2px 5px', borderRadius: '4px' }}>⌘⌥← / →</kbd> Prev / Next in setlist</div>
              </div>
            </section>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)' }} />

            {/* App Info */}
            <section style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
              <div><strong>Studio Songs</strong> Version 1.0.0 (Offline Studio Utility)</div>
              <div style={{ marginTop: '2px' }}>100% local durable storage • No cloud, analytics, or external telemetry</div>
            </section>
          </div>

          <div className="modal-footer">
            <button className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>

      {importResult && (
        <ImportSummaryModal
          result={importResult}
          onClose={() => setImportResult(null)}
        />
      )}
    </>
  );
};
