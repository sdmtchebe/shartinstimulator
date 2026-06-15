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
  | "hell";

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
  | "airport-desk";

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
}

export type NpcMood = "happy" | "neutral" | "angry" | "shocked" | "scared" | "horny" | "smug" | "sad";
export type NpcActivity = "wander" | "static" | "soccer" | "watchTV" | "guard" | "chat" | "stare" | "dance";

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
}

export interface FoodItem {
  id: string;
  name: string;
  emoji: string;
  hunger: number;
  chud: number;
}

export interface MartinState {
  scene: SceneId;
  x: number; y: number;
  dir: Direction;
  walking: boolean;
  walkPhase: number;
  hp: number;
  hpMax: number;
}

export interface GameStats {
  money: number;
  hunger: number;
  chud: number;
  day: number;
  timeSec: number;
  shake: number;
  dead: boolean;
  causeOfDeath: string;
  tutoratAvailable: boolean;
  tutoratDoneToday: boolean;
  totalMoneyEarned: number;
  fightsWon: number;
  fightsLost: number;
  fightsWonToday: number;
  fightsWonFighters: string[];
  npcsTransformed: number;
  foodsEaten: number;
  shitsToday: number;
  tutoratStreak: number;
  calledNpcs: string[];
  survivedNight: boolean;
  dailyEvent: string | null;
  secretsFound: string[];
  questsCompleted: string[];
  scenesVisited: string[];
  tutorialStep: number; // 0 = not started, 1 = fridge, 2 = mom, 3 = toilet, 4 = outside interaction, 5 = complete
  buttplugQuestStep: number; // 0=none, 1=met MoGgayla, 2=david talked, 3=has hummus, 4=gave david, 5=wolf talked, 6=kai beaten, 7=has buttplug, 8=complete
  hasHummus: boolean;
  hasButtplug: boolean;
  hellDefeated: boolean;
  hasTicket: boolean;
}

export interface Quest { id: string; label: string; }
