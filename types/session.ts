export type SchemaVersion = '1.1';

export type StageId = 'warmup' | 'main' | 'cooldown';

export type BlockType =
  | 'flow'
  | 'straight_sets'
  | 'circuit_rounds'
  | 'circuit_time'
  | 'superset'
  | 'emom';

export type MovementType =
  | 'strength'
  | 'conditioning'
  | 'mobility'
  | 'patterning'
  | 'breathing'
  | 'recovery'
  | 'other';

export type SideMode = 'both' | 'left' | 'right' | 'per_side';
export type WeightUnit = 'kg' | 'lb';
export type BandStyle = 'loop' | 'flat' | 'tube' | 'mini' | 'other';

export interface SessionDefinition {
  schema_version: SchemaVersion;
  session_id: string;
  title: string;
  /** Multi-line optional summary of what the session targets (goals, focus, equipment); validated by session JSON schema. */
  description?: string;
  tags?: string[];
  duration_minutes?: number;
  notes?: string;
  stages: Stage[];
}

export interface Stage {
  stage_id: StageId;
  title: string;
  notes?: string;
  sections?: Section[];
  blocks?: Block[];
}

export interface Section {
  section_id: string;
  title: string;
  notes?: string;
  rest_after_section_seconds?: number;
  blocks: Block[];
}

export interface BlockBase {
  block_id: string;
  block_type: BlockType;
  title: string;
  notes?: string;
}

export interface FlowBlock extends BlockBase {
  block_type: 'flow';
  rounds?: number;
  time_cap_seconds?: number;
  rest_between_rounds_seconds?: number;
  exercises: Exercise[];
}

export interface StraightSetsBlock extends BlockBase {
  block_type: 'straight_sets';
  sets: number;
  rest_between_sets_seconds?: number;
  exercises: Exercise[];
}

export interface CircuitRoundsBlock extends BlockBase {
  block_type: 'circuit_rounds';
  rounds: number;
  rest_between_rounds_seconds?: number;
  exercises: Exercise[];
}

export interface CircuitTimeBlock extends BlockBase {
  block_type: 'circuit_time';
  duration_seconds: number;
  rest_as_needed?: boolean;
  exercises: Exercise[];
}

export interface SupersetBlock extends BlockBase {
  block_type: 'superset';
  sets: number;
  rest_between_sets_seconds?: number;
  exercise_pairs: [Exercise, Exercise][];
}

export interface EmomBlock extends BlockBase {
  block_type: 'emom';
  minutes: number;
  exercises: Exercise[];
}

export type Block =
  | FlowBlock
  | StraightSetsBlock
  | CircuitRoundsBlock
  | CircuitTimeBlock
  | SupersetBlock
  | EmomBlock;

export interface Exercise {
  exercise_id: string;
  title: string;
  movement_type?: MovementType;
  equipment: Equipment;
  prescription: Prescription;
  rest_after_seconds?: number;
  cluster?: {
    reps_per_cluster: number;
    clusters: number;
    rest_between_clusters_seconds: number;
  };
  tempo?: string;
  sides?: SideMode;
  notes?: string;
  link?: ExerciseLink;
}

export interface Load {
  unit: WeightUnit;
  value: number;
}

export interface BodyweightEquipment {
  kind: 'bodyweight';
}

export interface KettlebellEquipment {
  kind: 'kettlebell';
  load: Load;
}

export interface ResistanceBandEquipment {
  kind: 'resistance_band';
  band: {
    color: string;
    style: BandStyle;
    brand?: string;
  };
}

export interface DumbbellEquipment {
  kind: 'dumbbell';
  load: Load;
}

export interface BarbellEquipment {
  kind: 'barbell';
  load: Load;
}

export interface MachineEquipment {
  kind: 'machine';
  machine_name?: string;
  load?: Load;
}

export interface OtherEquipment {
  kind: 'other';
  label: string;
}

export type Equipment =
  | BodyweightEquipment
  | KettlebellEquipment
  | ResistanceBandEquipment
  | DumbbellEquipment
  | BarbellEquipment
  | MachineEquipment
  | OtherEquipment;

export interface RepsPrescription {
  mode: 'reps';
  reps: number;
}

export interface RepRangePrescription {
  mode: 'rep_range';
  min_reps: number;
  max_reps: number;
}

export interface TimePrescription {
  mode: 'time';
  seconds: number;
}

export type Prescription =
  | RepsPrescription
  | RepRangePrescription
  | TimePrescription;

export interface ExerciseLink {
  label?: string;
  url: string;
}

export interface NormalizedStage extends Omit<Stage, 'sections' | 'blocks'> {
  sections: Section[];
}

export interface NormalizedSessionDefinition
  extends Omit<SessionDefinition, 'stages'> {
  stages: NormalizedStage[];
}
