import React from 'react';
import { CloseIcon, MusicIcon } from './Icons';

interface AboutModalProps {
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-dialog"
        style={{ maxWidth: '420px', textAlign: 'center' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-dialog-title"
      >
        <div className="modal-header" style={{ justifyContent: 'flex-end', borderBottom: 'none', paddingBottom: 0 }}>
          <button className="btn btn-icon" onClick={onClose} title="Close" aria-label="Close dialog">
            <CloseIcon size={14} />
          </button>
        </div>

        <div className="modal-body" style={{ alignItems: 'center', paddingTop: '4px', paddingBottom: '24px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'var(--accent-light)',
              color: 'var(--accent-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
            }}
          >
            <MusicIcon size={28} />
          </div>

          <h3 id="about-dialog-title" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Setlist
          </h3>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Version 1.2.0 (Build 2026.11)
          </div>

          <div style={{ marginTop: '20px', fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>
            © 2026 William Hay
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={onClose} style={{ minWidth: '90px' }}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
