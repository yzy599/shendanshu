export enum GestureState {
  NONE = 'NONE',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  POINTING = 'POINTING',
  VICTORY = 'VICTORY'
}

export interface ParticleConfig {
  color: string;
  particleCount: number;
}

export interface AppState {
  gesture: GestureState;
  fps: number;
  config: ParticleConfig;
}