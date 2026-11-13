import React, { useState, useEffect } from 'react';
import { Setlist, SetlistEntry } from '../../shared/types';
import { useStore } from '../hooks/useStore';
import { SongDetail } from './SongDetail';
import { SongPickerModal } from './SongPickerModal';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  TrashIcon,
  DragHandleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArchiveIcon,
  EditIcon,
} from './Icons';

interface SetlistDetailProps {
  setlist: Setlist;
}

export const SetlistDetail: React.FC<SetlistDetailProps> = ({ setlist }) => {
  const {
    state,
    selectedEntryId,
    setSelectedEntryId,
    openEditSetlistModal,
    setSetlistArchived,
    reorderSetlistEntries,
    removeSetlistEntry,
  } = useStore();

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [draggedEntryId, setDraggedEntryId] = useState<string | null>(null);

  // Get ordered entries for this setlist
  const entries: SetlistEntry[] = (state?.setlistEntries || [])
    .filter(e => e.setlistId === setlist.id)
    .sort((a, b) => a.position - b.position);

  // Auto-select first entry if none selected or if selected entry was removed
  useEffect(() => {
    if (entries.length > 0) {
      const exists = entries.some(e => e.id === selectedEntryId);
      if (!selectedEntryId || !exists) {
        setSelectedEntryId(entries[0].id);
      }
    } else {
      setSelectedEntryId(null);
    }
  }, [entries.length, selectedEntryId]);

  // Current entry and its index
  const currentIndex = entries.findIndex(e => e.id === selectedEntryId);
  const currentEntry = currentIndex !== -1 ? entries[currentIndex] : null;
  const currentSong = currentEntry
    ? state?.songs.find(s => s.id === currentEntry.songId && s.deletedAt === null)
    : null;

  // Previous & Next navigation
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex >= 0 && currentIndex < entries.length - 1;

  const handlePrevious = () => {
    if (canGoPrevious) {
      setSelectedEntryId(entries[currentIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      setSelectedEntryId(entries[currentIndex + 1].id);
    }
  };

  // Keyboard navigation shortcuts: Cmd+Opt+Left / Cmd+Opt+Right
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      const isAlt = e.altKey;

      if (isCmdOrCtrl && isAlt) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          if (canGoPrevious) {
            setSelectedEntryId(entries[currentIndex - 1].id);
          }
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (canGoNext) {
            setSelectedEntryId(entries[currentIndex + 1].id);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, entries, canGoPrevious, canGoNext]);

  // Accessible keyboard move up / move down
  const handleMoveEntry = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= entries.length) return;

    const newOrder = [...entries];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, moved);

    reorderSetlistEntries(setlist.id, newOrder.map(e => e.id));
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
      reorderSetlistEntries(setlist.id, newOrder.map(e => e.id));
    }
  };

  const handleDragEnd = () => {
    setDraggedEntryId(null);
  };

  return (
    <div className="main-content" role="region" aria-label={`Setlist: ${setlist.name}`}>
      {/* Left Pane: Setlist Running Order */}
      <div className="split-pane-left" style={{ width: '340px' }}>
        <div className="item-list-header">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {setlist.name}
            </div>
            {setlist.date && (
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                {setlist.date}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
            <button
              className="btn btn-icon"
              style={{ width: '26px', height: '26px' }}
              onClick={() => openEditSetlistModal(setlist)}
              title="Edit setlist details"
            >
              <EditIcon size={12} />
            </button>

            <button
              className="btn btn-icon"
              style={{ width: '26px', height: '26px' }}
              onClick={() => setSetlistArchived(setlist.id, !setlist.archived)}
              title={setlist.archived ? 'Restore Setlist to Active' : 'Archive Setlist'}
            >
              <ArchiveIcon size={12} />
            </button>
          </div>
        </div>

        {/* Setlist Navigation Bar: Previous / Next controls */}
        <div className="setlist-nav-bar">
          <div style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>
            {entries.length === 0 ? 'Empty Setlist' : `Song ${currentIndex + 1} of ${entries.length}`}
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className="btn"
              style={{ height: '24px', padding: '0 8px', fontSize: '11.5px' }}
              onClick={handlePrevious}
              disabled={!canGoPrevious}
              title="Previous song (⌘⌥←)"
            >
              <ChevronLeftIcon size={12} />
              <span>Prev</span>
            </button>

            <button
              className="btn"
              style={{ height: '24px', padding: '0 8px', fontSize: '11.5px' }}
              onClick={handleNext}
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
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div>This setlist has no songs yet.</div>
              <button
                className="btn btn-primary"
                style={{ marginTop: '12px' }}
                onClick={() => setIsPickerOpen(true)}
              >
                <PlusIcon size={13} />
                <span>Add Songs</span>
              </button>
            </div>
          ) : (
            entries.map((entry, idx) => {
              const song = state?.songs.find(s => s.id === entry.songId);
              const isSelected = entry.id === selectedEntryId;

              return (
                <div
                  key={entry.id}
                  className={`setlist-entry-row ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedEntryId(entry.id)}
                  draggable
                  onDragStart={(e) => handleDragStart(e, entry.id)}
                  onDragOver={(e) => handleDragOver(e, entry.id)}
                  onDragEnd={handleDragEnd}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedEntryId(entry.id)}
                >
                  <div className="setlist-drag-handle" title="Drag to reorder">
                    <DragHandleIcon size={13} />
                  </div>

                  <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)', width: '16px' }}>
                    {idx + 1}.
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {song?.title || 'Unknown Song'}
                    </div>
                    {song?.artist && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {song.artist}
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
                      aria-label={`Move ${song?.title || 'song'} up`}
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
                      aria-label={`Move ${song?.title || 'song'} down`}
                    >
                      <ArrowDownIcon size={11} />
                    </button>

                    <button
                      className="btn btn-icon"
                      style={{ width: '22px', height: '22px', border: 'none', background: 'transparent', color: 'var(--text-muted)' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSetlistEntry(entry.id);
                      }}
                      title="Remove from setlist (with Undo)"
                      aria-label={`Remove ${song?.title || 'song'} from setlist`}
                    >
                      <TrashIcon size={11} />
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {entries.length > 0 && (
            <div style={{ padding: '12px 14px' }}>
              <button
                className="btn"
                style={{ width: '100%' }}
                onClick={() => setIsPickerOpen(true)}
              >
                <PlusIcon size={13} />
                <span>Add More Songs</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Pane: Current Selected Song Details */}
      <div className="split-pane-right">
        {currentSong ? (
          <SongDetail song={currentSong} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
            {entries.length === 0 ? 'Add songs to this setlist to begin' : 'Select a song entry from the left to view musical details'}
          </div>
        )}
      </div>

      {/* Library song picker modal */}
      {isPickerOpen && (
        <SongPickerModal
          setlistId={setlist.id}
          onClose={() => setIsPickerOpen(false)}
        />
      )}
    </div>
  );
};
