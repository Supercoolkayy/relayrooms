import {
  Action,
  BOARD_SIZE,
  MAX_STEPS,
  RoomDefinition,
  SimulationResult,
  StepState,
  CharacterState,
} from './types.js';

export function getTargetCell(cell: number, action: Action): number {
  const x = cell % BOARD_SIZE;
  const y = Math.floor(cell / BOARD_SIZE);
  let nx = x;
  let ny = y;

  switch (action) {
    case Action.UP:
      ny -= 1;
      break;
    case Action.DOWN:
      ny += 1;
      break;
    case Action.LEFT:
      nx -= 1;
      break;
    case Action.RIGHT:
      nx += 1;
      break;
    case Action.WAIT:
    default:
      return cell;
  }

  if (nx < 0 || nx >= BOARD_SIZE || ny < 0 || ny >= BOARD_SIZE) {
    return cell; // blocked by grid boundary
  }

  return ny * BOARD_SIZE + nx;
}

export function computeDoorStates(
  room: RoomDefinition,
  charA: CharacterState,
  charB: CharacterState
): { openDoors: boolean[]; pressedPlates: boolean[] } {
  const openDoors: boolean[] = [];
  const pressedPlates: boolean[] = [];

  for (let i = 0; i < room.links.length; i++) {
    const link = room.links[i];
    // Only ACTIVE (unfinished) characters can press plates
    const platePressed =
      (!charA.finished && charA.cell === link.plateCell) ||
      (!charB.finished && charB.cell === link.plateCell);

    pressedPlates.push(platePressed);
    // Plate active inverts initial door state (e.g. normally closed becomes open)
    const isOpen = platePressed ? !link.initiallyOpen : link.initiallyOpen;
    openDoors.push(isOpen);
  }

  return { openDoors, pressedPlates };
}

export function simulateRoom(
  room: RoomDefinition,
  actionsA: Action[] | Uint8Array | number[],
  actionsB: Action[] | Uint8Array | number[],
  maxSteps: number = MAX_STEPS
): SimulationResult {
  const states: StepState[] = [];

  let charA: CharacterState = {
    cell: room.startA,
    hasObjective: room.startA === room.objectiveA,
    finished: false,
    finishStep: 0,
  };

  let charB: CharacterState = {
    cell: room.startB,
    hasObjective: room.startB === room.objectiveB,
    finished: false,
    finishStep: 0,
  };

  // Initial step 0 door and plate state
  let { openDoors, pressedPlates } = computeDoorStates(room, charA, charB);

  states.push({
    step: 0,
    charA: { ...charA },
    charB: { ...charB },
    openDoors: [...openDoors],
    pressedPlates: [...pressedPlates],
    actionA: Action.WAIT,
    actionB: Action.WAIT,
  });

  // Check if both start already on exit with objective (edge case)
  if (charA.hasObjective && charA.cell === room.exitA) {
    charA.finished = true;
    charA.finishStep = 0;
  }
  if (charB.hasObjective && charB.cell === room.exitB) {
    charB.finished = true;
    charB.finishStep = 0;
  }

  for (let step = 1; step <= maxSteps; step++) {
    if (charA.finished && charB.finished) {
      break;
    }

    const actionA = (step - 1 < actionsA.length ? actionsA[step - 1] : Action.WAIT) as Action;
    const actionB = (step - 1 < actionsB.length ? actionsB[step - 1] : Action.WAIT) as Action;

    // Doors for this step are the ones computed at the start of this step
    const currentOpenDoors = openDoors;

    // Movement helper
    const resolveMove = (currentCell: number, action: Action, isFinished: boolean): number => {
      if (isFinished) return currentCell;
      const target = getTargetCell(currentCell, action);
      if (target === currentCell) return currentCell;

      // Check walls
      if (room.walls[target]) {
        return currentCell; // blocked
      }

      // Check doors: if target is a door cell, must be open in currentOpenDoors
      for (let i = 0; i < room.links.length; i++) {
        if (room.links[i].doorCell === target) {
          if (!currentOpenDoors[i]) {
            return currentCell; // blocked by closed door
          }
        }
      }

      return target;
    };

    const nextCellA = resolveMove(charA.cell, actionA, charA.finished);
    const nextCellB = resolveMove(charB.cell, actionB, charB.finished);

    charA.cell = nextCellA;
    charB.cell = nextCellB;

    // Collect objectives
    if (!charA.hasObjective && charA.cell === room.objectiveA) {
      charA.hasObjective = true;
    }
    if (!charB.hasObjective && charB.cell === room.objectiveB) {
      charB.hasObjective = true;
    }

    // Check completion
    if (!charA.finished && charA.hasObjective && charA.cell === room.exitA) {
      charA.finished = true;
      charA.finishStep = step;
    }
    if (!charB.finished && charB.hasObjective && charB.cell === room.exitB) {
      charB.finished = true;
      charB.finishStep = step;
    }

    // Compute doors for NEXT step:
    // Important: Inactive (finished) characters no longer press plates
    const nextStates = computeDoorStates(room, charA, charB);
    openDoors = nextStates.openDoors;
    pressedPlates = nextStates.pressedPlates;

    states.push({
      step,
      charA: { ...charA },
      charB: { ...charB },
      openDoors: [...openDoors],
      pressedPlates: [...pressedPlates],
      actionA,
      actionB,
    });
  }

  const completed = charA.finished && charB.finished;
  const finishStepA = charA.finishStep;
  const finishStepB = charB.finishStep;
  const jointFinishingStep = Math.max(finishStepA, finishStepB);
  const sumFinishingSteps = finishStepA + finishStepB;
  const score = completed ? (jointFinishingStep << 8) | sumFinishingSteps : 0xffff;

  return {
    completed,
    finishStepA,
    finishStepB,
    jointFinishingStep,
    sumFinishingSteps,
    score,
    states,
  };
}
