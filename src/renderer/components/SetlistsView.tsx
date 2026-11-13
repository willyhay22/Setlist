import React, { useState } from 'react';
import { useStore } from '../hooks/useStore';
import { SetlistDetail } from './SetlistDetail';
import { PlusIcon, ListIcon, ArchiveIcon } from './Icons';

export const SetlistsView: React.FC = () => {
  const {
    state,
    selectedSetlistId,
    setSelectedSetlistId,
    openNewSetlistModal,
  } = useStore();

  const [viewArchived, setViewArchived] = useState(false);

  const activeSetlists = (state?.setlists || []).filter(sl => !sl.archived);
  const archivedSetlists = (state?.setlists || []).filter(sl => sl.archived);
  const displayedSetlists = viewArchived ? archivedSetlists : activeSetlists;

  // Selected setlist
  const selectedSetlist = (state?.setlists || []).find(sl => sl.id === selectedSetlistId);

  // If a setlist is selected, show SetlistDetail
  if (selectedSetlist) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
        {/* Setlist header back navigation */}
        <div style={{ height: '36px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', padding: '0 14px', gap: '8px', fontSize: '12px' }}>
          <button
            className="btn"
            style={{ height: '24px', padding: '0 8px', fontSize: '11.5px' }}
            onClick={() => setSelectedSetlistId(null)}
          >
            ← All Setlists
          </button>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedSetlist.name}</span>
          {selectedSetlist.archived && (
            <span style={{ fontSize: '10px', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-muted)' }}>
              Archived
            </span>
          )}
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <SetlistDetail setlist={selectedSetlist} />
        </div>
      </div>
    );
  }

  return (
    <div className="home-container" role="region" aria-label="Setlists">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className={`btn ${!viewArchived ? 'btn-primary' : ''}`}
            onClick={() => setViewArchived(false)}
          >
            Active Setlists ({activeSetlists.length})
          </button>
          <button
            className={`btn ${viewArchived ? 'btn-primary' : ''}`}
            onClick={() => setViewArchived(true)}
          >
            <ArchiveIcon size={13} />
            <span>Archived ({archivedSetlists.length})</span>
          </button>
        </div>

        <button className="btn btn-primary" onClick={openNewSetlistModal}>
          <PlusIcon size={14} />
          <span>New Setlist</span>
        </button>
      </div>

      {displayedSetlists.length === 0 ? (
        <div style={{ padding: '36px 16px', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
          <div style={{ fontWeight: 600, marginBottom: '6px' }}>
            {viewArchived ? 'No archived setlists' : 'No active setlists'}
          </div>
          <div style={{ fontSize: '12.5px', marginBottom: '16px' }}>
            {viewArchived
              ? 'Archived setlists will appear here when you archive them.'
              : 'Create a setlist to organize songs for a worship service, rehearsal, or event.'}
          </div>
          {!viewArchived && (
            <button className="btn btn-primary" onClick={openNewSetlistModal}>
              <PlusIcon size={13} />
              <span>Create Setlist</span>
            </button>
          )}
        </div>
      ) : (
        <div className="recents-grid">
          {displayedSetlists.map((sl) => {
            const entryCount = (state?.setlistEntries || []).filter(e => e.setlistId === sl.id).length;
            return (
              <div
                key={sl.id}
                className="recent-item-card"
                onClick={() => setSelectedSetlistId(sl.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedSetlistId(sl.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ListIcon size={15} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sl.name}
                    </div>
                    {sl.date && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {sl.date}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  <span>{entryCount} {entryCount === 1 ? 'song' : 'songs'}</span>
                  <span style={{ color: 'var(--accent-color)', fontWeight: 500 }}>Open →</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
