import { useState, useEffect } from 'react';
import './PWAInstallPrompt.css';

export default function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Capture the browser's install prompt event
    const handler = (e) => {
      e.preventDefault();
      setInstallEvent(e);
      // Only show if user hasn't dismissed before
      const wasDismissed = sessionStorage.getItem('pwa-dismissed');
      if (!wasDismissed) setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstall() {
    if (!installEvent) return;
    installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
  }

  function handleDismiss() {
    setShowPrompt(false);
    setDismissed(true);
    sessionStorage.setItem('pwa-dismissed', 'true');
  }

  if (!showPrompt || dismissed) return null;

  return (
    <div className="pwa-prompt" role="dialog" aria-label="Install app">
      <div className="pwa-prompt-icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="4" />
          <circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="16" cy="16" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      </div>
      <div className="pwa-prompt-text">
        <div className="pwa-prompt-title">Install Machi Koro 2</div>
        <div className="pwa-prompt-desc">Play faster — add to your home screen</div>
      </div>
      <div className="pwa-prompt-actions">
        <button className="pwa-btn-install" onClick={handleInstall}>
          Install
        </button>
        <button className="pwa-btn-dismiss" onClick={handleDismiss}>
          Not now
        </button>
      </div>
    </div>
  );
}
