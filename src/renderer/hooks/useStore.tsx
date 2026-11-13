import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  AppData,
  Song,
  Setlist,
  SetlistEntry,
  AppPreferences,
  ImportResult,
  SongInput,
  SetlistInput,
  TextSize,
  ThemePreference,
} from '../../shared/types';
import { ElectronAPI } from '../../main/preload';

declare global {
  interface Window {
    api: ElectronAPI;
  }
}

interface DetourContext {
  setlistId: string;
  entryId: string;
}

interface UndoToastState {
  message: string;
  onUndo: () => Promise<void>;
  expiresAt: number;
}

interface StoreContextType {
  state: AppData | null;
  loading: boolean;
  activeTab: 'home' | 'library' | 'setlists';
  setActiveTab: (tab: 'home' | 'library' | 'setlists') => void;
  selectedSongId: string | null;
  setSelectedSongId: (id: string | null) => void;
  selectedSetlistId: string | null;
  setSelectedSetlistId: (id: string | null) => void;
  selectedEntryId: string | null;
  setSelectedEntryId: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchDetour: DetourContext | null;
  setSearchDetour: (ctx: DetourContext | null) => void;
  returnFromDetour: () => void;
  undoToast: UndoToastState | null;
  clearUndoToast: () => void;

  // Modals
  songModal: { isOpen: boolean; mode: 'create' | 'edit' | 'duplicate'; song?: Song } | null;
  openSongModal: (mode: 'create' | 'edit' | 'duplicate', song?: Song) => void;
  closeSongModal: () => void;
  isSetlistModalOpen: boolean;
  editingSetlist: Setlist | null;
  openNewSetlistModal: () => void;
  openEditSetlistModal: (setlist: Setlist) => void;
  closeSetlistModal: () => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
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
  createSetlist: (input: SetlistInput) => Promise<Setlist>;
  updateSetlist: (setlistId: string, input: SetlistInput) => Promise<Setlist>;
  setSetlistArchived: (setlistId: string, archived: boolean) => Promise<Setlist>;
  addSongToSetlist: (setlistId: string, songId: string) => Promise<SetlistEntry>;
  addMultipleSongsToSetlist: (setlistId: string, songIds: string[]) => Promise<SetlistEntry[]>;
  reorderSetlistEntries: (setlistId: string, orderedEntryIds: string[]) => Promise<void>;
  removeSetlistEntry: (entryId: string) => Promise<void>;
  updatePreferences: (prefs: Partial<AppPreferences>) => Promise<AppPreferences>;
  exportBackup: () => Promise<{ cancelled: boolean; filePath?: string; error?: string }>;
  importBackup: (options: { importPreferences?: boolean }) => Promise<{ cancelled: boolean; result?: ImportResult; error?: string }>;
}

const StoreContext = createContext<StoreContextType | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'library' | 'setlists'>('home');
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [selectedSetlistId, setSelectedSetlistId] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDetour, setSearchDetour] = useState<DetourContext | null>(null);
  const [undoToast, setUndoToast] = useState<UndoToastState | null>(null);

  const [songModal, setSongModal] = useState<{ isOpen: boolean; mode: 'create' | 'edit' | 'duplicate'; song?: Song } | null>(null);
  const [isSetlistModalOpen, setIsSetlistModalOpen] = useState(false);
  const [editingSetlist, setEditingSetlist] = useState<Setlist | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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

            // First run tour
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

  // Apply theme & text size to document body
  useEffect(() => {
    if (!state) return;

    // Apply text size
    document.body.setAttribute('data-text-size', state.preferences.textSize || 'standard');

    // Apply theme
    const themePref = state.preferences.theme || 'system';
    if (themePref === 'system') {
      window.api?.getSystemTheme().then((sysTheme) => {
        document.documentElement.setAttribute('data-theme', sysTheme);
      });
    } else {
      document.documentElement.setAttribute('data-theme', themePref);
    }
  }, [state?.preferences.textSize, state?.preferences.theme]);

  // Listen to OS theme changes
  useEffect(() => {
    if (!window.api?.onSystemThemeChanged) return;
    const unsubscribe = window.api.onSystemThemeChanged((newTheme) => {
      if (state?.preferences.theme === 'system') {
        document.documentElement.setAttribute('data-theme', newTheme);
      }
    });
    return unsubscribe;
  }, [state?.preferences.theme]);

  // Handle window close confirmation & save flush
  useEffect(() => {
    if (!window.api?.onRequestClose) return;
    const unsubscribe = window.api.onRequestClose(async () => {
      // Check if dirty form is open
      if (songModal?.isOpen) {
        const confirmClose = window.confirm('You have an unsaved song form. Discard changes and quit?');
        window.api.respondCanClose(confirmClose);
        return;
      }
      // Flush pending note saves and close safely
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

  // Undo toast expiration
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

  // Setlist operations
  const createSetlist = useCallback(async (input: SetlistInput) => {
    const sl = await window.api.createSetlist(input);
    await refreshState();
    setSelectedSetlistId(sl.id);
    setActiveTab('setlists');
    return sl;
  }, [refreshState]);

  const updateSetlist = useCallback(async (setlistId: string, input: SetlistInput) => {
    const updated = await window.api.updateSetlist(setlistId, input);
    await refreshState();
    return updated;
  }, [refreshState]);

  const setSetlistArchived = useCallback(async (setlistId: string, archived: boolean) => {
    const updated = await window.api.setSetlistArchived(setlistId, archived);
    await refreshState();
    return updated;
  }, [refreshState]);

  const addSongToSetlist = useCallback(async (setlistId: string, songId: string) => {
    const entry = await window.api.addSongToSetlist(setlistId, songId);
    await refreshState();
    setSelectedEntryId(entry.id);
    return entry;
  }, [refreshState]);

  const addMultipleSongsToSetlist = useCallback(async (setlistId: string, songIds: string[]) => {
    const entries = await window.api.addMultipleSongsToSetlist(setlistId, songIds);
    await refreshState();
    return entries;
  }, [refreshState]);

  const reorderSetlistEntries = useCallback(async (setlistId: string, orderedEntryIds: string[]) => {
    // Optimistic local update
    setState((prev) => {
      if (!prev) return prev;
      const updatedEntries = [...prev.setlistEntries];
      orderedEntryIds.forEach((id, idx) => {
        const found = updatedEntries.find((e) => e.id === id && e.setlistId === setlistId);
        if (found) found.position = idx;
      });
      return { ...prev, setlistEntries: updatedEntries };
    });
    await window.api.reorderSetlistEntries(setlistId, orderedEntryIds);
    await refreshState();
  }, [refreshState]);

  const removeSetlistEntry = useCallback(async (entryId: string) => {
    const { removedEntry, formerPosition } = await window.api.removeSetlistEntry(entryId);
    await refreshState();

    triggerUndoToast('Removed from setlist', async () => {
      await window.api.restoreSetlistEntry(removedEntry, formerPosition);
      await refreshState();
      setSelectedEntryId(removedEntry.id);
    });
  }, [refreshState, triggerUndoToast]);

  const returnFromDetour = useCallback(() => {
    if (!searchDetour) return;
    setActiveTab('setlists');
    setSelectedSetlistId(searchDetour.setlistId);
    setSelectedEntryId(searchDetour.entryId);
    setSearchDetour(null);
    setSearchQuery('');
  }, [searchDetour]);

  // Preferences & backups
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

  const openNewSetlistModal = useCallback(() => {
    setEditingSetlist(null);
    setIsSetlistModalOpen(true);
  }, []);

  const openEditSetlistModal = useCallback((setlist: Setlist) => {
    setEditingSetlist(setlist);
    setIsSetlistModalOpen(true);
  }, []);

  const closeSetlistModal = useCallback(() => {
    setEditingSetlist(null);
    setIsSetlistModalOpen(false);
  }, []);

  return (
    <StoreContext.Provider
      value={{
        state,
        loading,
        activeTab,
        setActiveTab,
        selectedSongId,
        setSelectedSongId,
        selectedSetlistId,
        setSelectedSetlistId,
        selectedEntryId,
        setSelectedEntryId,
        searchQuery,
        setSearchQuery,
        searchDetour,
        setSearchDetour,
        returnFromDetour,
        undoToast,
        clearUndoToast,
        songModal,
        openSongModal,
        closeSongModal,
        isSetlistModalOpen,
        editingSetlist,
        openNewSetlistModal,
        openEditSetlistModal,
        closeSetlistModal,
        isSettingsOpen,
        setIsSettingsOpen,
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
        createSetlist,
        updateSetlist,
        setSetlistArchived,
        addSongToSetlist,
        addMultipleSongsToSetlist,
        reorderSetlistEntries,
        removeSetlistEntry,
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
