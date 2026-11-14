import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../hooks/useStore';
import { HomeIcon, MusicIcon, ListIcon, SearchIcon, PlusIcon, SettingsIcon, CloseIcon, CheckIcon } from './Icons';
import { searchSongs } from '../../shared/search';
import { formatDisplayTitle, formatDisplayArtist } from '../../shared/formatters';
import { formatSongRowMeta } from '../../shared/keys';
import { songNeedsChecking, getNeedsCheckingExplanation } from '../../shared/types';

export const Header: React.FC = () => {
  const {
    state,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    setSelectedSongId,
    addSongToCurrentSetlist,
    openSongModal,
    setIsSettingsOpen,
    searchDetourEntryId,
    returnFromDetour,
    selectedSetlistEntryId,
    setSearchDetourEntryId,
  } = useStore();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [addedSongId, setAddedSongId] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const allSongs = state?.songs || [];
  const searchResults = searchSongs(allSongs, searchQuery);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setIsPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (isCmdOrCtrl && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        if (activeTab !== 'library' && searchQuery.trim()) {
          setIsPopoverOpen(true);
        }
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'n' && !e.shiftKey) {
        const target = e.target as HTMLElement;
        const isEditingText = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
        if (!isEditingText) {
          e.preventDefault();
          openSongModal('create');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openSongModal, activeTab, searchQuery]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    setFocusedIndex(-1);

    if (activeTab !== 'library') {
      // On Home or Setlist, show anchored results popover without switching tabs!
      setIsPopoverOpen(Boolean(q.trim()));
    }
  };

  const handleSearchFocus = () => {
    if (activeTab !== 'library' && searchQuery.trim()) {
      setIsPopoverOpen(true);
    }
  };

  const handleSelectSong = (songId: string) => {
    if (activeTab === 'setlist') {
      // Record detour context so "Back to Setlist" restores exact prior place
      setSearchDetourEntryId(selectedSetlistEntryId);
    }
    setSelectedSongId(songId);
    setActiveTab('library');
    setIsPopoverOpen(false);
  };

  const handleAddSongToSetlist = async (e: React.MouseEvent, songId: string) => {
    e.stopPropagation();
    await addSongToCurrentSetlist(songId);
    setAddedSongId(songId);
    setTimeout(() => {
      setAddedSongId(null);
    }, 1200);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsPopoverOpen(false);
      searchInputRef.current?.blur();
      return;
    }

    if (activeTab === 'library' || !isPopoverOpen || searchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < searchResults.length) {
        handleSelectSong(searchResults[focusedIndex].song.id);
      } else if (searchResults.length > 0) {
        handleSelectSong(searchResults[0].song.id);
      }
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsPopoverOpen(false);
    searchInputRef.current?.focus();
  };

  return (
    <header className="top-header" role="banner">
      {/* Navigation tabs */}
      <nav className="nav-tabs" role="tablist" aria-label="Main Navigation">
        <button
          role="tab"
          id="tab-home"
          aria-selected={activeTab === 'home'}
          className={`nav-tab-btn ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => {
            setIsPopoverOpen(false);
            setActiveTab('home');
          }}
        >
          <HomeIcon size={14} />
          <span>Home</span>
        </button>

        <button
          role="tab"
          id="tab-library"
          aria-selected={activeTab === 'library'}
          className={`nav-tab-btn ${activeTab === 'library' ? 'active' : ''}`}
          onClick={() => {
            setIsPopoverOpen(false);
            setActiveTab('library');
          }}
        >
          <MusicIcon size={14} />
          <span>Library</span>
        </button>

        <button
          role="tab"
          id="tab-setlist"
          aria-selected={activeTab === 'setlist'}
          className={`nav-tab-btn ${activeTab === 'setlist' ? 'active' : ''}`}
          onClick={() => {
            setIsPopoverOpen(false);
            setActiveTab('setlist');
          }}
        >
          <ListIcon size={14} />
          <span>Setlist</span>
        </button>
      </nav>

      {/* Global Search Input with Anchored Popover */}
      <div className="header-search" id="tour-search-container" style={{ position: 'relative' }}>
        <SearchIcon size={14} className="search-icon" />
        <input
          ref={searchInputRef}
          type="search"
          placeholder="Search library (⌘F)"
          value={searchQuery}
          onChange={handleSearchChange}
          onFocus={handleSearchFocus}
          onKeyDown={handleKeyDown}
          aria-label="Search active songs by title or artist"
          aria-expanded={isPopoverOpen}
        />
        {searchQuery && (
          <button
            className="clear-search-btn"
            onClick={clearSearch}
            title="Clear search"
            aria-label="Clear search query"
          >
            <CloseIcon size={12} />
          </button>
        )}

        {/* Anchored Suggestions Popover (Active on Home or Setlist) */}
        {isPopoverOpen && activeTab !== 'library' && (
          <div className="search-popover" ref={popoverRef} role="listbox">
            {searchResults.length === 0 ? (
              <div style={{ padding: '12px 14px', fontSize: '12.5px', color: 'var(--text-muted)', textAlign: 'center' }}>
                No songs found
              </div>
            ) : (
              searchResults.map(({ song, isFuzzy }, idx) => {
                const isFocused = idx === focusedIndex;
                const isJustAdded = addedSongId === song.id;
                const displayTitle = formatDisplayTitle(song.title);
                const displayArtist = formatDisplayArtist(song.artist);
                const metaText = formatSongRowMeta(song);
                const needsChecking = songNeedsChecking(song);
                const needsExplanation = getNeedsCheckingExplanation(song);

                return (
                  <div
                    key={song.id}
                    className={`search-popover-item ${isFocused ? 'focused' : ''}`}
                    onClick={() => handleSelectSong(song.id)}
                    role="option"
                    aria-selected={isFocused}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="song-row-title">
                        {displayTitle}
                        {isFuzzy && <span className="fuzzy-tag">Close match</span>}
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

                    <button
                      className="btn"
                      style={{
                        height: '24px',
                        padding: '0 8px',
                        fontSize: '11px',
                        flexShrink: 0,
                        background: isJustAdded ? 'var(--success-bg)' : undefined,
                        color: isJustAdded ? 'var(--success-color)' : undefined,
                        borderColor: isJustAdded ? 'var(--success-color)' : undefined,
                      }}
                      onClick={(e) => handleAddSongToSetlist(e, song.id)}
                      title="Add to current setlist without switching pages"
                    >
                      {isJustAdded ? <CheckIcon size={11} /> : <PlusIcon size={11} />}
                      <span>{isJustAdded ? 'Added' : 'Add to Setlist'}</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="header-actions">
        {searchDetourEntryId && activeTab === 'library' && (
          <button
            className="btn btn-primary"
            onClick={returnFromDetour}
            title="Return to Setlist navigation"
          >
            Back to Setlist
          </button>
        )}

        <button
          id="tour-add-song-btn"
          className="btn btn-primary"
          onClick={() => openSongModal('create')}
          title="Add a new song (⌘N)"
          aria-label="Add a new song"
        >
          <PlusIcon size={14} />
          <span>Add Song</span>
        </button>

        <button
          id="tour-settings-btn"
          className="btn btn-icon"
          onClick={() => setIsSettingsOpen(true)}
          title="Settings & Help (⌘,)"
          aria-label="Open Settings"
        >
          <SettingsIcon size={15} />
        </button>
      </div>
    </header>
  );
};
