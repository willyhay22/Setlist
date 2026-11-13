import React from 'react';
import { useStore } from '../hooks/useStore';
import { PlusIcon, MusicIcon, ListIcon } from './Icons';
import { formatKeyDisplay } from '../../shared/keys';

export const HomeView: React.FC = () => {
  const {
    state,
    setActiveTab,
    setSelectedSongId,
    setSelectedSetlistId,
    openSongModal,
    openNewSetlistModal,
  } = useStore();

  const recentSongs = (state?.preferences.recentSongIds || [])
    .map(id => state?.songs.find(s => s.id === id && s.deletedAt === null))
    .filter(Boolean);

  const recentSetlists = (state?.preferences.recentSetlistIds || [])
    .map(id => state?.setlists.find(sl => sl.id === id && !sl.archived))
    .filter(Boolean);

  const handleOpenSong = (songId: string) => {
    setSelectedSongId(songId);
    setActiveTab('library');
  };

  const handleOpenSetlist = (setlistId: string) => {
    setSelectedSetlistId(setlistId);
    setActiveTab('setlists');
  };

  return (
    <div className="home-container" role="main" aria-label="Studio Songs Home">
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
              <p>Enter title, musical details, and notes</p>
            </div>
          </div>

          <div
            className="quick-action-card"
            onClick={openNewSetlistModal}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && openNewSetlistModal()}
          >
            <div className="quick-action-icon">
              <ListIcon size={18} />
            </div>
            <div className="quick-action-text">
              <h4>Create Setlist</h4>
              <p>Organise an ordered set for services or rehearsals</p>
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
            {recentSongs.map((song) => (
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
                      {song!.title}
                    </div>
                    {song!.artist && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {song!.artist}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  {song!.musicalKey && (
                    <span style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px' }}>
                      Key: {formatKeyDisplay(song!.musicalKey)}
                    </span>
                  )}
                  {song!.bpm && (
                    <span style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px' }}>
                      BPM: {song!.bpm}
                    </span>
                  )}
                  {song!.timeSignature && (
                    <span style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px' }}>
                      {song!.timeSignature}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Setlists */}
      <section aria-labelledby="recent-setlists-heading">
        <div className="home-section-title">
          <span id="recent-setlists-heading">Recent Setlists</span>
          {recentSetlists.length > 0 && (
            <button className="btn" style={{ height: '24px', padding: '0 8px', fontSize: '11.5px' }} onClick={() => setActiveTab('setlists')}>
              View All Setlists ({state?.setlists.filter(sl => !sl.archived).length || 0})
            </button>
          )}
        </div>

        {recentSetlists.length === 0 ? (
          <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
            No recent setlists. Click "Create Setlist" to build a song order.
          </div>
        ) : (
          <div className="recents-grid">
            {recentSetlists.map((sl) => {
              const entryCount = state?.setlistEntries.filter(e => e.setlistId === sl!.id).length || 0;
              return (
                <div
                  key={sl!.id}
                  className="recent-item-card"
                  onClick={() => handleOpenSetlist(sl!.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleOpenSetlist(sl!.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ListIcon size={15} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '13.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sl!.name}
                      </div>
                      {sl!.date && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {sl!.date}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ marginTop: '8px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    {entryCount} {entryCount === 1 ? 'song' : 'songs'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
