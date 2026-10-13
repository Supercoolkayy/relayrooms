import { PlateDoorLink, RoomDefinition, TOTAL_CELLS } from './types.js';

export function createRoomFromAscii(params: {
  id: number;
  name: string;
  rulesVersion: number;
  grid: string[]; // 8 strings of 8 chars each
  startA: [number, number]; // [x, y]
  startB: [number, number];
  objectiveA: [number, number];
  objectiveB: [number, number];
  exitA: [number, number];
  exitB: [number, number];
  links: {
    plate: [number, number];
    door: [number, number];
    initiallyOpen?: boolean;
  }[];
}): RoomDefinition {
  const walls: boolean[] = new Array(TOTAL_CELLS).fill(false);

  for (let y = 0; y < 8; y++) {
    const row = params.grid[y];
    for (let x = 0; x < 8; x++) {
      const char = row[x];
      const cell = y * 8 + x;
      if (char === '#') {
        walls[cell] = true;
      }
    }
  }

  const toCell = (pt: [number, number]) => pt[1] * 8 + pt[0];

  const plateDoorLinks: PlateDoorLink[] = params.links.map((link) => {
    const doorCell = toCell(link.door);
    walls[doorCell] = false; // Doors are dynamic obstacles, not static walls
    return {
      plateCell: toCell(link.plate),
      doorCell,
      initiallyOpen: link.initiallyOpen ?? false,
    };
  });

  return {
    id: params.id,
    name: params.name,
    rulesVersion: params.rulesVersion,
    startA: toCell(params.startA),
    startB: toCell(params.startB),
    objectiveA: toCell(params.objectiveA),
    objectiveB: toCell(params.objectiveB),
    exitA: toCell(params.exitA),
    exitB: toCell(params.exitB),
    walls,
    links: plateDoorLinks,
  };
}

/**
 * Room 1: The Switchback Relay
 * Top chamber (y=1..2) and Bottom chamber (y=4..5) divided by row 3 wall.
 * Door 1 is at (2,3) [cell 26], controlled by Plate 1 at (3,1) [cell 11].
 * Door 2 is at (5,3) [cell 29], controlled by Plate 2 at (3,5) [cell 43].
 * A must hold Plate 1 for B to cross UP; B must hold Plate 2 for A to cross DOWN.
 */
export const ROOM_1: RoomDefinition = createRoomFromAscii({
  id: 1,
  name: 'The Switchback Relay',
  rulesVersion: 1,
  grid: [
    '########', // 0
    '#......#', // 1: Start A at (1,1), Plate 1 at (3,1), Obj B at (5,1), Exit B at (6,1)
    '#......#', // 2
    '##.##.##', // 3: Door 1 at (2,3), Door 2 at (5,3)
    '#......#', // 4
    '#......#', // 5: Start B at (1,5), Plate 2 at (3,5), Obj A at (5,5), Exit A at (6,5)
    '#......#', // 6
    '########', // 7
  ],
  startA: [1, 1],       // cell 9
  startB: [1, 5],       // cell 41
  objectiveA: [5, 5],   // cell 45
  objectiveB: [5, 1],   // cell 13
  exitA: [6, 5],        // cell 46
  exitB: [6, 1],        // cell 14
  links: [
    {
      plate: [3, 1],    // (3,1) = cell 11
      door: [2, 3],     // (2,3) = cell 26
      initiallyOpen: false,
    },
    {
      plate: [3, 5],    // (3,5) = cell 43
      door: [5, 3],     // (5,3) = cell 29
      initiallyOpen: false,
    },
  ],
});

/**
 * Room 2: Double Cross
 * Two interlocking paths with narrow chokepoints.
 */
export const ROOM_2: RoomDefinition = createRoomFromAscii({
  id: 2,
  name: 'Double Cross',
  rulesVersion: 1,
  grid: [
    '########',
    '#..##..#',
    '#......#',
    '##.##.##',
    '##.##.##',
    '#......#',
    '#..##..#',
    '########',
  ],
  startA: [1, 1],
  startB: [6, 6],
  objectiveA: [6, 2],
  objectiveB: [1, 5],
  exitA: [6, 1],
  exitB: [1, 6],
  links: [
    {
      plate: [3, 2],
      door: [2, 3],
      initiallyOpen: false,
    },
    {
      plate: [4, 5],
      door: [5, 4],
      initiallyOpen: false,
    },
  ],
});

/**
 * Room 3: Synchronized Vault
 * Requires tight timing and passing through the central corridor.
 */
export const ROOM_3: RoomDefinition = createRoomFromAscii({
  id: 3,
  name: 'Synchronized Vault',
  rulesVersion: 1,
  grid: [
    '########',
    '#..#...#',
    '#..#...#',
    '#......#',
    '#......#',
    '#...#..#',
    '#...#..#',
    '########',
  ],
  startA: [1, 2],
  startB: [6, 5],
  objectiveA: [5, 1],
  objectiveB: [2, 6],
  exitA: [6, 1],
  exitB: [1, 6],
  links: [
    {
      plate: [1, 4],
      door: [3, 3],
      initiallyOpen: false,
    },
    {
      plate: [6, 3],
      door: [4, 4],
      initiallyOpen: false,
    },
  ],
});

export const ROOMS: RoomDefinition[] = [ROOM_1, ROOM_2, ROOM_3];
