export enum Action {
  WAIT = 0,
  UP = 1,
  DOWN = 2,
  LEFT = 3,
  RIGHT = 4,
}

export const MAX_STEPS = 24;
export const BOARD_SIZE = 8;
export const TOTAL_CELLS = 64;

export interface PlateDoorLink {
  plateCell: number; // 0..63
  doorCell: number;  // 0..63
  initiallyOpen: boolean;
}

export interface RoomDefinition {
  id: number;
  name: string;
  rulesVersion: number;
  startA: number;
  startB: number;
  objectiveA: number;
  objectiveB: number;
  exitA: number;
  exitB: number;
  walls: boolean[]; // 64 booleans (or bitmask)
  links: PlateDoorLink[];
}

export interface CharacterState {
  cell: number;
  hasObjective: boolean;
  finished: boolean;
  finishStep: number; // 0 if not finished, 1..24 when finished
}

export interface StepState {
  step: number; // 0 is initial state, 1..24
  charA: CharacterState;
  charB: CharacterState;
  openDoors: boolean[]; // indexed by link index
  pressedPlates: boolean[]; // indexed by link index
  actionA: Action;
  actionB: Action;
}

export interface SimulationResult {
  completed: boolean;
  finishStepA: number;
  finishStepB: number;
  jointFinishingStep: number; // max(finishStepA, finishStepB)
  sumFinishingSteps: number;   // finishStepA + finishStepB
  score: number;              // (jointFinishingStep << 8) | sumFinishingSteps
  states: StepState[];        // history of all states from step 0 to final step
}
