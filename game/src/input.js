// Keyboard and mouse input for Turkey Trot.
// One clear job: turn raw DOM events into a small, testable state the world
// reads each tick — which directions are held, where the pointer is, and
// which buttons were just pressed.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();
    this.pointer = { x: 0, y: 0, down: false, clicked: false };
    this.pointerActive = false;
    this.onKey = null;
    this.onClick = null;
    this._onKeyDown = (event) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
        event.preventDefault();
      }
      if (!event.repeat) {
        this.keys.add(key);
        this.pressed.add(key);
        if (this.onKey) this.onKey(key);
      }
    };
    this._onKeyUp = (event) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      this.keys.delete(key);
    };
    this._onPointerMove = (event) => {
      const rect = this.canvas.getBoundingClientRect();
      this.pointer.x = ((event.clientX - rect.left) / rect.width) * this.canvas.width;
      this.pointer.y = ((event.clientY - rect.top) / rect.height) * this.canvas.height;
      this.pointerActive = true;
    };
    this._onPointerDown = (event) => {
      this._onPointerMove(event);
      this.pointer.down = true;
      this.pointer.clicked = true;
      if (this.onClick) this.onClick(this.pointer.x, this.pointer.y);
    };
    this._onPointerUp = () => {
      this.pointer.down = false;
    };
    this._onBlur = () => {
      this.keys.clear();
      this.pointer.down = false;
    };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    this.canvas.addEventListener('pointermove', this._onPointerMove);
    this.canvas.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointerup', this._onPointerUp);
  }

  /** True while the named key (lower-case) is held down. */
  held(...names) {
    return names.some((name) => this.keys.has(name));
  }

  /** True only on the tick the key was first pressed; consumed each tick. */
  wasPressed(...names) {
    return names.some((name) => this.pressed.has(name));
  }

  /** A unit-ish steering vector from the held arrow / WASD keys. */
  steerVector() {
    let x = 0;
    let y = 0;
    if (this.held('ArrowLeft', 'a')) x -= 1;
    if (this.held('ArrowRight', 'd')) x += 1;
    if (this.held('ArrowUp', 'w')) y -= 1;
    if (this.held('ArrowDown', 's')) y += 1;
    if (x !== 0 && y !== 0) {
      const length = Math.hypot(x, y);
      x /= length;
      y /= length;
    }
    return { x, y };
  }

  /** Clear the just-pressed set; called once per tick by the game loop. */
  endTick() {
    this.pressed.clear();
    this.pointer.clicked = false;
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
    this.canvas.removeEventListener('pointermove', this._onPointerMove);
    this.canvas.removeEventListener('pointerdown', this._onPointerDown);
    window.removeEventListener('pointerup', this._onPointerUp);
  }
}


/** True when the player pressed a "start / confirm" key this tick. */
export function isConfirmKey(input) {
  return input.wasPressed('Enter', ' ');
}
