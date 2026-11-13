import React, { useState, useEffect, useRef } from 'react';
import { Setlist, SetlistInput } from '../../shared/types';
import { useStore } from '../hooks/useStore';
import { CloseIcon } from './Icons';

interface SetlistFormModalProps {
  setlist?: Setlist | null;
  onClose: () => void;
}

export const SetlistFormModal: React.FC<SetlistFormModalProps> = ({ setlist, onClose }) => {
  const { createSetlist, updateSetlist } = useStore();

  const [name, setName] = useState(setlist?.name || '');
  const [date, setDate] = useState(setlist?.date || '');
  const [notes, setNotes] = useState(setlist?.notes || '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameInputRef.current?.focus();
    nameInputRef.current?.select();
  }, []);

  const isDirty = () => {
    if (!setlist) {
      return Boolean(name.trim() || date || notes.trim());
    }
    return name.trim() !== setlist.name || date !== setlist.date || notes !== setlist.notes;
  };

  const handleCancel = () => {
    if (isDirty()) {
      if (window.confirm('Discard entered changes?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [name, date, notes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage('Setlist name is required.');
      nameInputRef.current?.focus();
      return;
    }

    try {
      if (setlist) {
        await updateSetlist(setlist.id, {
          name: trimmedName,
          date,
          notes,
        });
      } else {
        await createSetlist({
          name: trimmedName,
          date,
          notes,
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save setlist');
    }
  };

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="setlist-form-title"
      >
        <div className="modal-header">
          <h3 id="setlist-form-title">
            {setlist ? 'Edit Setlist Details' : 'Create New Setlist'}
          </h3>
          <button className="btn btn-icon" onClick={handleCancel} title="Close (Esc)" aria-label="Close dialog">
            <CloseIcon size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errorMessage && (
              <div style={{ background: 'var(--danger-bg)', color: 'var(--danger-color)', padding: '8px 12px', borderRadius: '6px', fontSize: '12.5px' }}>
                {errorMessage}
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="setlist-name-input">
                Setlist Name <span style={{ color: 'var(--danger-color)' }}>*</span>
              </label>
              <input
                id="setlist-name-input"
                ref={nameInputRef}
                type="text"
                className="form-input"
                placeholder="e.g. Sunday Morning Worship"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="setlist-date-input">
                Scheduled Date (optional)
              </label>
              <input
                id="setlist-date-input"
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="setlist-notes-input">
                Service Notes / Running Order (optional)
              </label>
              <textarea
                id="setlist-notes-input"
                className="form-textarea"
                rows={3}
                placeholder="Band cues, scripture readings, prayer transition points…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn" onClick={handleCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {setlist ? 'Save Changes' : 'Create Setlist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
