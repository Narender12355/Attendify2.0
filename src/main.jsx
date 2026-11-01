import './index.css';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { App } from './App.jsx';

createRoot(document.getElementById('root')).render(<App />);

// Installable web app (PWA): not needed inside the native Android wrapper.
if ('serviceWorker' in navigator && location.protocol === 'https:' && !Capacitor.isNativePlatform()) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
