import themeUrl from '../game/audio/media/music/unstable_mage_theme.m4a?url';
import { isGuideReturnHref } from './shell';

export const GUIDE_CLOSE_MESSAGE = 'mage:close-guide';
export const GUIDE_UNLOCK_AUDIO_MESSAGE = 'mage:unlock-audio';
export { isGuideReturnHref };

export function isEmbeddedGuide(): boolean {
  try {
    return typeof window !== 'undefined' && window.parent !== window;
  } catch {
    return false;
  }
}

export function requestCloseEmbeddedGuide(): boolean {
  if (!isEmbeddedGuide()) return false;
  window.parent.postMessage({ type: GUIDE_CLOSE_MESSAGE }, '*');
  return true;
}

/**
 * Keeps menu music continuous across guide pages:
 * - Embedded inside index.html overlay: parent GameAudio keeps playing uninterrupted;
 *   return links close the overlay without reloading index.html.
 * - Opened directly in a standalone tab: plays the looping theme locally.
 */
export function setupGuidePage(): () => void {
  const abort = new AbortController();
  const signal = abort.signal;
  const embedded = isEmbeddedGuide();
  let standaloneMusic: HTMLAudioElement | null = null;

  if (embedded) {
    document.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (!anchor || !isGuideReturnHref(anchor.getAttribute('href'))) return;
      event.preventDefault();
      requestCloseEmbeddedGuide();
    }, { signal });

    let forwardedUnlock = false;
    const forwardUnlock = () => {
      if (forwardedUnlock) return;
      forwardedUnlock = true;
      window.parent.postMessage({ type: GUIDE_UNLOCK_AUDIO_MESSAGE }, '*');
    };
    window.addEventListener('pointerdown', forwardUnlock, { signal, capture: true });
    window.addEventListener('keydown', forwardUnlock, { signal, capture: true });
  } else {
    let muted = false;
    try { muted = localStorage.getItem('mage-sfx-muted') === 'true'; } catch { /* Optional storage. */ }
    const music = new Audio();
    music.preload = 'none';
    music.volume = 0.16;
    music.muted = muted;
    music.loop = true;
    standaloneMusic = music;

    const start = () => {
      if (!standaloneMusic || standaloneMusic.muted || !standaloneMusic.paused) return;
      if (!standaloneMusic.src) standaloneMusic.src = themeUrl;
      void standaloneMusic.play().catch(() => { /* Retry on next user gesture. */ });
    };
    window.addEventListener('pointerdown', start, { signal, capture: true });
    window.addEventListener('keydown', start, { signal, capture: true });
    start();
  }

  return () => {
    abort.abort();
    if (standaloneMusic) {
      standaloneMusic.pause();
      standaloneMusic.removeAttribute('src');
      standaloneMusic.load();
      standaloneMusic = null;
    }
  };
}
