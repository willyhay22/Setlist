import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Song, songNeedsChecking, getNeedsCheckingFields } from '../../shared/types';
import { useStore } from '../hooks/useStore';
import { parseKeyParts } from '../../shared/keys';
import { formatTimeSignatureDisplay } from '../../shared/timeSignatures';
import { formatDisplayTitle, formatDisplayArtist } from '../../shared/formatters';
import { EditIcon, CopyIcon, TrashIcon, PlusIcon, CheckIcon } from './Icons';

interface SongDetailProps {
  song: Song;
}

const DEFAULT_NOTES_HEIGHT = 220;
const MIN_NOTES_HEIGHT = 120;
const MIN_TOP_PANE_HEIGHT = 220;

export const SongDetail: React.FC<SongDetailProps> = ({ song }) => {
  const {
    state,
    updateSongNotes,
    openSongModal,
    duplicateSong,
    deleteSong,
    addSongToCurrentSetlist,
    markSongFieldChecked,
    copyBpmToClipboard,
    updatePreferences,
  } = useStore();

  const [notes, setNotes] = useState(song.notes || '');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [justAddedToSetlist, setJustAddedToSetlist] = useState(false);
  const [copiedBpm, setCopiedBpm] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [isDraggingDivider, setIsDraggingDivider] = useState(false);

  // Height of resizable notes pane (defaults to ~220px, clamped to viewport)
  const [notesHeight, setNotesHeight] = useState<number>(() => {
    return state?.preferences.notesHeight || DEFAULT_NOTES_HEIGHT;
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const clientLastSavedAtRef = useRef<number>(song.updatedAt);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentSongIdRef = useRef<string>(song.id);
  const startDragYRef = useRef<number>(0);
  const startNotesHeightRef = useRef<number>(notesHeight);

  // Sync notes height from preferences if changed externally
  useEffect(() => {
    if (state?.preferences.notesHeight && !isDraggingDivider) {
      setNotesHeight(state.preferences.notesHeight);
    }
  }, [state?.preferences.notesHeight, isDraggingDivider]);

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    if (isMoreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMoreMenuOpen]);

  // When selected song changes, flush pending save and reset state
  useEffect(() => {
    if (currentSongIdRef.current !== song.id) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        updateSongNotes(currentSongIdRef.current, notes, clientLastSavedAtRef.current);
      }
      currentSongIdRef.current = song.id;
      setNotes(song.notes || '');
      clientLastSavedAtRef.current = song.updatedAt;
      setSaveStatus('saved');
      setErrorMessage(null);
      setIsMoreMenuOpen(false);
      setCopiedBpm(false);
      setCopyError(null);
    } else {
      if (saveStatus === 'saved' && song.notes !== notes) {
        setNotes(song.notes || '');
        clientLastSavedAtRef.current = song.updatedAt;
      }
    }
  }, [song.id, song.updatedAt]);

  const triggerSave = useCallback((textToSave: string) => {
    setSaveStatus('saving');
    setErrorMessage(null);

    updateSongNotes(song.id, textToSave, clientLastSavedAtRef.current)
      .then((res) => {
        if (res.success) {
          clientLastSavedAtRef.current = res.updatedAt;
          setSaveStatus('saved');
        }
      })
      .catch((err: any) => {
        console.error('Note autosave error:', err);
        setSaveStatus('error');
        setErrorMessage(err.message || 'Save failed');
      });
  }, [song.id, updateSongNotes]);

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setNotes(newText);
    setSaveStatus('saving');

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      triggerSave(newText);
    }, 450);
  };

  const handleNotesBlur = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    triggerSave(notes);
  };

  const handleRetrySave = () => {
    triggerSave(notes);
  };

  const handleDelete = () => {
    const occurrencesCount = (state?.currentSetlist || []).filter(e => e.songId === song.id).length;
    const confirmMsg = occurrencesCount > 0
      ? `Are you sure you want to delete "${song.title}"?\n\nThis will remove all ${occurrencesCount} occurrence(s) of this song from your current setlist.\n\nThe song will be kept in Recently Deleted for 30 days.`
      : `Are you sure you want to delete "${song.title}"?\n\nThe song will be moved to Recently Deleted for 30 days.`;

    if (window.confirm(confirmMsg)) {
      deleteSong(song.id);
    }
  };

  const handleAddToSetlist = async () => {
    await addSongToCurrentSetlist(song.id);
    setJustAddedToSetlist(true);
    setTimeout(() => {
      setJustAddedToSetlist(false);
    }, 1200);
  };

  // Copy BPM Only Handler
  const handleCopyBpm = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const trimmed = (song.bpm || '').trim();
    if (!trimmed) return;

    setCopyError(null);
    const result = await copyBpmToClipboard(trimmed);
    if (result.success) {
      setCopiedBpm(true);
      setTimeout(() => setCopiedBpm(false), 1500);
    } else {
      setCopyError(result.error || 'Copy failed');
      setTimeout(() => setCopyError(null), 3000);
    }
  };

  // Horizontal divider drag handlers
  const handleDividerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingDivider(true);
    startDragYRef.current = e.clientY;
    startNotesHeightRef.current = notesHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!containerRef.current) return;
      const totalHeight = containerRef.current.clientHeight;
      const maxAllowed = Math.max(MIN_NOTES_HEIGHT, totalHeight - MIN_TOP_PANE_HEIGHT);
      const deltaY = moveEvent.clientY - startDragYRef.current;
      // Dragging up (negative delta) increases notes height
      const newHeight = Math.max(MIN_NOTES_HEIGHT, Math.min(maxAllowed, startNotesHeightRef.current - deltaY));
      setNotesHeight(newHeight);
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      setIsDraggingDivider(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      if (!containerRef.current) return;
      const totalHeight = containerRef.current.clientHeight;
      const maxAllowed = Math.max(MIN_NOTES_HEIGHT, totalHeight - MIN_TOP_PANE_HEIGHT);
      const deltaY = upEvent.clientY - startDragYRef.current;
      const finalHeight = Math.max(MIN_NOTES_HEIGHT, Math.min(maxAllowed, startNotesHeightRef.current - deltaY));
      setNotesHeight(finalHeight);
      updatePreferences({ notesHeight: finalHeight });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleResetNotesHeight = () => {
    setNotesHeight(DEFAULT_NOTES_HEIGHT);
    updatePreferences({ notesHeight: DEFAULT_NOTES_HEIGHT });
  };

  const handleDividerKeyDown = (e: React.KeyboardEvent) => {
    if (!containerRef.current) return;
    const totalHeight = containerRef.current.clientHeight;
    const maxAllowed = Math.max(MIN_NOTES_HEIGHT, totalHeight - MIN_TOP_PANE_HEIGHT);

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const updated = Math.min(maxAllowed, notesHeight + 20);
      setNotesHeight(updated);
      updatePreferences({ notesHeight: updated });
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const updated = Math.max(MIN_NOTES_HEIGHT, notesHeight - 20);
      setNotesHeight(updated);
      updatePreferences({ notesHeight: updated });
    } else if (e.key === 'Enter' || e.key === ' ' || e.key.toLowerCase() === 'r') {
      e.preventDefault();
      handleResetNotesHeight();
    }
  };

  const displayTitle = formatDisplayTitle(song.title);
  const displayArtist = formatDisplayArtist(song.artist);
  const { root: keyRoot, suffix: keySuffix } = parseKeyParts(song.musicalKey);
  const bpmNeedsChecking = song.reviewStatus?.bpm === 'default';
  const tsNeedsChecking = song.reviewStatus?.timeSignature === 'default';
  const bothNeedChecking = bpmNeedsChecking && tsNeedsChecking;
  const hasBpm = Boolean(song.bpm && song.bpm.trim());

  return (
    <div
      ref={containerRef}
      className="song-detail-container"
      role="region"
      aria-label={`Details for ${displayTitle}`}
    >
      {/* Top Section: Fixed Song Info & Prominent Readouts (fills remaining height) */}
      <div className="song-header-fixed" style={{ flex: 1, minHeight: `${MIN_TOP_PANE_HEIGHT}px` }}>
        {/* Full-width Title & Artist Block */}
        <div className="song-header-title-block">
          <h2 className="song-title-display">{displayTitle}</h2>
          {displayArtist ? (
            <div className="song-artist-display">{displayArtist}</div>
          ) : null}
        </div>

        {/* Distinct Actions Row Beneath Title */}
        <div className="song-header-actions-row">
          <button
            className={`btn ${justAddedToSetlist ? '' : 'btn-primary'}`}
            style={{
              background: justAddedToSetlist ? 'var(--success-bg)' : undefined,
              color: justAddedToSetlist ? 'var(--success-color)' : undefined,
              borderColor: justAddedToSetlist ? 'var(--success-color)' : undefined,
            }}
            onClick={handleAddToSetlist}
            title="Add this song to your current setlist"
          >
            {justAddedToSetlist ? <CheckIcon size={13} /> : <PlusIcon size={13} />}
            <span>{justAddedToSetlist ? 'Added to Setlist' : 'Add to Setlist'}</span>
          </button>

          <button
            className="btn"
            onClick={() => openSongModal('edit', song)}
            title="Edit song title, artist, key, tempo, and signature"
          >
            <EditIcon size={13} />
            <span>Edit Details</span>
          </button>

          {/* Labelled More… Overflow Menu for Duplicate & Delete */}
          <div className="more-menu-container" ref={moreMenuRef} style={{ position: 'relative' }}>
            <button
              className="btn"
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              title="More actions"
              aria-expanded={isMoreMenuOpen}
            >
              <span>More ▾</span>
            </button>

            {isMoreMenuOpen && (
              <div className="dropdown-menu">
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    duplicateSong(song.id);
                  }}
                >
                  <CopyIcon size={13} />
                  <span>Duplicate Song</span>
                </button>

                <div className="dropdown-separator" />

                <button
                  className="dropdown-item dropdown-item-danger"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    handleDelete();
                  }}
                >
                  <TrashIcon size={13} />
                  <span>Delete Song…</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Prominent Musical Readout Cards: Key and BPM Dominate */}
        <div className="musical-readouts" id="tour-musical-readouts">
          {/* Key Card (Prominent Root + Suffix) */}
          <div className="readout-card" aria-label={`Musical Key: ${keyRoot} ${keySuffix}`.trim()}>
            <div className="readout-card-header">
              <span className="readout-label">Key</span>
            </div>
            <div className="key-readout-body">
              <span className={`key-root ${keyRoot === 'Unset' ? 'unset' : ''}`}>{keyRoot}</span>
              {keySuffix ? <span className="key-suffix">{keySuffix}</span> : null}
            </div>
          </div>

          {/* BPM Card (Prominent BPM + Copy BPM Button + Needs Checking) */}
          <div className="readout-card" aria-label={`BPM: ${song.bpm || 'Unset'}`}>
            <div className="readout-card-header">
              <span className="readout-label">BPM</span>
              {hasBpm && (
                <button
                  type="button"
                  className={`btn-copy-bpm ${copiedBpm ? 'copied' : ''}`}
                  onClick={handleCopyBpm}
                  title="Copy BPM"
                  aria-label="Copy BPM"
                >
                  {copiedBpm ? <CheckIcon size={11} /> : <CopyIcon size={11} />}
                  <span>{copiedBpm ? 'Copied' : 'Copy BPM'}</span>
                </button>
              )}
            </div>

            <div className="bpm-readout-body">
              <div className={`bpm-value ${!hasBpm ? 'unset' : ''}`}>
                {song.bpm || 'Unset'}
              </div>
              {copyError && (
                <div style={{ fontSize: '11px', color: 'var(--danger-color)', marginTop: '2px' }}>
                  {copyError}
                </div>
              )}
            </div>

            {bpmNeedsChecking && (
              <div className="needs-checking-row">
                <span className="badge-needs-checking" title="Convenience default tempo 74 was not reviewed">
                  Needs checking
                </span>
                <button
                  type="button"
                  className="btn-mark-checked"
                  onClick={() => markSongFieldChecked(song.id, 'bpm')}
                  title="Mark BPM as checked"
                  aria-label="Mark BPM as checked"
                >
                  Mark checked
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Secondary Time Signature Bar (Quiet Supporting Label) */}
        <div className="time-signature-secondary-bar">
          <div className="time-sig-info">
            <span className="time-sig-label">Time:</span>
            <span className="time-sig-val">{formatTimeSignatureDisplay(song.timeSignature)}</span>
            {tsNeedsChecking && (
              <span className="needs-checking-row" style={{ marginLeft: '6px' }}>
                <span className="badge-needs-checking" title="Convenience default time signature 4/4 was not reviewed">
                  Needs checking
                </span>
                <button
                  type="button"
                  className="btn-mark-checked"
                  onClick={() => markSongFieldChecked(song.id, 'timeSignature')}
                  title="Mark time signature as checked"
                  aria-label="Mark time signature as checked"
                >
                  Mark checked
                </button>
              </span>
            )}
          </div>

          {bothNeedChecking && (
            <button
              type="button"
              className="btn-mark-checked"
              onClick={() => markSongFieldChecked(song.id, 'both')}
              title="Mark both BPM and Time Signature as checked"
              aria-label="Mark both BPM and Time Signature as checked"
            >
              Mark both checked
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Drag Divider Between Song Info and Notes */}
      <div
        className={`notes-horizontal-divider ${isDraggingDivider ? 'dragging' : ''}`}
        role="separator"
        tabIndex={0}
        aria-orientation="horizontal"
        aria-label="Resize Notes Area"
        aria-valuenow={notesHeight}
        aria-valuemin={MIN_NOTES_HEIGHT}
        aria-valuemax={600}
        onMouseDown={handleDividerMouseDown}
        onDoubleClick={handleResetNotesHeight}
        onKeyDown={handleDividerKeyDown}
        title="Drag up or down to resize notes (Double-click to reset)"
      >
        <div className="notes-divider-grip" />
      </div>

      {/* Resizable Notes Area */}
      <div
        className="notes-container"
        id="tour-notes-container"
        style={{ height: `${notesHeight}px` }}
      >
        <div className="notes-header">
          <div className="notes-header-left">
            <span className="notes-header-title">Notes</span>
            {notesHeight !== DEFAULT_NOTES_HEIGHT && (
              <button
                type="button"
                className="notes-reset-btn"
                onClick={handleResetNotesHeight}
                title="Reset notes height to default"
              >
                Reset height
              </button>
            )}
          </div>

          <div className="notes-save-status">
            {saveStatus === 'saved' && (
              <span className="saved">Saved</span>
            )}
            {saveStatus === 'saving' && (
              <span className="saving">Saving…</span>
            )}
            {saveStatus === 'error' && (
              <span className="error" onClick={handleRetrySave} title="Click to retry saving notes">
                {errorMessage || 'Save error'} — Retry
              </span>
            )}
          </div>
        </div>

        <textarea
          className="notes-textarea"
          placeholder="Enter chord reminders, structure, transitions, instrumentation, or cues. Autosaves as you type…"
          value={notes}
          onChange={handleNotesChange}
          onBlur={handleNotesBlur}
          aria-label="Song notes"
        />
      </div>
    </div>
  );
};
