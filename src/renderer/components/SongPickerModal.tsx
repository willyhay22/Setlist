import React, { useState } from 'react';
import { useStore } from '../hooks/useStore';
import { searchSongs } from '../../shared/search';
import { formatDisplayTitle, formatDisplayArtist } from '../../shared/formatters';
import { SearchIcon, CloseIcon, CheckIcon } from './Icons';

interface SongPickerModalProps {
  onClose: () => void;
}

export const SongPickerModal: React.FC<SongPickerModalProps> = ({ onClose }) => {
  const { state, addMultipleSongsToCurrentSetlist } = useStore();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const activeSongs = (state?.songs || []).filter(s => s.deletedAt === null);
  const results = searchSongs(activeSongs, search);

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleAdd = async () => {
    if (selectedIds.length === 0) return;
    await addMultipleSongsToCurrentSetlist(selectedIds);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-dialog"
        style={{ maxWidth: '560px' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="song-picker-title"
      >
        <div className="modal-header">
          <h3 id="song-picker-title">Add Songs to Setlist</h3>
          <button className="btn btn-icon" onClick={onClose} title="Close (Esc)" aria-label="Close dialog">
            <CloseIcon size={14} />
          </button>
        </div>

        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <SearchIcon size={14} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
            <input
              type="search"
              className="form-input"
              style={{ paddingLeft: '32px' }}
              placeholder="Search library songs by title or artist…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="modal-body" style={{ maxHeight: '350px', padding: '6px' }}>
          {results.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No songs found in library.
            </div>
          ) : (
            results.map(({ song }) => {
              const isSelected = selectedIds.includes(song.id);
              const displayTitle = formatDisplayTitle(song.title);
              const displayArtist = formatDisplayArtist(song.artist);

              return (
                <div
                  key={song.id}
                  onClick={() => toggleSelect(song.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--bg-selected)' : 'transparent',
                    border: '1px solid',
                    borderColor: isSelected ? 'var(--accent-color)' : 'transparent',
                    marginBottom: '4px',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)' }}>
                      {displayTitle}
                    </div>
                    {displayArtist ? (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {displayArtist}
                      </div>
                    ) : null}
                  </div>

                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--accent-color)' : 'var(--border-strong)',
                      background: isSelected ? 'var(--accent-color)' : 'var(--bg-secondary)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginLeft: '12px',
                      flexShrink: 0,
                    }}
                  >
                    {isSelected && <CheckIcon size={12} />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleAdd}
            disabled={selectedIds.length === 0}
          >
            Add Selected ({selectedIds.length})
          </button>
        </div>
      </div>
    </div>
  );
};
