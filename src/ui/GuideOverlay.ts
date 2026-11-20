import { GUIDE_CLOSE_MESSAGE, GUIDE_UNLOCK_AUDIO_MESSAGE } from '../platform/guideBridge';

export interface GuideOverlayOptions {
  onUnlockAudio?: () => void;
  onVisibilityChange?: (open: boolean) => void;
}

/**
 * Hosts bestiary/upgrade guide pages in a full-viewport overlay iframe so the main
 * document and its GameAudio instance stay mounted and music never stops or restarts.
 */
export class GuideOverlay {
  private iframe: HTMLIFrameElement | null = null;
  private abort = new AbortController();

  constructor(private host: HTMLElement, private options: GuideOverlayOptions = {}) {
    window.addEventListener('message', (event) => {
      if (!this.iframe || event.source !== this.iframe.contentWindow) return;
      const data = event.data as { type?: string } | null;
      if (!data || typeof data !== 'object') return;
      if (data.type === GUIDE_CLOSE_MESSAGE) this.close();
      else if (data.type === GUIDE_UNLOCK_AUDIO_MESSAGE) this.options.onUnlockAudio?.();
    }, { signal: this.abort.signal });
  }

  get isOpen(): boolean {
    return !this.host.hidden && this.iframe !== null;
  }

  open(url: string, title = '图鉴'): void {
    if (!this.iframe) {
      const frame = document.createElement('iframe');
      frame.title = title;
      frame.addEventListener('load', () => {
        frame.contentWindow?.focus();
      }, { signal: this.abort.signal });
      this.host.replaceChildren(frame);
      this.iframe = frame;
    } else {
      this.iframe.title = title;
    }
    this.host.hidden = false;
    this.iframe.src = url;
    this.options.onVisibilityChange?.(true);
  }

  close(): void {
    if (!this.iframe && this.host.hidden) return;
    if (this.iframe) {
      // Unload cleanly so the guide's Phaser scene and WebGL context are immediately released.
      this.iframe.src = 'about:blank';
      this.iframe.remove();
      this.iframe = null;
    }
    this.host.hidden = true;
    this.options.onVisibilityChange?.(false);
    window.focus();
  }

  destroy(): void {
    this.close();
    this.abort.abort();
  }
}
