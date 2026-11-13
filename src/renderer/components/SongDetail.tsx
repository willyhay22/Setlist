import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Song, Setlist } from '../../shared/types';
import { useStore } from '../hooks/useStore';
import { formatKeyDisplay } from '../../shared/keys';
import { formatTimeSignatureDisplay } from '../../shared/timeSignatures';
import { EditIcon, CopyIcon, TrashIcon, PlusIcon, CheckIcon } from './Icons';

interface SongDetailProps {
  song: Song;
}

export const SongDetail: React.FC<SongDetailProps> = ({ song }) => {
  const {
    state,
    updateSongNotes,
    openSongModal,
    duplicateSong,
    deleteSong,
    addSongToSetlist,
  } = useStore();

  const [notes, setNotes] = useState(song.notes || '');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAddSetlistMenuOpen, setIsAddSetlistMenuOpen] = useState(false);
  const [addedSetlistId, setAddedSetlistId] = useState<string | null>(null);

  const activeSetlists = (state?.setlists || []).filter(sl => !sl.archived);

  // Keep track of the last saved timestamp from the store to prevent stale overwrites
  const clientLastSavedAtRef = useRef<number>(song.updatedAt);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentSongIdRef = useRef<string>(song.id);

  // When selected song changes, flush any pending save for previous song and reset local state
  useEffect(() => {
    if (currentSongIdRef.current !== song.id) {
      // Song switched: flush pending save if any
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        // Persist immediately for previous song
        updateSongNotes(currentSongIdRef.current, notes, clientLastSavedAtRef.current);
      }
      currentSongIdRef.current = song.id;
      setNotes(song.notes || '');
      clientLastSavedAtRef.current = song.updatedAt;
      setSaveStatus('saved');
      setErrorMessage(null);
    } else {
      // If store updated from external source and user is not actively editing
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

    // Debounce save 450ms
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
    const setlistCount = state?.setlistEntries.filter(e => e.songId === song.id).length || 0;
    const confirmMsg = setlistCount > 0
      ? `Are you sure you want to delete "${song.title}"?\n\nThis will remove all ${setlistCount} occurrence(s) of this song from active and archived setlists.\n\nThe song will be kept in Recently Deleted for 30 days.`
      : `Are you sure you want to delete "${song.title}"?\n\nThe song will be moved to Recently Deleted for 30 days.`;

    if (window.confirm(confirmMsg)) {
      deleteSong(song.id);
    }
  };

  const handleAddToSetlist = async (setlistId: string) => {
    await addSongToSetlist(setlistId, song.id);
    setAddedSetlistId(setlistId);
    setTimeout(() => {
      setAddedSetlistId(null);
      setIsAddSetlistMenuOpen(false);
    }, 1200);
  };

  return (
    <div className="song-detail-container" role="region" aria-label={`Details for ${song.title}`}>
      {/* Fixed Song Header */}
      <div className="song-header-fixed">
        <div className="song-title-row">
          <div className="song-title-info">
            <h2 className="song-title-display">{song.title}</h2>
            {song.artist ? (
              <div className="song-artist-display">{song.artist}</div>
            ) : (
              <div className="song-artist-display" style={{ fontStyle: 'italic', opacity: 0.6 }}>No artist specified</div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {/* Add to setlist button */}
            <div style={{ position: 'relative' }}>
              <button
                className="btn"
                onClick={() => setIsAddSetlistMenuOpen(!isAddSetlistMenuOpen)}
                title="Add this song to a setlist"
                aria-expanded={isAddSetlistMenuOpen}
              >
                <PlusIcon size={13} />
                <span>Add to Setlist</span>
              </button>

              {isAddSetlistMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '4px',
                    width: '220px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: '8px',
                    boxShadow: 'var(--shadow-md)',
                    zIndex: 20,
                    padding: '6px',
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 600, padding: '4px 8px', color: 'var(--text-muted)' }}>
                    ACTIVE SETLISTS
                  </div>
                  {activeSetlists.length === 0 ? (
                    <div style={{ padding: '6px 8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      No active setlists available.
                    </div>
                  ) : (
                    activeSetlists.map(sl => (
                      <div
                        key={sl.id}
                        onClick={() => handleAddToSetlist(sl.id)}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12.5px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: addedSetlistId === sl.id ? 'var(--success-bg)' : 'transparent',
                          color: addedSetlistId === sl.id ? 'var(--success-color)' : 'var(--text-primary)',
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sl.name}
                        </span>
                        {addedSetlistId === sl.id && <CheckIcon size={13} />}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <button
              className="btn"
              onClick={() => duplicateSong(song.id)}
              title="Duplicate song (create independent arrangement)"
            >
              <CopyIcon size={13} />
              <span>Duplicate</span>
            </button>

            <button
              className="btn"
              onClick={() => openSongModal('edit', song)}
              title="Edit song title, artist, key, BPM, and time signature"
            >
              <EditIcon size={13} />
              <span>Edit Details</span>
            </button>

            <button
              className="btn btn-danger"
              onClick={handleDelete}
              title="Delete song and remove from setlists"
            >
              <TrashIcon size={13} />
            </button>
          </div>
        </div>

        {/* Prominent Musical Readout Cards */}
        <div className="musical-readouts" id="tour-musical-readouts">
          {/* Musical Key Card */}
          <div className="readout-card">
            <span className="readout-label">Key</span>
            <div className={`readout-value ${!song.musicalKey ? 'unset' : ''}`}>
              {formatKeyDisplay(song.musicalKey)}
            </div>
          </div>

          {/* BPM Card */}
          <div className="readout-card">
            <span className="readout-label">BPM</span>
            <div className={`readout-value ${!song.bpm ? 'unset' : ''}`}>
              {song.bpm || '—'}
            </div>
          </div>

          {/* Time Signature Card */}
          <div className="readout-card">
            <span className="readout-label">Time Signature</span>
            <div className={`readout-value ${!song.timeSignature ? 'unset' : ''}`}>
              {formatTimeSignatureDisplay(song.timeSignature)}
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Notes Area */}
      <div className="notes-container" id="tour-notes-container">
        <div className="notes-header">
          <span className="notes-header-title">Arrangement & Performance Notes</span>
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
