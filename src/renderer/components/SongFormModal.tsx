import React, { useState, useEffect, useRef } from 'react';
import { Song } from '../../shared/types';
import { useStore } from '../hooks/useStore';
import { MUSICAL_KEYS } from '../../shared/keys';
import { COMMON_TIME_SIGNATURES } from '../../shared/timeSignatures';
import { normalizeSearch } from '../../shared/search';
import { smartTitleCase } from '../../shared/formatters';
import { CloseIcon } from './Icons';

interface SongFormModalProps {
  mode: 'create' | 'edit' | 'duplicate';
  song?: Song;
  onClose: () => void;
}

export const SongFormModal: React.FC<SongFormModalProps> = ({ mode, song, onClose }) => {
  const { state, createSong, updateSongMetadata } = useStore();

  // Initial field values:
  // For new songs: BPM prefilled with "74", Key unset (""), Time Signature preselected to "4/4"
  // For edit/duplicate: copy existing values as-is without backfilling!
  const [title, setTitle] = useState(() => {
    if (mode === 'duplicate' && song) return `${song.title} (Copy)`;
    if (mode === 'edit' && song) return song.title;
    return '';
  });

  const [artist, setArtist] = useState(() => {
    if (song) return song.artist;
    return '';
  });

  const [bpm, setBpm] = useState(() => {
    if (song) return song.bpm;
    return '74'; // New song default
  });
  const [bpmTouched, setBpmTouched] = useState(false);

  const [musicalKey, setMusicalKey] = useState(() => {
    if (song) return song.musicalKey;
    return ''; // New song default: Unset
  });

  const [selectedTsOption, setSelectedTsOption] = useState<string>(() => {
    if (song) {
      if (!song.timeSignature) return '';
      if ((COMMON_TIME_SIGNATURES as readonly string[]).includes(song.timeSignature)) {
        return song.timeSignature;
      }
      return 'custom';
    }
    return '4/4'; // New song default: 4/4
  });
  const [tsTouched, setTsTouched] = useState(false);

  const [customTs, setCustomTs] = useState<string>(() => {
    if (song) {
      if (!song.timeSignature) return '';
      if ((COMMON_TIME_SIGNATURES as readonly string[]).includes(song.timeSignature)) {
        return '';
      }
      return song.timeSignature;
    }
    return '';
  });

  const [notes, setNotes] = useState(() => {
    if (song) return song.notes;
    return '';
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const titleInputRef = useRef<HTMLInputElement>(null);

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

  // On blur formatting: apply smart title-casing if entered in all-lowercase
  const handleTitleBlur = () => {
    if (title.trim()) {
      const formatted = smartTitleCase(title);
      if (formatted !== title) {
        setTitle(formatted);
      }
    }
  };

  const handleArtistBlur = () => {
    if (artist.trim()) {
      const formatted = smartTitleCase(artist);
      if (formatted !== artist) {
        setArtist(formatted);
      }
    }
  };

  const isFormDirty = () => {
    if (mode === 'create') {
      return Boolean(
        title.trim() ||
        artist.trim() ||
        (bpm.trim() !== '74' && bpm.trim() !== '') ||
        musicalKey ||
        selectedTsOption !== '4/4' ||
        notes.trim()
      );
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
    let finalTitle = title.trim();
    if (!finalTitle) {
      setErrorMessage('Title is required and cannot be whitespace-only.');
      titleInputRef.current?.focus();
      return;
    }
    finalTitle = smartTitleCase(finalTitle);

    let finalArtist = artist.trim();
    if (finalArtist) {
      finalArtist = smartTitleCase(finalArtist);
    }

    setErrorMessage(null);
    const finalTs = getFinalTimeSignature();

    try {
      if (mode === 'edit' && song) {
        const updatedReviewStatus = {
          bpm: bpmTouched ? (bpm.trim() === '' ? 'default' : 'reviewed') : song.reviewStatus?.bpm,
          timeSignature: tsTouched ? 'reviewed' : song.reviewStatus?.timeSignature,
        };

        await updateSongMetadata(song.id, {
          title: finalTitle,
          artist: finalArtist,
          bpm: bpm.trim(),
          musicalKey,
          timeSignature: finalTs,
          reviewStatus: updatedReviewStatus,
        });
        onClose();
      } else if (mode === 'duplicate' && song) {
        // Inherits source reviewStatus without verifying
        await createSong({
          title: finalTitle,
          artist: finalArtist,
          bpm: bpm.trim(),
          musicalKey,
          timeSignature: finalTs,
          notes: notes,
          reviewStatus: song.reviewStatus ? { ...song.reviewStatus } : undefined,
        });
        onClose();
      } else {
        // Genuinely new song:
        // Untouched prefilled BPM (or empty) is 'default'
        // Untouched preselected 4/4 is 'default'
        // Deliberately entered or selected is 'reviewed'
        const bpmTrimmed = bpm.trim();
        const bpmStatus = (!bpmTouched || bpmTrimmed === '') ? 'default' : 'reviewed';
        const tsStatus = (!tsTouched || (selectedTsOption === '4/4' && !tsTouched)) ? 'default' : 'reviewed';

        await createSong({
          title: finalTitle,
          artist: finalArtist,
          bpm: bpmTrimmed,
          musicalKey,
          timeSignature: finalTs,
          notes: notes,
          reviewStatus: {
            bpm: bpmStatus,
            timeSignature: tsStatus,
          },
        });

        if (addAnother) {
          // Reset to clean new-song defaults with fresh untouched-default flags!
          setTitle('');
          setArtist('');
          setBpm('74');
          setBpmTouched(false);
          setMusicalKey('');
          setSelectedTsOption('4/4');
          setCustomTs('');
          setTsTouched(false);
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
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              required
            />
          </div>

          {/* Artist */}
          <div className="form-group">
            <label className="form-label" htmlFor="song-artist-input">Artist / Composer</label>
            <input
              id="song-artist-input"
              type="text"
              className="form-input"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              onBlur={handleArtistBlur}
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
                value={bpm}
                onChange={(e) => {
                  setBpm(e.target.value);
                  setBpmTouched(true);
                }}
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
                <option value="">Unset</option>
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
                onChange={(e) => {
                  setSelectedTsOption(e.target.value);
                  setTsTouched(true);
                }}
              >
                <option value="">Unset</option>
                {COMMON_TIME_SIGNATURES.map(ts => (
                  <option key={ts} value={ts}>{ts}</option>
                ))}
                <option value="custom">Other / Custom…</option>
              </select>

              {selectedTsOption === 'custom' && (
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 5/4"
                  value={customTs}
                  onChange={(e) => {
                    setCustomTs(e.target.value);
                    setTsTouched(true);
                  }}
                  style={{ width: '130px' }}
                />
              )}
            </div>
          </div>

          {/* Initial Notes (only when creating/duplicating; editing metadata keeps notes separate) */}
          {mode !== 'edit' && (
            <div className="form-group">
              <label className="form-label" htmlFor="song-notes-input">Initial Notes</label>
              <textarea
                id="song-notes-input"
                className="form-textarea"
                rows={3}
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
