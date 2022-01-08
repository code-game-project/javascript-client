/* TypeScript definitions for @code-game-project/snake-server */

/**
 * Events that can be `emit`ed to the server.
 */
export type SendableSnakeEvents = Spawn | Despawn | MoveForward | Turn | ChangeColor;

export interface Spawn {
  event_name: 'spawn';
}

export interface Despawn {
  event_name: 'despawn';
}

export interface MoveForward {
  event_name: 'move_forward';
}

export interface Turn {
  event_name: 'turn',
  direction: 'left' | 'right';
}

export interface ChangeColor {
  event_name: 'change_color',
  color: number;
}

/**
 * Events that can trigger actions when received.
 */
export type ReceiveableSnakeEvents = SnakeDetails | ChangedColor;

export interface SnakeDetails {
  event_name: 'snake_details',
  color: number,
  covered_squares: { x: number, y: number; }[];
}

export interface ChangedColor {
  event_name: 'changed_color',
  color: number,
}
