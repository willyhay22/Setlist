import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../hooks/useStore';
import { SongDetail } from './SongDetail';
import { searchSongs } from '../../shared/search';
import { PlusIcon } from './Icons';

export const LibraryView: React.FC = () => {
  const {
    state,
    selectedSongId,
    setSelectedSongId,
    searchQuery,
    openSongModal,
    updatePreferences,
  } = useStore();

  const [dividerWidth, setDividerWidth] = useState<number>(state?.preferences.dividerWidth || 320);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(dividerWidth);

  // Sync divider width from state
  useEffect(() => {
    if (state?.preferences.dividerWidth) {
      setDividerWidth(state.preferences.dividerWidth);
    }
  }, [state?.preferences.dividerWidth]);

  // Handle draggable divider
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = dividerWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const delta = moveEvent.clientX - startXRef.current;
      const newWidth = Math.max(220, Math.min(500, startWidthRef.current + delta));
      setDividerWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        // Persist divider width
        updatePreferences({ dividerWidth });
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const allSongs = state?.songs || [];
  const searchResults = searchSongs(allSongs, searchQuery);

  // Auto-select first song if none selected and results exist
  useEffect(() => {
    if (searchResults.length > 0) {
      const exists = searchResults.some(r => r.song.id === selectedSongId);
      if (!selectedSongId || !exists) {
        setSelectedSongId(searchResults[0].song.id);
      }
    } else {
      setSelectedSongId(null);
    }
  }, [searchResults.length, searchQuery]);

  const selectedSong = allSongs.find(s => s.id === selectedSongId && s.deletedAt === null);

  return (
    <div className="main-content" role="region" aria-label="Song Library">
      {/* Left Pane: Song List */}
      <div
        className="split-pane-left"
        id="tour-song-list-pane"
        style={{ width: `${dividerWidth}px` }}
      >
        <div className="item-list-header">
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Songs ({searchResults.length})
          </span>
          <button
            className="btn"
            style={{ height: '24px', padding: '0 8px', fontSize: '11.5px' }}
            onClick={() => openSongModal('create')}
            title="Add Song (⌘N)"
          >
            <PlusIcon size={12} />
            <span>New</span>
          </button>
        </div>

        <div className="item-list-scroll">
          {searchResults.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
              {searchQuery ? (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>No songs found</div>
                  <div style={{ fontSize: '12px' }}>Try searching with a different title or artist.</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>Library is empty</div>
                  <div style={{ fontSize: '12px' }}>Click "+ Add Song" to add your first song.</div>
                </div>
              )}
            </div>
          ) : (
            searchResults.map(({ song, isFuzzy }) => (
              <div
                key={song.id}
                className={`song-row ${song.id === selectedSongId ? 'selected' : ''}`}
                onClick={() => setSelectedSongId(song.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedSongId(song.id)}
                aria-selected={song.id === selectedSongId}
              >
                <div className="song-row-title">
                  {song.title}
                  {isFuzzy && <span className="fuzzy-tag">Close match</span>}
                </div>
                {song.artist && (
                  <div className="song-row-artist">{song.artist}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Draggable Divider */}
      <div
        className="split-divider"
        onMouseDown={handleMouseDown}
        title="Drag to resize pane"
        role="separator"
        aria-orientation="vertical"
      />

      {/* Right Pane: Selected Song Details */}
      <div className="split-pane-right">
        {selectedSong ? (
          <SongDetail song={selectedSong} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
            {searchResults.length === 0 ? 'No songs to display' : 'Select a song from the list to view details'}
          </div>
        )}
      </div>
    </div>
  );
};
