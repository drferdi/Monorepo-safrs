import * as migration_20260825_210540_initial from "./20260825_210540_initial";

export const migrations = [
  {
    up: migration_20260825_210540_initial.up,
    down: migration_20260825_210540_initial.down,
    name: "20260825_210540_initial",
  },
];
