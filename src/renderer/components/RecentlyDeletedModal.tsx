import React, { useRef, useEffect } from 'react';
import { useStore } from '../hooks/useStore';
import { THIRTY_DAYS_MS } from '../../shared/types';
import { CloseIcon, UndoIcon, TrashIcon } from './Icons';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface RecentlyDeletedModalProps {
  onClose: () => void;
}

export const RecentlyDeletedModal: React.FC<RecentlyDeletedModalProps> = ({ onClose }) => {
  const { state, restoreSong } = useStore();
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

  const deletedSongs = (state?.songs || []).filter(s => s.deletedAt !== null);

  const getDaysRemaining = (deletedAt: number): number => {
    const elapsed = Date.now() - deletedAt;
    const remainingMs = Math.max(0, THIRTY_DAYS_MS - elapsed);
    return Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
  };

  const handleRestore = async (songId: string) => {
    await restoreSong(songId);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal-dialog"
        style={{ maxWidth: '580px' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="deleted-songs-title"
        tabIndex={-1}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrashIcon size={16} />
            <h3 id="deleted-songs-title">Recently Deleted Songs</h3>
          </div>
          <button className="btn btn-icon" onClick={onClose} title="Close" aria-label="Close dialog">
            <CloseIcon size={14} />
          </button>
        </div>

        <div style={{ padding: '12px 18px', background: 'var(--bg-tertiary)', fontSize: '12px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
          Deleted songs are preserved for 30 days before permanent removal. Restoring a song brings it back to the library in its original creation order, but former setlist assignments are not restored.
        </div>

        <div className="modal-body" style={{ maxHeight: '380px' }}>
          {deletedSongs.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No deleted songs.
            </div>
          ) : (
            deletedSongs.map((song) => {
              const daysRemaining = song.deletedAt ? getDaysRemaining(song.deletedAt) : 30;
              const deletedDate = song.deletedAt ? new Date(song.deletedAt).toLocaleDateString() : '';

              return (
                <div
                  key={song.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    marginBottom: '8px',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)' }}>
                      {song.title}
                    </div>
                    {song.artist && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {song.artist}
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: 'var(--warning-color)', marginTop: '4px' }}>
                      Deleted on {deletedDate} • {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
                    </div>
                  </div>

                  <button
                    className="btn"
                    onClick={() => handleRestore(song.id)}
                    title="Restore song to library"
                  >
                    <UndoIcon size={13} />
                    <span>Restore</span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
