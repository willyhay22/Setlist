import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  AppData,
  Song,
  CurrentSetlistEntry,
  AppPreferences,
  ImportResult,
  SongInput,
  TextSize,
} from '../../shared/types';
import { ElectronAPI } from '../../main/preload';

declare global {
  interface Window {
    api: ElectronAPI;
  }
}

interface UndoToastState {
  message: string;
  onUndo: () => Promise<void>;
  expiresAt: number;
}

interface StoreContextType {
  state: AppData | null;
  loading: boolean;
  activeTab: 'home' | 'library' | 'setlist';
  setActiveTab: (tab: 'home' | 'library' | 'setlist') => void;
  selectedSongId: string | null;
  setSelectedSongId: (id: string | null) => void;
  selectedSetlistEntryId: string | null;
  setSelectedSetlistEntryId: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchDetourEntryId: string | null;
  setSearchDetourEntryId: (id: string | null) => void;
  returnFromDetour: () => void;
  undoToast: UndoToastState | null;
  clearUndoToast: () => void;

  // Modals & Panels
  songModal: { isOpen: boolean; mode: 'create' | 'edit' | 'duplicate'; song?: Song } | null;
  openSongModal: (mode: 'create' | 'edit' | 'duplicate', song?: Song) => void;
  closeSongModal: () => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  settingsInitialTab: 'appearance' | 'library' | 'help';
  setSettingsInitialTab: (tab: 'appearance' | 'library' | 'help') => void;
  isRecentlyDeletedOpen: boolean;
  setIsRecentlyDeletedOpen: (open: boolean) => void;
  isTourOpen: boolean;
  setIsTourOpen: (open: boolean) => void;
  finishTour: () => Promise<void>;

  // Operations
  refreshState: () => Promise<void>;
  createSong: (input: SongInput) => Promise<{ song: Song; warning?: string }>;
  updateSongMetadata: (songId: string, input: Omit<SongInput, 'notes'>) => Promise<Song>;
  updateSongNotes: (songId: string, notes: string, clientUpdatedAt: number) => Promise<{ success: boolean; updatedAt: number }>;
  duplicateSong: (songId: string) => Promise<Song>;
  deleteSong: (songId: string) => Promise<void>;
  restoreSong: (songId: string) => Promise<Song>;

  // Current Setlist Operations
  addSongToCurrentSetlist: (songId: string) => Promise<CurrentSetlistEntry>;
  addMultipleSongsToCurrentSetlist: (songIds: string[]) => Promise<CurrentSetlistEntry[]>;
  reorderCurrentSetlist: (orderedEntryIds: string[]) => Promise<void>;
  removeCurrentSetlistEntry: (entryId: string) => Promise<void>;
  clearCurrentSetlist: () => Promise<void>;
  prevSetlistSong: () => void;
  nextSetlistSong: () => void;

  updatePreferences: (prefs: Partial<AppPreferences>) => Promise<AppPreferences>;
  exportBackup: () => Promise<{ cancelled: boolean; filePath?: string; error?: string }>;
  importBackup: (options: { importPreferences?: boolean }) => Promise<{ cancelled: boolean; result?: ImportResult; error?: string }>;
}

const StoreContext = createContext<StoreContextType | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'library' | 'setlist'>('home');
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [selectedSetlistEntryId, setSelectedSetlistEntryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDetourEntryId, setSearchDetourEntryId] = useState<string | null>(null);
  const [undoToast, setUndoToast] = useState<UndoToastState | null>(null);

  const [songModal, setSongModal] = useState<{ isOpen: boolean; mode: 'create' | 'edit' | 'duplicate'; song?: Song } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'appearance' | 'library' | 'help'>('appearance');
  const [isRecentlyDeletedOpen, setIsRecentlyDeletedOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);

  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const refreshState = useCallback(async () => {
    if (!window.api) return;
    try {
      const data = await window.api.getState();
      setState(data);
    } catch (err) {
      console.error('Failed to get state from main process:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (window.api) {
        try {
          const initial = await window.api.getState();
          if (mounted) {
            setState(initial);
            setLoading(false);

            // First run tour only if tour not previously completed
            if (!initial.preferences.hasCompletedTour) {
              setIsTourOpen(true);
            }
          }
        } catch (e) {
          console.error('Error loading initial state:', e);
          if (mounted) setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Theme & text size
  useEffect(() => {
    if (!state) return;
    document.body.setAttribute('data-text-size', state.preferences.textSize || 'standard');

    const themePref = state.preferences.theme || 'system';
    if (themePref === 'system') {
      window.api?.getSystemTheme().then((sysTheme) => {
        document.documentElement.setAttribute('data-theme', sysTheme);
      });
    } else {
      document.documentElement.setAttribute('data-theme', themePref);
    }
  }, [state?.preferences.textSize, state?.preferences.theme]);

  // System theme changes
  useEffect(() => {
    if (!window.api?.onSystemThemeChanged) return;
    const unsubscribe = window.api.onSystemThemeChanged((newTheme) => {
      if (state?.preferences.theme === 'system') {
        document.documentElement.setAttribute('data-theme', newTheme);
      }
    });
    return unsubscribe;
  }, [state?.preferences.theme]);

  // Safe window close confirmation
  useEffect(() => {
    if (!window.api?.onRequestClose) return;
    const unsubscribe = window.api.onRequestClose(async () => {
      if (songModal?.isOpen) {
        const confirmClose = window.confirm('You have an unsaved song form. Discard changes and quit?');
        window.api.respondCanClose(confirmClose);
        return;
      }
      try {
        await window.api.flushPendingSaves();
        window.api.respondCanClose(true);
      } catch (err: any) {
        alert(`Failed to save pending changes: ${err.message}. Changes retained.`);
        window.api.respondCanClose(false);
      }
    });
    return unsubscribe;
  }, [songModal]);

  const clearUndoToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setUndoToast(null);
  }, []);

  const triggerUndoToast = useCallback((message: string, onUndo: () => Promise<void>) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setUndoToast({
      message,
      onUndo,
      expiresAt: Date.now() + 6000,
    });
    toastTimerRef.current = setTimeout(() => {
      setUndoToast(null);
      toastTimerRef.current = null;
    }, 6000);
  }, []);

  // Song operations
  const createSong = useCallback(async (input: SongInput) => {
    const res = await window.api.createSong(input);
    await refreshState();
    setSelectedSongId(res.song.id);
    setActiveTab('library');
    return res;
  }, [refreshState]);

  const updateSongMetadata = useCallback(async (songId: string, input: Omit<SongInput, 'notes'>) => {
    const updated = await window.api.updateSongMetadata(songId, input);
    await refreshState();
    return updated;
  }, [refreshState]);

  const updateSongNotes = useCallback(async (songId: string, notes: string, clientUpdatedAt: number) => {
    const res = await window.api.updateSongNotes(songId, notes, clientUpdatedAt);
    if (res.success) {
      setState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          songs: prev.songs.map((s) => (s.id === songId ? { ...s, notes, updatedAt: res.updatedAt } : s)),
        };
      });
    }
    return res;
  }, []);

  const duplicateSong = useCallback(async (songId: string) => {
    const copy = await window.api.duplicateSong(songId);
    await refreshState();
    setSelectedSongId(copy.id);
    setActiveTab('library');
    return copy;
  }, [refreshState]);

  const deleteSong = useCallback(async (songId: string) => {
    await window.api.deleteSong(songId);
    await refreshState();
    if (selectedSongId === songId) {
      setSelectedSongId(null);
    }
  }, [refreshState, selectedSongId]);

  const restoreSong = useCallback(async (songId: string) => {
    const restored = await window.api.restoreSong(songId);
    await refreshState();
    setSelectedSongId(restored.id);
    return restored;
  }, [refreshState]);

  // Current Setlist operations
  const addSongToCurrentSetlist = useCallback(async (songId: string) => {
    const entry = await window.api.addSongToCurrentSetlist(songId);
    await refreshState();
    setSelectedSetlistEntryId(entry.id);
    return entry;
  }, [refreshState]);

  const addMultipleSongsToCurrentSetlist = useCallback(async (songIds: string[]) => {
    const entries = await window.api.addMultipleSongsToCurrentSetlist(songIds);
    await refreshState();
    if (entries.length > 0) {
      setSelectedSetlistEntryId(entries[entries.length - 1].id);
    }
    return entries;
  }, [refreshState]);

  const reorderCurrentSetlist = useCallback(async (orderedEntryIds: string[]) => {
    setState((prev) => {
      if (!prev) return prev;
      const entryMap = new Map(prev.currentSetlist.map(e => [e.id, e]));
      const reordered: CurrentSetlistEntry[] = [];
      orderedEntryIds.forEach((id, idx) => {
        const found = entryMap.get(id);
        if (found) {
          reordered.push({ ...found, position: idx });
        }
      });
      return { ...prev, currentSetlist: reordered };
    });
    await window.api.reorderCurrentSetlist(orderedEntryIds);
    await refreshState();
  }, [refreshState]);

  const removeCurrentSetlistEntry = useCallback(async (entryId: string) => {
    const { removedEntry, formerPosition } = await window.api.removeCurrentSetlistEntry(entryId);
    await refreshState();

    triggerUndoToast('Removed from setlist', async () => {
      await window.api.restoreCurrentSetlistEntry(removedEntry, formerPosition);
      await refreshState();
      setSelectedSetlistEntryId(removedEntry.id);
    });
  }, [refreshState, triggerUndoToast]);

  const clearCurrentSetlist = useCallback(async () => {
    if (!state || state.currentSetlist.length === 0) return;
    const confirmClear = window.confirm('Clear the current setlist? Your songs will stay in the library.');
    if (!confirmClear) return;

    const { formerEntries } = await window.api.clearCurrentSetlist();
    await refreshState();
    setSelectedSetlistEntryId(null);

    triggerUndoToast('Setlist cleared', async () => {
      await window.api.restoreClearedSetlist(formerEntries);
      await refreshState();
    });
  }, [state, refreshState, triggerUndoToast]);

  const prevSetlistSong = useCallback(() => {
    if (!state || state.currentSetlist.length === 0) return;
    const entries = [...state.currentSetlist].sort((a, b) => a.position - b.position);
    const currentIndex = entries.findIndex(e => e.id === selectedSetlistEntryId);
    if (currentIndex > 0) {
      setSelectedSetlistEntryId(entries[currentIndex - 1].id);
    }
  }, [state, selectedSetlistEntryId]);

  const nextSetlistSong = useCallback(() => {
    if (!state || state.currentSetlist.length === 0) return;
    const entries = [...state.currentSetlist].sort((a, b) => a.position - b.position);
    const currentIndex = entries.findIndex(e => e.id === selectedSetlistEntryId);
    if (currentIndex >= 0 && currentIndex < entries.length - 1) {
      setSelectedSetlistEntryId(entries[currentIndex + 1].id);
    }
  }, [state, selectedSetlistEntryId]);

  const returnFromDetour = useCallback(() => {
    setActiveTab('setlist');
    if (searchDetourEntryId) {
      setSelectedSetlistEntryId(searchDetourEntryId);
    }
    setSearchDetourEntryId(null);
    setSearchQuery('');
  }, [searchDetourEntryId]);

  const updatePreferences = useCallback(async (prefs: Partial<AppPreferences>) => {
    const res = await window.api.updatePreferences(prefs);
    await refreshState();
    return res;
  }, [refreshState]);

  const finishTour = useCallback(async () => {
    await updatePreferences({ hasCompletedTour: true });
    setIsTourOpen(false);
  }, [updatePreferences]);

  const exportBackup = useCallback(async () => {
    return window.api.exportBackup();
  }, []);

  const importBackup = useCallback(async (options: { importPreferences?: boolean }) => {
    const res = await window.api.importBackup(options);
    if (!res.cancelled && res.result?.success) {
      await refreshState();
    }
    return res;
  }, [refreshState]);

  const openSongModal = useCallback((mode: 'create' | 'edit' | 'duplicate', song?: Song) => {
    setSongModal({ isOpen: true, mode, song });
  }, []);

  const closeSongModal = useCallback(() => {
    setSongModal(null);
  }, []);

  // Listen to native macOS menu triggers
  useEffect(() => {
    if (!window.api?.onMenuAction) return;
    const unsubscribe = window.api.onMenuAction((action, payload) => {
      switch (action) {
        case 'new-song':
          if (!songModal?.isOpen) {
            openSongModal('create');
          }
          break;
        case 'open-settings':
          setSettingsInitialTab('appearance');
          setIsSettingsOpen(true);
          break;
        case 'open-shortcuts':
          setSettingsInitialTab('help');
          setIsSettingsOpen(true);
          break;
        case 'open-help':
          setSettingsInitialTab('help');
          setIsSettingsOpen(true);
          break;
        case 'replay-tour':
          setIsSettingsOpen(false);
          setIsTourOpen(true);
          break;
        case 'close-window-or-modal':
          if (songModal?.isOpen) {
            closeSongModal();
          } else if (isSettingsOpen) {
            setIsSettingsOpen(false);
          } else if (isRecentlyDeletedOpen) {
            setIsRecentlyDeletedOpen(false);
          } else {
            // Close window -> triggers quit
            window.api?.flushPendingSaves().then(() => window.api.respondCanClose(true));
          }
          break;
        case 'nav-home':
          setActiveTab('home');
          break;
        case 'nav-library':
          setActiveTab('library');
          break;
        case 'nav-setlist':
          setActiveTab('setlist');
          break;
        case 'set-text-size':
          if (payload) {
            updatePreferences({ textSize: payload as TextSize });
          }
          break;
        case 'add-selected-to-setlist':
          if (selectedSongId) {
            addSongToCurrentSetlist(selectedSongId);
          }
          break;
        case 'prev-song':
          prevSetlistSong();
          break;
        case 'next-song':
          nextSetlistSong();
          break;
        case 'clear-setlist':
          clearCurrentSetlist();
          break;
        case 'trigger-export':
          exportBackup();
          break;
        case 'trigger-import':
          setSettingsInitialTab('library');
          setIsSettingsOpen(true);
          break;
      }
    });
    return unsubscribe;
  }, [
    songModal,
    isSettingsOpen,
    isRecentlyDeletedOpen,
    openSongModal,
    closeSongModal,
    selectedSongId,
    addSongToCurrentSetlist,
    prevSetlistSong,
    nextSetlistSong,
    clearCurrentSetlist,
    exportBackup,
    updatePreferences,
  ]);

  return (
    <StoreContext.Provider
      value={{
        state,
        loading,
        activeTab,
        setActiveTab,
        selectedSongId,
        setSelectedSongId,
        selectedSetlistEntryId,
        setSelectedSetlistEntryId,
        searchQuery,
        setSearchQuery,
        searchDetourEntryId,
        setSearchDetourEntryId,
        returnFromDetour,
        undoToast,
        clearUndoToast,
        songModal,
        openSongModal,
        closeSongModal,
        isSettingsOpen,
        setIsSettingsOpen,
        settingsInitialTab,
        setSettingsInitialTab,
        isRecentlyDeletedOpen,
        setIsRecentlyDeletedOpen,
        isTourOpen,
        setIsTourOpen,
        finishTour,
        refreshState,
        createSong,
        updateSongMetadata,
        updateSongNotes,
        duplicateSong,
        deleteSong,
        restoreSong,
        addSongToCurrentSetlist,
        addMultipleSongsToCurrentSetlist,
        reorderCurrentSetlist,
        removeCurrentSetlistEntry,
        clearCurrentSetlist,
        prevSetlistSong,
        nextSetlistSong,
        updatePreferences,
        exportBackup,
        importBackup,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export function useStore(): StoreContextType {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
