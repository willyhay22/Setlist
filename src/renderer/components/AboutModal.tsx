import React, { useRef, useEffect } from 'react';
import { CloseIcon } from './Icons';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface AboutModalProps {
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal-dialog"
        style={{ maxWidth: '420px', textAlign: 'center' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-dialog-title"
        tabIndex={-1}
      >
        <div className="modal-header" style={{ justifyContent: 'flex-end', borderBottom: 'none', paddingBottom: 0 }}>
          <button className="btn btn-icon" onClick={onClose} title="Close" aria-label="Close dialog">
            <CloseIcon size={14} />
          </button>
        </div>

        <div className="modal-body" style={{ alignItems: 'center', paddingTop: '4px', paddingBottom: '24px' }}>
          {/* App Icon */}
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '15px',
              background: 'linear-gradient(180deg, #2a2e39 0%, #15171d 100%)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 8px 16px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
              overflow: 'hidden',
            }}
          >
            <svg width="40" height="40" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="220" y="240" width="584" height="540" rx="36" fill="#21252f" stroke="#ffffff" strokeWidth="6" strokeOpacity="0.12" transform="rotate(-3 512 510)"/>
              <rect x="220" y="240" width="584" height="540" rx="36" fill="#2a303c" stroke="#ffffff" strokeWidth="8" strokeOpacity="0.2"/>
              <ellipse cx="320" cy="400" rx="36" ry="26" fill="#38bdf8" transform="rotate(-20 320 400)"/>
              <ellipse cx="440" cy="360" rx="36" ry="26" fill="#38bdf8" transform="rotate(-20 440 360)"/>
              <rect x="344" y="250" width="12" height="150" rx="6" fill="#38bdf8"/>
              <rect x="464" y="210" width="12" height="150" rx="6" fill="#38bdf8"/>
              <polygon points="344,250 476,210 476,236 344,276" fill="#38bdf8"/>
              <rect x="268" y="470" width="488" height="64" rx="14" fill="#0f172a" stroke="#38bdf8" strokeWidth="4"/>
              <circle cx="300" cy="502" r="14" fill="#38bdf8"/>
              <rect x="334" y="492" width="220" height="14" rx="7" fill="#f8fafc"/>
              <rect x="268" y="552" width="488" height="60" rx="14" fill="#1e222d"/>
              <rect x="268" y="630" width="488" height="60" rx="14" fill="#1e222d"/>
            </svg>
          </div>

          <h3 id="about-dialog-title" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Setlist
          </h3>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Version 1.3.0 (Build 2026.11)
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
