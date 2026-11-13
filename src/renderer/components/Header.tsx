import React, { useRef, useEffect } from 'react';
import { useStore } from '../hooks/useStore';
import { HomeIcon, MusicIcon, ListIcon, SearchIcon, PlusIcon, SettingsIcon, CloseIcon } from './Icons';

export const Header: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    openSongModal,
    setIsSettingsOpen,
    searchDetour,
    returnFromDetour,
  } = useStore();

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global shortcuts (Cmd+F, Cmd+N)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't hijack if user is typing in a textarea or input unless pressing Cmd+F
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (isCmdOrCtrl && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'n' && !e.shiftKey) {
        // Only trigger Cmd+N if not inside an active text input
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
  }, [openSongModal]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (q.trim() && activeTab !== 'library') {
      // Global search switches to library view
      setActiveTab('library');
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
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
          onClick={() => setActiveTab('home')}
        >
          <HomeIcon size={14} />
          <span>Home</span>
        </button>

        <button
          role="tab"
          id="tab-library"
          aria-selected={activeTab === 'library'}
          className={`nav-tab-btn ${activeTab === 'library' ? 'active' : ''}`}
          onClick={() => setActiveTab('library')}
        >
          <MusicIcon size={14} />
          <span>Library</span>
        </button>

        <button
          role="tab"
          id="tab-setlists"
          aria-selected={activeTab === 'setlists'}
          className={`nav-tab-btn ${activeTab === 'setlists' ? 'active' : ''}`}
          onClick={() => setActiveTab('setlists')}
        >
          <ListIcon size={14} />
          <span>Setlists</span>
        </button>
      </nav>

      {/* Global Search Input */}
      <div className="header-search" id="tour-search-container">
        <SearchIcon size={14} className="search-icon" />
        <input
          ref={searchInputRef}
          type="search"
          placeholder="Search library by title or artist (⌘F)"
          value={searchQuery}
          onChange={handleSearchChange}
          aria-label="Search active songs by title or artist"
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
      </div>

      {/* Action Buttons */}
      <div className="header-actions">
        {searchDetour && (
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
          title="Settings, Help & Backups"
          aria-label="Open Settings and Help"
        >
          <SettingsIcon size={15} />
        </button>
      </div>
    </header>
  );
};
