import React, { useState } from 'react';
import { useStore } from '../hooks/useStore';
import { PlusIcon, MusicIcon, ListIcon, ChevronRightIcon } from './Icons';
import { formatKeyDisplay } from '../../shared/keys';
import { formatDisplayTitle, formatDisplayArtist } from '../../shared/formatters';
import { SongPickerModal } from './SongPickerModal';

export const HomeView: React.FC = () => {
  const {
    state,
    setActiveTab,
    setSelectedSongId,
    setSelectedSetlistEntryId,
    openSongModal,
  } = useStore();

  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const currentSetlist = state?.currentSetlist || [];
  const entries = [...currentSetlist].sort((a, b) => a.position - b.position);

  const recentSongs = (state?.preferences.recentSongIds || [])
    .map(id => state?.songs.find(s => s.id === id && s.deletedAt === null))
    .filter(Boolean);

  const handleOpenSong = (songId: string) => {
    setSelectedSongId(songId);
    setActiveTab('library');
  };

  const handleOpenSetlistEntry = (entryId: string) => {
    setSelectedSetlistEntryId(entryId);
    setActiveTab('setlist');
  };

  return (
    <div className="home-container" role="main" aria-label="Setlist Home">
      {/* Current Setlist Summary Card */}
      <section aria-labelledby="current-setlist-heading">
        <div className="home-section-title">
          <span id="current-setlist-heading" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ListIcon size={16} style={{ color: 'var(--accent-color)' }} />
            <span>Current Setlist</span>
            <span style={{ fontSize: '11px', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-muted)' }}>
              {entries.length} {entries.length === 1 ? 'song' : 'songs'}
            </span>
          </span>
          {entries.length > 0 && (
            <button
              className="btn btn-primary"
              style={{ height: '26px', padding: '0 10px', fontSize: '12px' }}
              onClick={() => setActiveTab('setlist')}
            >
              <span>Open Setlist</span>
              <ChevronRightIcon size={12} />
            </button>
          )}
        </div>

        {entries.length === 0 ? (
          <div style={{ padding: '20px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)' }}>Setlist is empty</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Add songs from your library to prepare a service running order.
              </div>
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
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-subtle)', padding: '12px 14px' }}>
            {/* Compact preview in service order */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {entries.slice(0, 5).map((entry, idx) => {
                const song = state?.songs.find(s => s.id === entry.songId);
                const title = song ? formatDisplayTitle(song.title) : 'Unknown Song';
                const artist = song ? formatDisplayArtist(song.artist) : '';

                return (
                  <div
                    key={entry.id}
                    onClick={() => handleOpenSetlistEntry(entry.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: 'var(--bg-primary)',
                      gap: '10px',
                    }}
                  >
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', width: '16px' }}>
                      {idx + 1}.
                    </span>
                    <span style={{ fontWeight: 500, fontSize: '13px', color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {title}
                    </span>
                    {artist ? (
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                        {artist}
                      </span>
                    ) : null}
                    {song?.musicalKey ? (
                      <span style={{ fontSize: '10.5px', background: 'var(--bg-tertiary)', padding: '1px 5px', borderRadius: '3px', color: 'var(--text-secondary)' }}>
                        {formatKeyDisplay(song.musicalKey)}
                      </span>
                    ) : null}
                  </div>
                );
              })}
              {entries.length > 5 && (
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '4px' }}>
                  + {entries.length - 5} more song{entries.length - 5 === 1 ? '' : 's'} in service order
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section aria-labelledby="quick-actions-heading">
        <h3 id="quick-actions-heading" className="home-section-title">Quick Actions</h3>
        <div className="quick-actions-grid">
          <div
            className="quick-action-card"
            onClick={() => openSongModal('create')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && openSongModal('create')}
          >
            <div className="quick-action-icon">
              <PlusIcon size={18} />
            </div>
            <div className="quick-action-text">
              <h4>Add New Song</h4>
              <p>Enter title, musical details, and notes (⌘N)</p>
            </div>
          </div>

          <div
            className="quick-action-card"
            onClick={() => setIsPickerOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setIsPickerOpen(true)}
          >
            <div className="quick-action-icon">
              <ListIcon size={18} />
            </div>
            <div className="quick-action-text">
              <h4>Add Songs to Setlist</h4>
              <p>Pick and arrange songs for this service</p>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Songs */}
      <section aria-labelledby="recent-songs-heading">
        <div className="home-section-title">
          <span id="recent-songs-heading">Recent Songs</span>
          {recentSongs.length > 0 && (
            <button className="btn" style={{ height: '24px', padding: '0 8px', fontSize: '11.5px' }} onClick={() => setActiveTab('library')}>
              View Library ({state?.songs.filter(s => s.deletedAt === null).length || 0})
            </button>
          )}
        </div>

        {recentSongs.length === 0 ? (
          <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
            No recent songs. Click "Add New Song" above to begin your library.
          </div>
        ) : (
          <div className="recents-grid">
            {recentSongs.map((song) => {
              const displayTitle = formatDisplayTitle(song!.title);
              const displayArtist = formatDisplayArtist(song!.artist);

              return (
                <div
                  key={song!.id}
                  className="recent-item-card"
                  onClick={() => handleOpenSong(song!.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleOpenSong(song!.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MusicIcon size={15} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '13.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {displayTitle}
                      </div>
                      {displayArtist ? (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {displayArtist}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    {song!.musicalKey ? (
                      <span style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px' }}>
                        Key: {formatKeyDisplay(song!.musicalKey)}
                      </span>
                    ) : null}
                    {song!.bpm ? (
                      <span style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px' }}>
                        BPM: {song!.bpm}
                      </span>
                    ) : null}
                    {song!.timeSignature ? (
                      <span style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px' }}>
                        {song!.timeSignature}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {isPickerOpen && (
        <SongPickerModal onClose={() => setIsPickerOpen(false)} />
      )}
    </div>
  );
};
