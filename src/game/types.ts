export type Direction = "up" | "down" | "left" | "right";

export type SceneId =
  | "home"
  | "outside"
  | "tutorat"
  | "court"
  | "fightclub"
  | "chudzone"
  | "moggayla"
  | "cartier"
  | "nelly"
  | "gym"
  | "asbestos"
  | "basement"
  | "upstairs"
  | "fishing"
  | "stripclub"
  | "tunnel"
  | "hidden-room"
  | "boutique"
  | "airport"
  | "hell"
  | "apartments"
  | "gas-station"
  | "garage";

export interface Vec2 { x: number; y: number; }

export interface Wall { x: number; y: number; w: number; h: number; color?: string; label?: string; }

export interface Door {
  id: string;
  x: number; y: number; w: number; h: number;
  targetScene: SceneId;
  targetPos: Vec2;
  label: string;
  color?: string;
}

export type InteractableType =
  | "fridge" | "bed" | "tutorat-desk" | "charle-button"
  | "fight-pit" | "chud-circle" | "easter-text" | "easter-object"
  | "moggayla-crack" | "transform-npc" | "street-food" | "decor-eat"
  | "exit-sign" | "fishing-rod" | "tip-jar" | "mom-tv"
  | "selfie-spot" | "secret-stash" | "secret-diary" | "quest-item"
  | "airport-desk"
  | "apartment-door";

export interface Interactable {
  id: string;
  x: number; y: number; w: number; h: number;
  label: string;
  type: InteractableType;
  color?: string;
  emoji?: string;
  data?: Record<string, unknown>;
  oneShot?: boolean;
  used?: boolean;
}

export interface SceneDef {
  id: SceneId;
  name: string;
  width: number;
  height: number;
  bgColor: string;
  bgPattern?: "grass" | "wood" | "tile" | "concrete" | "carpet" | "ring" | "club" | "water" | "hell";
  walls: Wall[];
  doors: Door[];
  interactables: Interactable[];
  spawnPos: Vec2;
  buildings?: { x: number; y: number; w: number; h: number; color?: string; label?: string }[];
}

export type NpcMood = "happy" | "neutral" | "angry" | "shocked" | "scared" | "horny" | "smug" | "sad";
export type NpcActivity = "wander" | "static" | "soccer" | "watchTV" | "guard" | "chat" | "stare" | "dance" | "eat";

export type NpcScheduleEntry = {
  startHour: number; // 0-24, e.g., 8 for 8 AM
  endHour: number; // 0-24, e.g., 12 for 12 PM
  scene: SceneId; // where they go
  activity: NpcActivity; // what they do there
  targetX?: number; // optional specific spot
  targetY?: number; // optional specific spot
};

export interface NpcSpecialAction {
  label: string;
  emoji: string;
}

export interface NpcDef {
  id: string;
  name: string;
  homeScene: SceneId;
  baseX: number;
  baseY: number;
  color: string;
  hairColor?: string;
  size: number;
  description: string;
  transformForm: string;
  transformLabel: string;
  isFat?: boolean;
  isGinger?: boolean;
  behavior: NpcActivity;
  staticSpot?: boolean;
  isDeaf?: boolean;
  chatLines?: string[];
  reactionEmojis?: string[];
  specialAction?: NpcSpecialAction;
  defaultMood?: NpcMood;
  schedule?: NpcScheduleEntry[];
}

export interface NpcRuntime {
  def: NpcDef;
  scene: SceneId;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  walkPhase: number;
  speed: number;
  thoughtTimer: number;
  transformed: boolean;
  pendingMoveTimer: number;
  mood: NpcMood;
  activity: NpcActivity;
  activityTimer: number;
  reactionEmoji: string | null;
  reactionTimer: number;
  partnerId: string | null;
  speechBubble: string | null;
  speechTimer: number;
  facingDir: Direction;
  emotion: NpcMood;
  emotionTimer: number;
  friendship: number; // 0-100
  ballX?: number;
  ballY?: number;
  ballVX?: number;
  ballVY?: number;
  anger?: number;
  hp?: number;
  asleep?: boolean;
  stalking?: boolean;
  pickpocketCd?: number;
  goingHome: boolean;
  stuckTimer: number;
}

export interface CarState {
  x: number;
  y: number;
  angle: number;
  speed: number;
  gear: number; // 0=neutral, 1-4=forward, -1=reverse
  gas: number; // 0-100
  headlights: boolean;
  engineRunning: boolean;
  inCar: boolean;
  steerAngle: number;
  driftAngle: number;
  rpm: number;
}

export interface Quest { id: string; label: string; }
