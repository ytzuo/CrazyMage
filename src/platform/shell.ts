interface TauriInternals {
  invoke?: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
}

declare global {
  interface Window {
    __TAURI_INTERNALS__?: TauriInternals;
    __mageHandleBack?: () => boolean;
  }
}

export interface ShellKeyLike {
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  repeat?: boolean;
}

export interface AppShellOptions {
  onBack?: () => boolean;
  isProduction?: boolean;
}

const ZOOM_KEYS = new Set(['Equal', 'Minus', 'Digit0', 'NumpadAdd', 'NumpadSubtract', 'Numpad0']);

export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && typeof window.__TAURI_INTERNALS__ === 'object' && window.__TAURI_INTERNALS__ !== null;
}

/** Block browser-only shortcuts (reload/zoom/history) inside production native shells without touching gameplay keys. */
export function shouldBlockBrowserShortcut(event: ShellKeyLike, inNativeShell: boolean, isProduction: boolean): boolean {
  if (!inNativeShell || !isProduction) return false;
  if (event.code === 'F5') return true;
  if ((event.ctrlKey || event.metaKey) && (event.code === 'KeyR' || ZOOM_KEYS.has(event.code))) return true;
  if (event.altKey && !event.ctrlKey && !event.metaKey && (event.code === 'ArrowLeft' || event.code === 'ArrowRight')) return true;
  return false;
}

export function toggleWindowFullscreen(): void {
  const invoke = window.__TAURI_INTERNALS__?.invoke;
  if (typeof invoke === 'function') {
    void invoke('toggle_fullscreen').catch(() => {});
    return;
  }
  if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  else void document.documentElement.requestFullscreen?.().catch(() => {});
}

export function setupAppShell(options: AppShellOptions = {}): () => void {
  const abort = new AbortController();
  const signal = abort.signal;
  const nativeShell = isTauriRuntime();
  const isProduction = options.isProduction ?? !import.meta.env.DEV;

  if (nativeShell && isProduction) {
    window.addEventListener('contextmenu', (event) => event.preventDefault(), { signal });
  }

  window.addEventListener('keydown', (event) => {
    if (event.code === 'F11' && !event.repeat) {
      event.preventDefault();
      toggleWindowFullscreen();
      return;
    }
    if (shouldBlockBrowserShortcut(event, nativeShell, isProduction)) {
      event.preventDefault();
    }
  }, { signal });

  const previousBack = window.__mageHandleBack;
  window.__mageHandleBack = () => options.onBack?.() ?? false;

  return () => {
    abort.abort();
    if (previousBack) window.__mageHandleBack = previousBack;
    else delete window.__mageHandleBack;
  };
}
