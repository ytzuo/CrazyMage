import type { Direction } from '../config';

const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD']);
const ATTACK_KEYS = new Set(['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']);

/** Keyboard and captured pointers share one bounded movement vector. */
export class MovementInput {
  private keys = new Set<string>();
  private ultimatePress = false;
  private attackPress: Direction | null = null;
  private stick = { x: 0, y: 0 };
  private pointerId: number | null = null;
  private enabled = true;
  private abort = new AbortController();
  private media = window.matchMedia('(hover: none) and (pointer: coarse)');

  constructor(private joystick: HTMLElement, private knob: HTMLElement) {
    const options = { signal: this.abort.signal };
    window.addEventListener('keydown', this.onKeyDown, options);
    window.addEventListener('keyup', this.onKeyUp, options);
    window.addEventListener('blur', this.reset, options);
    joystick.addEventListener('pointerdown', this.onPointerDown, options);
    joystick.addEventListener('pointermove', this.onPointerMove, options);
    joystick.addEventListener('pointerup', this.onPointerEnd, options);
    joystick.addEventListener('pointercancel', this.onPointerEnd, options);
    joystick.addEventListener('lostpointercapture', this.resetStick, options);
    this.media.addEventListener('change', this.reset, options);
  }

  private isEditing(event: KeyboardEvent): boolean {
    const target = event.target;
    return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if ((!MOVE_KEYS.has(event.code) && !ATTACK_KEYS.has(event.code) && event.code !== 'KeyQ') || this.isEditing(event)) return;
    event.preventDefault();
    // A held key must be released and pressed again after pause or focus loss.
    if (event.repeat && !this.keys.has(event.code)) return;
    if (this.enabled) {
      if (event.code === 'KeyQ' && !event.repeat && !this.keys.has(event.code)) this.ultimatePress = true;
      this.keys.add(event.code);
      if (ATTACK_KEYS.has(event.code) && !event.repeat) this.attackPress = this.heldAttackDirection();
    }
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private onPointerDown = (event: PointerEvent): void => {
    if (!this.enabled || this.pointerId !== null || event.button !== 0) return;
    event.preventDefault();
    this.pointerId = event.pointerId;
    this.joystick.setPointerCapture(event.pointerId);
    this.updateStick(event);
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId === this.pointerId) this.updateStick(event);
  };

  private onPointerEnd = (event: PointerEvent): void => {
    if (event.pointerId === this.pointerId) this.resetStick();
  };

  private updateStick(event: PointerEvent): void {
    const bounds = this.joystick.getBoundingClientRect();
    const radius = bounds.width * 0.3;
    const dx = event.clientX - bounds.left - bounds.width / 2;
    const dy = event.clientY - bounds.top - bounds.height / 2;
    const length = Math.hypot(dx, dy);
    const scale = length > radius ? radius / length : 1;
    const x = dx * scale;
    const y = dy * scale;
    this.stick = length < 8 ? { x: 0, y: 0 } : { x: x / radius, y: y / radius };
    this.knob.style.transform = `translate(${x}px, ${y}px)`;
    this.joystick.classList.add('active');
  }

  private resetStick = (): void => {
    const pointerId = this.pointerId;
    this.pointerId = null;
    this.stick = { x: 0, y: 0 };
    this.knob.style.transform = '';
    this.joystick.classList.remove('active');
    if (pointerId !== null && this.joystick.hasPointerCapture(pointerId)) this.joystick.releasePointerCapture(pointerId);
  };

  reset = (): void => {
    this.keys.clear();
    this.attackPress = null;
    this.ultimatePress = false;
    this.resetStick();
  };

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.reset();
    this.joystick.setAttribute('aria-disabled', String(!enabled));
  }

  read(): { x: number; y: number } {
    if (!this.enabled) return { x: 0, y: 0 };
    const right = this.keys.has('KeyD');
    const left = this.keys.has('KeyA');
    const down = this.keys.has('KeyS');
    const up = this.keys.has('KeyW');
    const x = Number(right) - Number(left);
    const y = Number(down) - Number(up);
    if (x === 0 && y === 0) return { ...this.stick };
    const length = Math.hypot(x, y);
    return { x: x / length, y: y / length };
  }

  private heldAttackDirection(): Direction | null {
    const x = Number(this.keys.has('ArrowRight')) - Number(this.keys.has('ArrowLeft'));
    const y = Number(this.keys.has('ArrowDown')) - Number(this.keys.has('ArrowUp'));
    const length = Math.hypot(x, y);
    return length === 0 ? null : { x: x / length, y: y / length };
  }

  readAttack(): Direction | null {
    if (!this.enabled) return null;
    if ([...ATTACK_KEYS].some((key) => this.keys.has(key))) return this.heldAttackDirection();
    // Buffer a quick tap until the next available cast, even if it ends between frames.
    return this.attackPress;
  }

  consumeUltimate(): boolean {
    const pressed = this.enabled && this.ultimatePress;
    this.ultimatePress = false;
    return pressed;
  }

  get touchDevice(): boolean { return this.media.matches; }

  consumeAttack(): void {
    this.attackPress = null;
  }

  destroy(): void {
    this.reset();
    this.abort.abort();
  }
}
