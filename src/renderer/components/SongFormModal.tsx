import React, { useState, useEffect, useRef } from 'react';
import { Song, SongInput } from '../../shared/types';
import { useStore } from '../hooks/useStore';
import { MUSICAL_KEYS } from '../../shared/keys';
import { COMMON_TIME_SIGNATURES } from '../../shared/timeSignatures';
import { normalizeSearch } from '../../shared/search';
import { CloseIcon } from './Icons';

interface SongFormModalProps {
  mode: 'create' | 'edit' | 'duplicate';
  song?: Song;
  onClose: () => void;
}

export const SongFormModal: React.FC<SongFormModalProps> = ({ mode, song, onClose }) => {
  const { state, createSong, updateSongMetadata } = useStore();

  const [title, setTitle] = useState(mode === 'duplicate' ? `${song?.title || ''} (Copy)` : song?.title || '');
  const [artist, setArtist] = useState(song?.artist || '');
  const [bpm, setBpm] = useState(song?.bpm || '');
  const [musicalKey, setMusicalKey] = useState(song?.musicalKey || '');
  const [selectedTsOption, setSelectedTsOption] = useState<string>(() => {
    if (!song?.timeSignature) return '';
    if ((COMMON_TIME_SIGNATURES as readonly string[]).includes(song.timeSignature)) {
      return song.timeSignature;
    }
    return 'custom';
  });
  const [customTs, setCustomTs] = useState<string>(() => {
    if (!song?.timeSignature) return '';
    if ((COMMON_TIME_SIGNATURES as readonly string[]).includes(song.timeSignature)) {
      return '';
    }
    return song.timeSignature;
  });
  const [notes, setNotes] = useState(song?.notes || '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const titleInputRef = useRef<HTMLInputElement>(null);

  // Focus title input on mount
  useEffect(() => {
    titleInputRef.current?.focus();
    titleInputRef.current?.select();
  }, []);

  // Check duplicate title & artist on change
  useEffect(() => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setDuplicateWarning(null);
      return;
    }

    const normTitle = normalizeSearch(trimmedTitle);
    const normArtist = normalizeSearch(artist);

    const match = state?.songs.find(
      s => s.deletedAt === null &&
      (mode !== 'edit' || s.id !== song?.id) &&
      normalizeSearch(s.title) === normTitle &&
      normalizeSearch(s.artist) === normArtist
    );

    if (match) {
      setDuplicateWarning(
        `A song with title "${match.title}" and artist "${match.artist || 'None'}" already exists. You can still save this as an intentional arrangement.`
      );
    } else {
      setDuplicateWarning(null);
    }
  }, [title, artist, state?.songs, mode, song?.id]);

  const isFormDirty = () => {
    if (mode === 'create') {
      return Boolean(title.trim() || artist.trim() || bpm.trim() || musicalKey || selectedTsOption || notes.trim());
    }
    if (mode === 'edit' && song) {
      const ts = selectedTsOption === 'custom' ? customTs.trim() : selectedTsOption;
      return (
        title.trim() !== song.title ||
        artist.trim() !== song.artist ||
        bpm.trim() !== song.bpm ||
        musicalKey !== song.musicalKey ||
        ts !== song.timeSignature
      );
    }
    return false;
  };

  const handleCancel = () => {
    if (isFormDirty()) {
      if (window.confirm('Discard entered changes?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Esc key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [title, artist, bpm, musicalKey, selectedTsOption, customTs, notes]);

  const getFinalTimeSignature = (): string => {
    if (selectedTsOption === 'custom') {
      return customTs.trim();
    }
    return selectedTsOption;
  };

  const handleSubmit = async (addAnother: boolean = false) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMessage('Title is required and cannot be whitespace-only.');
      titleInputRef.current?.focus();
      return;
    }

    setErrorMessage(null);
    const finalTs = getFinalTimeSignature();

    try {
      if (mode === 'edit' && song) {
        await updateSongMetadata(song.id, {
          title: trimmedTitle,
          artist: artist.trim(),
          bpm: bpm.trim(),
          musicalKey,
          timeSignature: finalTs,
        });
        onClose();
      } else {
        // Create or Duplicate
        await createSong({
          title: trimmedTitle,
          artist: artist.trim(),
          bpm: bpm.trim(),
          musicalKey,
          timeSignature: finalTs,
          notes: notes,
        });

        if (addAnother) {
          setTitle('');
          setArtist('');
          setBpm('');
          setMusicalKey('');
          setSelectedTsOption('');
          setCustomTs('');
          setNotes('');
          setDuplicateWarning(null);
          titleInputRef.current?.focus();
        } else {
          onClose();
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save song');
    }
  };

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="song-form-title"
      >
        <div className="modal-header">
          <h3 id="song-form-title">
            {mode === 'edit' ? 'Edit Song Details' : mode === 'duplicate' ? 'Review & Save Copy' : 'Add New Song'}
          </h3>
          <button className="btn btn-icon" onClick={handleCancel} title="Close (Esc)" aria-label="Close dialog">
            <CloseIcon size={14} />
          </button>
        </div>

        <div className="modal-body">
          {errorMessage && (
            <div style={{ background: 'var(--danger-bg)', color: 'var(--danger-color)', padding: '8px 12px', borderRadius: '6px', fontSize: '12.5px' }}>
              {errorMessage}
            </div>
          )}

          {duplicateWarning && (
            <div className="warning-banner">
              {duplicateWarning}
            </div>
          )}

          {/* Title */}
          <div className="form-group">
            <label className="form-label" htmlFor="song-title-input">
              Song Title <span style={{ color: 'var(--danger-color)' }}>*</span>
            </label>
            <input
              id="song-title-input"
              ref={titleInputRef}
              type="text"
              className="form-input"
              placeholder="e.g. Living Hope"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Artist */}
          <div className="form-group">
            <label className="form-label" htmlFor="song-artist-input">Artist / Composer (optional)</label>
            <input
              id="song-artist-input"
              type="text"
              className="form-input"
              placeholder="e.g. Phil Wickham"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
            />
          </div>

          {/* BPM & Key Row */}
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="song-bpm-input">BPM / Tempo</label>
              <input
                id="song-bpm-input"
                type="text"
                className="form-input"
                placeholder='e.g. 72.5 or "72 verse, 76 chorus"'
                value={bpm}
                onChange={(e) => setBpm(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="song-key-select">Musical Key</label>
              <select
                id="song-key-select"
                className="form-select"
                value={musicalKey}
                onChange={(e) => setMusicalKey(e.target.value)}
              >
                <option value="">Unset (—)</option>
                <optgroup label="Major Keys">
                  {MUSICAL_KEYS.filter(k => k.mode === 'major').map(k => (
                    <option key={k.value} value={k.value}>{k.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Minor Keys">
                  {MUSICAL_KEYS.filter(k => k.mode === 'minor').map(k => (
                    <option key={k.value} value={k.value}>{k.label}</option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          {/* Time Signature */}
          <div className="form-group">
            <label className="form-label" htmlFor="song-ts-select">Time Signature</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                id="song-ts-select"
                className="form-select"
                value={selectedTsOption}
                onChange={(e) => setSelectedTsOption(e.target.value)}
              >
                <option value="">Unset (—)</option>
                {COMMON_TIME_SIGNATURES.map(ts => (
                  <option key={ts} value={ts}>{ts}</option>
                ))}
                <option value="custom">Other / Custom…</option>
              </select>

              {selectedTsOption === 'custom' && (
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 5/4 or 7/8"
                  value={customTs}
                  onChange={(e) => setCustomTs(e.target.value)}
                  style={{ width: '130px' }}
                />
              )}
            </div>
          </div>

          {/* Initial Notes (only when creating/duplicating; editing metadata keeps notes separate) */}
          {mode !== 'edit' && (
            <div className="form-group">
              <label className="form-label" htmlFor="song-notes-input">Initial Notes (optional)</label>
              <textarea
                id="song-notes-input"
                className="form-textarea"
                rows={3}
                placeholder="Arrangement notes, structure, intro cues…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={handleCancel}>
            Cancel
          </button>

          {mode === 'create' && (
            <button className="btn" onClick={() => handleSubmit(true)}>
              Save & Add Another
            </button>
          )}

          <button className="btn btn-primary" onClick={() => handleSubmit(false)}>
            {mode === 'edit' ? 'Save Changes' : mode === 'duplicate' ? 'Save Copy' : 'Save Song'}
          </button>
        </div>
      </div>
    </div>
  );
};
