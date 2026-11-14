import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../hooks/useStore';
import { TextSize, ThemePreference, ImportResult, UpdateCheckResult } from '../../shared/types';
import { ImportSummaryModal } from './ImportSummaryModal';
import { AboutModal } from './AboutModal';
import { CloseIcon, SettingsIcon, TrashIcon } from './Icons';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface SettingsModalProps {
  onClose: () => void;
  initialTab?: 'appearance' | 'library' | 'help';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, initialTab = 'appearance' }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true);
  const {
    state,
    updatePreferences,
    exportBackup,
    importBackup,
    importSpreadsheet,
    exportTemplate,
    setIsRecentlyDeletedOpen,
    setIsTourOpen,
  } = useStore();

  const [activeTab, setActiveTab] = useState<'appearance' | 'library' | 'help'>(initialTab);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [importAppearance, setImportAppearance] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [importErrorMessage, setImportErrorMessage] = useState<string | null>(null);
  const [spreadsheetMessage, setSpreadsheetMessage] = useState<string | null>(null);
  const [spreadsheetError, setSpreadsheetError] = useState<string | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);

  const textSize = state?.preferences.textSize || 'standard';
  const theme = state?.preferences.theme || 'system';

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Handle Esc or Cmd+W to close settings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (e.key === 'Escape' || (isCmdOrCtrl && e.key.toLowerCase() === 'w')) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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

  const handleImportSpreadsheet = async () => {
    setSpreadsheetError(null);
    setSpreadsheetMessage(null);
    const res = await importSpreadsheet();
    if (!res.cancelled) {
      if (res.error) {
        setSpreadsheetError(res.error);
      } else if (res.result) {
        setImportResult(res.result);
      }
    }
  };

  const handleExportTemplate = async () => {
    setSpreadsheetError(null);
    setSpreadsheetMessage(null);
    const res = await exportTemplate();
    if (!res.cancelled) {
      if (res.error) {
        setSpreadsheetError(`Template export error: ${res.error}`);
      } else if (res.filePath) {
        setSpreadsheetMessage(`Template saved to: ${res.filePath}`);
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

  const handleCheckForUpdates = async () => {
    if (!window.api?.checkForUpdates) return;
    setCheckingUpdate(true);
    try {
      const res = await window.api.checkForUpdates();
      setUpdateResult(res);
    } catch {
      setUpdateResult({
        updateAvailable: false,
        currentVersion: '1.3.0',
        error: 'Unable to check for updates (offline or network error)',
      });
    } finally {
      setCheckingUpdate(false);
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div
          ref={dialogRef}
          className="modal-dialog"
          style={{ maxWidth: '520px' }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-dialog-title"
          tabIndex={-1}
        >
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SettingsIcon size={16} />
              <h3 id="settings-dialog-title">Settings</h3>
            </div>
            <button className="btn btn-icon" onClick={onClose} title="Close (Esc)" aria-label="Close dialog">
              <CloseIcon size={14} />
            </button>
          </div>

          <div className="modal-body" style={{ maxHeight: '68vh' }}>
            {/* Tab navigation */}
            <div className="settings-tabs-row" role="tablist">
              <button
                role="tab"
                aria-selected={activeTab === 'appearance'}
                className={`settings-tab-btn ${activeTab === 'appearance' ? 'active' : ''}`}
                onClick={() => setActiveTab('appearance')}
              >
                Appearance
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'library'}
                className={`settings-tab-btn ${activeTab === 'library' ? 'active' : ''}`}
                onClick={() => setActiveTab('library')}
              >
                Library & Backups
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'help'}
                className={`settings-tab-btn ${activeTab === 'help' ? 'active' : ''}`}
                onClick={() => setActiveTab('help')}
              >
                Help & About
              </button>
            </div>

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
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
                  <label className="form-label">Text size</label>
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
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '5px', lineHeight: 1.4 }}>
                    Adjusts song titles, artist names, key and BPM readouts, list rows, search results, and notes. Toolbars and navigation remain comfortably compact.
                  </div>

                  {/* Compact Live Text-Size Preview (Purely decorative) */}
                  <div className="text-size-preview-card" aria-label="Text size live preview">
                    <div className="text-size-preview-header">Live Text-Size Preview</div>

                    <div>
                      <div className="preview-song-title">Amazing Grace</div>
                      <div className="preview-song-artist">John Newton</div>
                    </div>

                    <div className="preview-readouts-row">
                      <div className="preview-metric-box">
                        <span className="preview-metric-label">Key</span>
                        <div className="preview-metric-val">
                          G <span style={{ fontSize: 'var(--text-size-metric-suffix)', fontWeight: 500, color: 'var(--text-muted)' }}>major</span>
                        </div>
                      </div>

                      <div className="preview-metric-box">
                        <span className="preview-metric-label">BPM</span>
                        <div className="preview-metric-val">74</div>
                      </div>
                    </div>

                    <div className="preview-row-sample">
                      <div className="song-row-title">Amazing Grace</div>
                      <div className="song-row-meta">G major · 74 BPM</div>
                    </div>

                    <div className="preview-notes-sample">
                      Verse 1: Acoustic intro & vocal lead. Build dynamics into chorus.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Library & Backups Tab */}
            {activeTab === 'library' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Library Backup & Restore</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                    Export your entire song library, setlist, and preferences to a portable offline backup file, or merge an existing backup.
                  </p>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn" onClick={handleExport}>
                      Export Backup…
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
                    <div style={{ marginTop: '8px', padding: '6px 10px', background: 'var(--bg-tertiary)', borderRadius: '6px', fontSize: '12px' }}>
                      {exportMessage}
                    </div>
                  )}

                  {importErrorMessage && (
                    <div style={{ marginTop: '8px', padding: '6px 10px', background: 'var(--danger-bg)', color: 'var(--danger-color)', borderRadius: '6px', fontSize: '12px' }}>
                      {importErrorMessage}
                    </div>
                  )}
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)' }} />

                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Import from Spreadsheet (Excel / CSV)</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                    Batch-import songs from an Excel (.xlsx, .xls) or CSV spreadsheet using standard column headers.
                  </p>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-primary" onClick={handleImportSpreadsheet}>
                      Import Spreadsheet…
                    </button>
                    <button className="btn" onClick={handleExportTemplate}>
                      Download Template…
                    </button>
                  </div>

                  {spreadsheetMessage && (
                    <div style={{ marginTop: '8px', padding: '6px 10px', background: 'var(--bg-tertiary)', borderRadius: '6px', fontSize: '12px' }}>
                      {spreadsheetMessage}
                    </div>
                  )}

                  {spreadsheetError && (
                    <div style={{ marginTop: '8px', padding: '6px 10px', background: 'var(--danger-bg)', color: 'var(--danger-color)', borderRadius: '6px', fontSize: '12px' }}>
                      {spreadsheetError}
                    </div>
                  )}
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)' }} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 600 }}>Recently Deleted</h4>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      Recover songs deleted within the last 30 days
                    </div>
                  </div>
                  <button className="btn" onClick={handleOpenRecentlyDeleted}>
                    <TrashIcon size={13} />
                    <span>View Deleted</span>
                  </button>
                </div>
              </div>
            )}

            {/* Help & About Tab */}
            {activeTab === 'help' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 600 }}>Guided Walkthrough</h4>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      Replay the 4-step studio quick-start tips
                    </div>
                  </div>
                  <button className="btn" onClick={handleReplayTour}>
                    Replay Tour
                  </button>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)' }} />

                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Keyboard Shortcuts</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px' }}>
                    <div><kbd style={{ background: 'var(--bg-tertiary)', padding: '2px 5px', borderRadius: '4px' }}>⌘F</kbd> Find Song</div>
                    <div><kbd style={{ background: 'var(--bg-tertiary)', padding: '2px 5px', borderRadius: '4px' }}>⌘N</kbd> New Song</div>
                    <div><kbd style={{ background: 'var(--bg-tertiary)', padding: '2px 5px', borderRadius: '4px' }}>⌘S</kbd> Save Song / Form</div>
                    <div><kbd style={{ background: 'var(--bg-tertiary)', padding: '2px 5px', borderRadius: '4px' }}>⌘,</kbd> Settings</div>
                    <div><kbd style={{ background: 'var(--bg-tertiary)', padding: '2px 5px', borderRadius: '4px' }}>⌘⌥← / →</kbd> Prev / Next in setlist</div>
                    <div><kbd style={{ background: 'var(--bg-tertiary)', padding: '2px 5px', borderRadius: '4px' }}>Esc</kbd> Close dialog</div>
                  </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)' }} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 600 }}>Updates</h4>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      {checkingUpdate && 'Checking GitHub for updates…'}
                      {!checkingUpdate && updateResult && (
                        updateResult.updateAvailable ? (
                          <span style={{ color: 'var(--accent-color)', fontWeight: 500 }}>
                            Update available: v{updateResult.latestVersion}
                          </span>
                        ) : updateResult.error ? (
                          <span>{updateResult.error}</span>
                        ) : (
                          <span>You're running the latest version (v{updateResult.currentVersion})</span>
                        )
                      )}
                      {!checkingUpdate && !updateResult && (
                        <span>Check GitHub Releases for new updates</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {updateResult?.updateAvailable && updateResult.releaseUrl ? (
                      <button
                        className="btn btn-primary"
                        onClick={() => window.api.openExternalUrl(updateResult.releaseUrl!)}
                      >
                        Download v{updateResult.latestVersion}
                      </button>
                    ) : (
                      <button
                        className="btn"
                        onClick={handleCheckForUpdates}
                        disabled={checkingUpdate}
                      >
                        {checkingUpdate ? 'Checking…' : 'Check for Updates'}
                      </button>
                    )}
                  </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)' }} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 600 }}>About Setlist</h4>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      Version 1.4.0 • © 2026 William Hay
                    </div>
                  </div>
                  <button className="btn" onClick={() => setIsAboutOpen(true)}>
                    About…
                  </button>
                </div>
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

      {importResult && (
        <ImportSummaryModal
          result={importResult}
          onClose={() => setImportResult(null)}
        />
      )}

      {isAboutOpen && (
        <AboutModal onClose={() => setIsAboutOpen(false)} />
      )}
    </>
  );
};
