import * as migration_20260825_210540_initial from './20260825_210540_initial';
import * as migration_20260826_035752_cinematic_layer from './20260826_035752_cinematic_layer';
import * as migration_20260827_120000_name_endures_key from './20260827_120000_name_endures_key';

export const migrations = [
  {
    up: migration_20260825_210540_initial.up,
    down: migration_20260825_210540_initial.down,
    name: '20260825_210540_initial',
  },
  {
    up: migration_20260826_035752_cinematic_layer.up,
    down: migration_20260826_035752_cinematic_layer.down,
    name: '20260826_035752_cinematic_layer'
  },
  {
    up: migration_20260827_120000_name_endures_key.up,
    down: migration_20260827_120000_name_endures_key.down,
    name: '20260827_120000_name_endures_key'
  },
];
