import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../hooks/useStore';
import { SongDetail } from './SongDetail';
import { searchSongs } from '../../shared/search';
import { formatDisplayTitle, formatDisplayArtist } from '../../shared/formatters';

export const LibraryView: React.FC = () => {
  const {
    state,
    selectedSongId,
    setSelectedSongId,
    searchQuery,
    updatePreferences,
  } = useStore();

  const [dividerWidth, setDividerWidth] = useState<number>(state?.preferences.dividerWidth || 320);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(dividerWidth);

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
      const newWidth = Math.max(220, Math.min(520, startWidthRef.current + delta));
      setDividerWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
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
          <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Songs ({searchResults.length})
          </span>
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
                  <div style={{ fontSize: '12px' }}>Use + Add Song in the toolbar or ⌘N to add your first song.</div>
                </div>
              )}
            </div>
          ) : (
            searchResults.map(({ song, isFuzzy }) => {
              const displayTitle = formatDisplayTitle(song.title);
              const displayArtist = formatDisplayArtist(song.artist);

              return (
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
                    {displayTitle}
                    {isFuzzy && <span className="fuzzy-tag">Close match</span>}
                  </div>
                  {displayArtist ? (
                    <div className="song-row-artist">{displayArtist}</div>
                  ) : null}
                </div>
              );
            })
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
