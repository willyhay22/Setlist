import React from 'react';
import { StoreProvider, useStore } from './hooks/useStore';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { LibraryView } from './components/LibraryView';
import { SetlistView } from './components/SetlistView';
import { SongFormModal } from './components/SongFormModal';
import { SettingsModal } from './components/SettingsModal';
import { RecentlyDeletedModal } from './components/RecentlyDeletedModal';
import { GuidedTour } from './components/GuidedTour';
import { UndoIcon } from './components/Icons';
import './styles/app.css';

const AppContent: React.FC = () => {
  const {
    activeTab,
    loading,
    searchDetourEntryId,
    returnFromDetour,
    undoToast,
    clearUndoToast,
    songModal,
    closeSongModal,
    isSettingsOpen,
    setIsSettingsOpen,
    settingsInitialTab,
    isRecentlyDeletedOpen,
    setIsRecentlyDeletedOpen,
    isTourOpen,
  } = useStore();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading Setlist…</div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Top Header */}
      <Header />

      {/* Search Detour Banner */}
      {searchDetourEntryId && activeTab === 'library' && (
        <div className="detour-banner">
          <span>Viewing search result while navigating your setlist.</span>
          <button
            className="btn btn-primary"
            style={{ height: '24px', padding: '0 8px', fontSize: '11.5px' }}
            onClick={returnFromDetour}
          >
            ← Back to Setlist
          </button>
        </div>
      )}

      {/* Main View Area */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {activeTab === 'home' && <HomeView />}
        {activeTab === 'library' && <LibraryView />}
        {activeTab === 'setlist' && <SetlistView />}
      </div>

      {/* Toast Undo Banner */}
      {undoToast && (
        <div className="toast-undo-container" role="status" aria-live="polite">
          <span>{undoToast.message}</span>
          <button
            className="btn btn-primary"
            style={{ height: '26px', padding: '0 10px', fontSize: '12px' }}
            onClick={async () => {
              await undoToast.onUndo();
              clearUndoToast();
            }}
          >
            <UndoIcon size={12} />
            <span>Undo</span>
          </button>
        </div>
      )}

      {/* Modals & In-Window Panels */}
      {songModal?.isOpen && (
        <SongFormModal
          mode={songModal.mode}
          song={songModal.song}
          onClose={closeSongModal}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          initialTab={settingsInitialTab}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {isRecentlyDeletedOpen && (
        <RecentlyDeletedModal
          onClose={() => setIsRecentlyDeletedOpen(false)}
        />
      )}

      {isTourOpen && <GuidedTour />}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
};

export default App;
