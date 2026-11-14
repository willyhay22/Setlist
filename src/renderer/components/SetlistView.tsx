import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../hooks/useStore';
import { SongDetail } from './SongDetail';
import { SongPickerModal } from './SongPickerModal';
import { formatDisplayTitle, formatDisplayArtist } from '../../shared/formatters';
import { formatSongRowMeta } from '../../shared/keys';
import { songNeedsChecking, getNeedsCheckingExplanation } from '../../shared/types';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  TrashIcon,
  DragHandleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from './Icons';

export const SetlistView: React.FC = () => {
  const {
    state,
    selectedSetlistEntryId,
    setSelectedSetlistEntryId,
    reorderCurrentSetlist,
    removeCurrentSetlistEntry,
    clearCurrentSetlist,
    prevSetlistSong,
    nextSetlistSong,
    updatePreferences,
  } = useStore();

  const [dividerWidth, setDividerWidth] = useState<number>(state?.preferences.dividerWidth || 340);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(dividerWidth);

  useEffect(() => {
    if (state?.preferences.dividerWidth) {
      setDividerWidth(state.preferences.dividerWidth);
    }
  }, [state?.preferences.dividerWidth]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = dividerWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const delta = moveEvent.clientX - startXRef.current;
      const newWidth = Math.max(240, Math.min(500, startWidthRef.current + delta));
      setDividerWidth(newWidth);
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      const delta = upEvent.clientX - startXRef.current;
      const finalWidth = Math.max(240, Math.min(500, startWidthRef.current + delta));
      setDividerWidth(finalWidth);
      updatePreferences({ dividerWidth: finalWidth });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [draggedEntryId, setDraggedEntryId] = useState<string | null>(null);
  const [justMovedId, setJustMovedId] = useState<string | null>(null);

  const currentSetlist = state?.currentSetlist || [];
  const entries = [...currentSetlist].sort((a, b) => a.position - b.position);

  // Auto-select first entry if none selected
  useEffect(() => {
    if (entries.length > 0) {
      const exists = entries.some(e => e.id === selectedSetlistEntryId);
      if (!selectedSetlistEntryId || !exists) {
        setSelectedSetlistEntryId(entries[0].id);
      }
    } else {
      setSelectedSetlistEntryId(null);
    }
  }, [entries.length, selectedSetlistEntryId]);

  const currentIndex = entries.findIndex(e => e.id === selectedSetlistEntryId);
  const currentEntry = currentIndex !== -1 ? entries[currentIndex] : null;
  const currentSong = currentEntry
    ? state?.songs.find(s => s.id === currentEntry.songId && s.deletedAt === null)
    : null;

  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex >= 0 && currentIndex < entries.length - 1;

  // Keyboard navigation shortcuts: Cmd+Opt+Left / Cmd+Opt+Right
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      const isAlt = e.altKey;

      if (isCmdOrCtrl && isAlt) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          prevSetlistSong();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          nextSetlistSong();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prevSetlistSong, nextSetlistSong]);

  // Accessible keyboard move up / move down
  const handleMoveEntry = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= entries.length) return;

    const newOrder = [...entries];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, moved);

    setJustMovedId(moved.id);
    setTimeout(() => setJustMovedId(null), 300);

    reorderCurrentSetlist(newOrder.map(e => e.id));
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedEntryId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedEntryId || draggedEntryId === targetId) return;

    const fromIdx = entries.findIndex(e => e.id === draggedEntryId);
    const toIdx = entries.findIndex(e => e.id === targetId);

    if (fromIdx !== -1 && toIdx !== -1) {
      const newOrder = [...entries];
      const [moved] = newOrder.splice(fromIdx, 1);
      newOrder.splice(toIdx, 0, moved);
      reorderCurrentSetlist(newOrder.map(e => e.id));
    }
  };

  const handleDragEnd = () => {
    setDraggedEntryId(null);
  };

  return (
    <div className="main-content" role="region" aria-label="Current Setlist">
      {/* Left Pane: Setlist Running Order */}
      <div className="split-pane-left" id="tour-setlist-order-pane" style={{ width: `${dividerWidth}px` }}>
        <div className="item-list-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Setlist
            </span>
            <span style={{ fontSize: '11px', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-muted)' }}>
              {entries.length}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className="btn"
              style={{ height: '24px', padding: '0 8px', fontSize: '11.5px' }}
              onClick={() => setIsPickerOpen(true)}
              title="Add songs to setlist"
            >
              <PlusIcon size={12} />
              <span>Add</span>
            </button>

            <button
              className="btn"
              style={{ height: '24px', padding: '0 8px', fontSize: '11.5px', color: 'var(--danger-color)' }}
              onClick={clearCurrentSetlist}
              disabled={entries.length === 0}
              title="Clear current setlist (songs stay in library)"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Setlist Step Navigation Bar */}
        <div className="setlist-nav-bar" id="tour-setlist-step-nav">
          <div style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>
            {entries.length === 0 ? 'Empty Setlist' : `Song ${currentIndex + 1} of ${entries.length}`}
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className="btn"
              style={{ height: '24px', padding: '0 8px', fontSize: '11.5px' }}
              onClick={prevSetlistSong}
              disabled={!canGoPrevious}
              title="Previous song (⌘⌥←)"
            >
              <ChevronLeftIcon size={12} />
              <span>Prev</span>
            </button>

            <button
              className="btn"
              style={{ height: '24px', padding: '0 8px', fontSize: '11.5px' }}
              onClick={nextSetlistSong}
              disabled={!canGoNext}
              title="Next song (⌘⌥→)"
            >
              <span>Next</span>
              <ChevronRightIcon size={12} />
            </button>
          </div>
        </div>

        {/* Entries list */}
        <div className="item-list-scroll">
          {entries.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>Setlist is empty</div>
              <div style={{ fontSize: '12px', marginBottom: '14px' }}>
                Add songs to build your service running order.
              </div>
              <button
                className="btn btn-primary"
                onClick={() => setIsPickerOpen(true)}
              >
                <PlusIcon size={13} />
                <span>Add Songs</span>
              </button>
            </div>
          ) : (
            entries.map((entry, idx) => {
              const song = state?.songs.find(s => s.id === entry.songId);
              const isSelected = entry.id === selectedSetlistEntryId;
              const displayTitle = song ? formatDisplayTitle(song.title) : 'Unknown Song';
              const displayArtist = song ? formatDisplayArtist(song.artist) : '';
              const metaText = song ? formatSongRowMeta(song) : '';
              const needsChecking = songNeedsChecking(song);
              const needsExplanation = getNeedsCheckingExplanation(song);

              return (
                <div
                  key={entry.id}
                  className={`setlist-entry-row ${isSelected ? 'selected' : ''} ${draggedEntryId === entry.id ? 'dragging' : ''} ${justMovedId === entry.id ? 'just-moved' : ''}`}
                  onClick={() => setSelectedSetlistEntryId(entry.id)}
                  draggable
                  onDragStart={(e) => handleDragStart(e, entry.id)}
                  onDragOver={(e) => handleDragOver(e, entry.id)}
                  onDragEnd={handleDragEnd}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedSetlistEntryId(entry.id)}
                >
                  <div className="setlist-drag-handle" title="Drag to reorder">
                    <DragHandleIcon size={13} />
                  </div>

                  <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)', width: '16px' }}>
                    {idx + 1}.
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="song-row-title">
                      {displayTitle}
                    </div>
                    {displayArtist ? (
                      <div className="song-row-artist">
                        {displayArtist}
                      </div>
                    ) : null}
                    {(metaText || needsChecking) && (
                      <div className="song-row-meta">
                        {metaText ? <span>{metaText}</span> : null}
                        {needsChecking ? (
                          <span
                            className="badge-needs-checking"
                            title={`Needs checking: ${needsExplanation}`}
                          >
                            Needs checking
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* Accessible move buttons & remove */}
                  <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                    <button
                      className="btn btn-icon"
                      style={{ width: '22px', height: '22px', border: 'none', background: 'transparent' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveEntry(idx, 'up');
                      }}
                      disabled={idx === 0}
                      title="Move Up"
                      aria-label={`Move ${displayTitle} up`}
                    >
                      <ArrowUpIcon size={11} />
                    </button>

                    <button
                      className="btn btn-icon"
                      style={{ width: '22px', height: '22px', border: 'none', background: 'transparent' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveEntry(idx, 'down');
                      }}
                      disabled={idx === entries.length - 1}
                      title="Move Down"
                      aria-label={`Move ${displayTitle} down`}
                    >
                      <ArrowDownIcon size={11} />
                    </button>

                    <button
                      className="btn btn-icon"
                      style={{ width: '22px', height: '22px', border: 'none', background: 'transparent', color: 'var(--text-muted)' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCurrentSetlistEntry(entry.id);
                      }}
                      title="Remove from setlist (with Undo)"
                      aria-label={`Remove ${displayTitle} from setlist`}
                    >
                      <TrashIcon size={11} />
                    </button>
                  </div>
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
        {currentSong ? (
          <SongDetail song={currentSong} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
            {entries.length === 0 ? 'Add songs to this setlist to begin' : 'Select a song from the left to view musical details'}
          </div>
        )}
      </div>

      {/* Multi-select library song picker */}
      {isPickerOpen && (
        <SongPickerModal
          onClose={() => setIsPickerOpen(false)}
        />
      )}
    </div>
  );
};
