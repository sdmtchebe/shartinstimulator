import type { FoodItem, NpcDef, SceneDef } from "./types";

export const TILE = 32;
export const DAY_LENGTH_SECONDS = 360;
export const DAY_START_HOUR = 10;
export const DAY_END_HOUR = 24;
export const PLAYER_SPEED = 2.4;
export const PLAYER_RADIUS = 26;

export const MOLDY_FOODS: FoodItem[] = [
  { id: "moldy-bread", name: "Moldy Bread", emoji: "🍞", hunger: 20, chud: 4 },
  { id: "moldy-sauce", name: "Moldy Sauce", emoji: "🥫", hunger: 15, chud: 5 },
  { id: "moldy-cheese", name: "Moldy Cheese", emoji: "🧀", hunger: 25, chud: 6 },
  { id: "moldy-shit", name: "Moldy Shit", emoji: "💩", hunger: 35, chud: 8 },
  { id: "moldy-milk", name: "Moldy Milk", emoji: "🥛", hunger: 10, chud: 7 },
  { id: "moldy-pizza", name: "Moldy Pizza", emoji: "🍕", hunger: 30, chud: 6 },
  { id: "moldy-fish", name: "Moldy Fish", emoji: "🐟", hunger: 22, chud: 8 },
  { id: "moldy-banana", name: "Moldy Banana", emoji: "🍌", hunger: 12, chud: 5 },
];

export const STREET_FOODS: FoodItem[] = [
  { id: "trash-bag", name: "Trash Bag", emoji: "🗑️", hunger: 0, chud: 12 },
  { id: "wall-chunk", name: "Building Wall Chunk", emoji: "🧱", hunger: 0, chud: 15 },
  { id: "lamp-post", name: "Lamp Post", emoji: "💡", hunger: 0, chud: 18 },
  { id: "bench", name: "Park Bench", emoji: "🪑", hunger: 0, chud: 14 },
  { id: "fire-hydrant", name: "Fire Hydrant", emoji: "🚒", hunger: 0, chud: 16 },
  { id: "tree", name: "Whole Tree", emoji: "🌳", hunger: 0, chud: 20 },
];

export const FIGHTERS = [
  { id: "mccrackeylla", name: "McCrackeylla", desc: "A very very fat black girl. Hits like a freight train.", color: "#5b3a2e", size: 80, hp: 80, dmg: 14, reward: 90 },
  { id: "wolf-bobitos", name: "Wolf Shartos Bartos Bobitos", desc: "Soccer obsessed. Kicks you in the teeth.", color: "#3a5a3a", size: 50, hp: 60, dmg: 18, reward: 70 },
  { id: "cousin", name: "Cousin", desc: "Extremely fat. Slow but devastating.", color: "#7a4a2a", size: 90, hp: 100, dmg: 20, reward: 120 },
  { id: "pitounbibtibi", name: "Pitounbibtibi", desc: "A beautiful girl. Hits with grace.", color: "#d29ec0", size: 45, hp: 50, dmg: 22, reward: 60 },
  { id: "kai", name: "Kai", desc: "Fueled by asbestos and spite. Fight club's deadliest chud.", color: "#d8c0a0", size: 48, hp: 75, dmg: 19, reward: 100 },
];

export const CHUD_ACTIVITIES = [
  "scream slurs at pigeons",
  "lick a stop sign with Anish",
  "try to bench press David",
  "argue with Konstantin about which Bulgarian flag is realer",
  "watch Kai eat an entire candle",
  "do the 'belly drop' on the sidewalk",
  "yell 'YO NELLY CHECK OUT MY BELLY' at strangers",
  "race a wheelchair down the street",
  "wrestle a vending machine and lose",
  "TikTok dance, badly, for 10 minutes",
  "try to fish in a fountain with a pencil",
  "argue with a stop sign about politics",
];

export const ALL_QUESTS = [
  { id: "wake-up", label: "Wake up Martin" },
  { id: "eat-fridge", label: "Eat from the fridge" },
  { id: "tutorat", label: "Tutor Caillo" },
  { id: "fight", label: "Win a fight" },
  { id: "transform", label: "Transform an NPC" },
  { id: "crack-mog", label: "Crack Moggayla" },
  { id: "crack-mcmog", label: "Crack McMoggayla" },
  { id: "explore-basement", label: "Survive Cousin" },
  { id: "explore-upstairs", label: "Visit Mom" },
  { id: "fish", label: "Catch a fish" },
  { id: "shoot-hoop", label: "Score a basket" },
  { id: "chud", label: "Chud out with the boys" },
  // Hard quests
  { id: "win-3-fights", label: "Win 3 fights in one day" },
  { id: "transform-all", label: "Transform every NPC" },
  { id: "survive-night", label: "Survive The Cousin at night" },
  { id: "broke", label: "Go broke (reach $0)" },
  { id: "call-everyone", label: "Call every contact" },
  { id: "fish-wolf", label: "Fish up Wolf's head" },
  { id: "full-hunger", label: "Max out hunger bar (don't eat all day)" },
  { id: "toilet-5", label: "Take a shit 5 times in one day" },
  { id: "fight-all", label: "Beat every fighter" },
  { id: "chud-80", label: "Reach 80% chud and survive" },
  { id: "tutorat-3days", label: "Tutor Caillo 3 days in a row" },
  { id: "find-tunnel", label: "???" },
  { id: "find-hidden-room", label: "???" },
  { id: "buttplug-quest", label: "Find MoGgayla's buttplug" },
];

export interface DailyEvent {
  id: string;
  title: string;
  description: string;
  effect: "tutorat-closed" | "fight-bonus" | "cousin-loose" | "free-food" | "chud-zone-party" | "wolf-lost-watch" | "moggayla-rampage" | "david-discount" | "carl-big-catch";
}

export const DAILY_EVENTS: DailyEvent[] = [
  { id: "tutorat-closed", title: "🔒 Tutorat Closed", description: "Caillo called in sick. No tutorat today.", effect: "tutorat-closed" },
  { id: "fight-bonus", title: "🥊 Fight Night!", description: "Special event at the Fight Club — prize money doubled.", effect: "fight-bonus" },
  { id: "cousin-loose", title: "👹 COUSIN IS LOOSE", description: "Cousin escaped the basement. He's outside. DO NOT go out.", effect: "cousin-loose" },
  { id: "free-food", title: "🍕 Free Food Day", description: "Someone left food outside. Fridge items fill double hunger.", effect: "free-food" },
  { id: "chud-zone-party", title: "🎉 Chud Zone Party", description: "The boys are going HARD. Chudding gives +$15 today.", effect: "chud-zone-party" },
  { id: "wolf-lost-watch", title: "⌚ Wolf Lost His Watch", description: "Wolf is furious. His Cartier Santos is missing. $50 reward if you find it.", effect: "wolf-lost-watch" },
  { id: "moggayla-rampage", title: "⚫ MOGGAYLA RAMPAGING", description: "Moggayla hasn't eaten. Visiting her costs -20 HP today.", effect: "moggayla-rampage" },
  { id: "david-discount", title: "🥙 David's Hummus Day", description: "David made extra hummus. His hummus reduces double hunger today.", effect: "david-discount" },
  { id: "carl-big-catch", title: "🎣 Fish Are Biting", description: "Carl says conditions are perfect. Double fishing rewards today.", effect: "carl-big-catch" },
];

// Phone call conversations per NPC — arrays of [martin_line, npc_line] exchanges
export const CALL_SCRIPTS: Record<string, { greeting: string; exchanges: [string, string][] }> = {
  "charle": {
    greeting: "yo Martin whaddup",
    exchanges: [
      ["Charle you wanna shoot hoops?", "bro im ALWAYS ready. bring your belly."],
      ["How tall are you again?", "4'2\" and growing. shut up."],
      ["I might transform you into a basketball", "please dont. last time was traumatic."],
      ["You seen Wolf today?", "yeah he was flexing his watch again. loser."],
    ],
  },
  "damian": {
    greeting: "...",
    exchanges: [
      ["Damian it's me", "..."],
      ["How are you?", "...⚽"],
      ["You good bro?", "(kicks ball on his end)"],
      ["I'll come visit", "...👍"],
    ],
  },
  "wolf-npc": {
    greeting: "Wolf Bobitos speaking. Make it quick.",
    exchanges: [
      ["Nice watch Wolf", "37500 euros. you could never."],
      ["What are you doing?", "sigma grindset. 4AM cold shower. you?"],
      ["You want to fight?", "my watch is worth more than your life Martin."],
      ["Can I borrow money?", "laughable. goodbye."],
    ],
  },
  "konstantin": {
    greeting: "DA? Who is this?",
    exchanges: [
      ["It's Martin", "MARTIN! you Bulgarian?"],
      ["Can you get me rakia?", "always. Bulgarian rakia. best in world."],
      ["How's Bulgaria?", "STRONGEST NATION. always."],
      ["Wanna hang?", "come. we drink rakia. we shout about flag."],
    ],
  },
  "kai": {
    greeting: "bro I haven't slept in 4 days what",
    exchanges: [
      ["Kai are you okay?", "never better. just ate a lightbulb."],
      ["What have you eaten today?", "half a candle, some asbestos chips, a pen."],
      ["You coming to chud zone?", "already there bro. been here since tuesday."],
      ["Help me I'm being chased", "by what. I'll eat it."],
    ],
  },
  "david": {
    greeting: "Shalom! Martin! You want hummus?",
    exchanges: [
      ["David I need hummus", "always. grandma made extra batch."],
      ["Can you lend me $20?", "for you? yes. shabbat shalom."],
      ["How's Israel?", "complicated. hummus is great though."],
      ["Come hang with us", "yes! I bring hummus. Anish can't come though."],
    ],
  },
  "anish": {
    greeting: "YO BRO the rizz is literally unmatched today",
    exchanges: [
      ["Nobody asked Anish", "anyway as I was saying—"],
      ["Did you do stand-up again?", "crushed it bro. one guy laughed. maybe."],
      ["Stop being cringe", "the cringe is the brand bro. trust."],
      ["Can you come here?", "already on my way. did I tell you about my bit?"],
    ],
  },
  "moggayla": {
    greeting: "...hello?",
    exchanges: [
      ["Moggayla it's Martin", "...bring food."],
      ["Are you okay?", "...need crack."],
      ["What are you doing?", "...existing. bring food."],
      ["I'll visit soon", "...bring two foods."],
    ],
  },
  "caillo": {
    greeting: "MARTIN!! Can you explain fractions again??",
    exchanges: [
      ["Caillo it's 3AM", "but what IS a fraction bro"],
      ["We had class today", "i know but wait— what's a number tho"],
      ["Stop calling me", "but what if 2+2 isnt 4 what then"],
      ["You owe me money", "my mom said I need a receipt"],
    ],
  },
  "cousin-roy": {
    greeting: "*heavy breathing*",
    exchanges: [
      ["Roy it's Martin", "*sniffing*"],
      ["Are you in the basement?", "*growl*"],
      ["I'm coming down", "...come. I'm hungry."],
      ["Never mind", "*disappointed grunt*"],
    ],
  },
  "mom": {
    greeting: "...what Martin I'm watching TV",
    exchanges: [
      ["Mom can I have money?", "ask your father. ...actually don't."],
      ["Mom I love you", "...mhm. turn down the volume out there."],
      ["I might die tonight", "Martin I'm watching my show."],
      ["Mom there's a monster outside", "it's probably just Cousin. go to bed."],
    ],
  },
  "mcmoggayla": {
    greeting: "WHO IS THIS. I'm on stage.",
    exchanges: [
      ["It's Martin", "tip me first then we talk."],
      ["Are you working tonight?", "ALWAYS working. extra wide tonight."],
      ["Can I get a discount?", "absolutely not. $10 minimum."],
      ["How's business?", "booming baby. the chud keeps coming."],
    ],
  },
  "carl": {
    greeting: "...Carl here. The sea's calm today.",
    exchanges: [
      ["Any good catches?", "caught a boot and a memory. both useless."],
      ["Tips for fishing?", "use a sus pole. catch sus things."],
      ["I caught Wolf's head", "...again? third time this month."],
      ["Can I come fish?", "dock's open. bring your own sadness."],
    ],
  },
};


export const NPC_DEFS: NpcDef[] = [
  {
    id: "charle", name: "Charle", homeScene: "court", baseX: 360, baseY: 320,
    color: "#e89060", hairColor: "#d24a18", size: 22,
    description: "A fat little ginger guy. He loves basketball.",
    transformForm: "basketball", transformLabel: "rendre charle une balle de basket",
    isFat: true, isGinger: true, behavior: "wander",
    chatLines: ["yo Martin shoot some hoops?", "I'm 4'2 and proud", "ginger pride forever", "did u see Daron's gym?"],
    reactionEmojis: ["🏀", "😅", "🥺"],
    defaultMood: "happy",
    specialAction: { label: "Challenge to HORSE ($10 bet)", emoji: "🏀" },
  },
  {
    id: "damian", name: "Damian", homeScene: "outside", baseX: 1100, baseY: 760,
    color: "#f0c8a0", hairColor: "#5a3520", size: 18,
    description: "Martin's deaf and mute little chud brother. Plays soccer all day.",
    transformForm: "vegetable-wheelchair", transformLabel: "make Damian a wheelchair vegetable",
    behavior: "soccer", isDeaf: true,
    chatLines: ["...", "(silent stare)", "(kicks ball harder)", "(points at ball)"],
    reactionEmojis: ["⚽", "👀", "..."],
    defaultMood: "neutral",
    specialAction: { label: "Steal his soccer ball (+$5, he cries)", emoji: "⚽" },
  },
  {
    id: "wolf-npc", name: "Wolf Shartos Bartos Bobitos", homeScene: "outside",
    baseX: 1700, baseY: 950, color: "#3a5a3a", hairColor: "#1a2a1a", size: 24,
    description: "Always dribbling an invisible soccer ball.",
    transformForm: "cartier-watch", transformLabel: "transform Wolf into a Cartier Santos",
    behavior: "wander",
    chatLines: ["Cartier Santos costs 37500e peasant", "Wolf got the alpha grindset", "I'm a sigma", "watch this kick"],
    reactionEmojis: ["⌚", "⚽", "😤"],
    defaultMood: "smug",
    specialAction: { label: "Ask to see the watch (wastes 15 min)", emoji: "⌚" },
  },
  {
    id: "konstantin", name: "Konstantin", homeScene: "outside", baseX: 600, baseY: 1200,
    color: "#c8b890", hairColor: "#2a1810", size: 22,
    description: "Smells like rakia. Always shouts about Bulgaria.",
    transformForm: "bulgarian-flag", transformLabel: "make Konstantin into a Bulgarian flag",
    behavior: "wander",
    chatLines: ["Bulgaria is the strongest!", "rakia is breakfast", "you bulgarian?", "let me show you flag"],
    reactionEmojis: ["🇧🇬", "🍻", "😡"],
    defaultMood: "angry",
    specialAction: { label: "Drink rakia with him (-15 hunger, +8 chud)", emoji: "🍻" },
  },
  {
    id: "kai", name: "Kai", homeScene: "chudzone", baseX: 350, baseY: 350,
    color: "#d8c0a0", hairColor: "#3a2010", size: 22,
    description: "Once ate an entire candle on a dare.",
    transformForm: "bulgarian-flag", transformLabel: "make Kai into a Bulgarian flag",
    behavior: "wander",
    chatLines: ["I ate a candle once", "5 days awake bro", "the chud is calling", "want to eat asbestos?"],
    reactionEmojis: ["🕯️", "🤤"],
    defaultMood: "shocked",
    specialAction: { label: "Dare him to eat something horrible (+10 chud each)", emoji: "🕯️" },
  },
  {
    id: "david", name: "David", homeScene: "outside", baseX: 2000, baseY: 1300,
    color: "#e8c8a0", hairColor: "#2a1810", size: 22,
    description: "Carries hummus everywhere.",
    transformForm: "israeli-flag", transformLabel: "make David into an Israeli flag",
    behavior: "wander",
    chatLines: ["want some hummus?", "shalom Martin", "shabbat shalom on tuesdays", "my grandma made this"],
    reactionEmojis: ["🇮🇱", "🥙", "😅"],
    defaultMood: "happy",
    specialAction: { label: "Accept hummus (-20 hunger, -3 chud)", emoji: "🥙" },
  },
  {
    id: "anish", name: "Anish", homeScene: "chudzone", baseX: 600, baseY: 380,
    color: "#a06840", hairColor: "#1a0a05", size: 22,
    description: "Permanent cringe energy.",
    transformForm: "trash-can", transformLabel: "transform Anish into a trash can",
    behavior: "wander",
    chatLines: ["yo bro the rizz is real", "anyway as I was saying", "did you see my stand-up?", "stinky vibes only"],
    reactionEmojis: ["🤡", "🗑️", "😬"],
    defaultMood: "smug",
    specialAction: { label: "Watch his stand-up (+15 chud, pure suffering)", emoji: "🎤" },
  },
  {
    id: "moggayla", name: "Moggayla", homeScene: "moggayla", baseX: 500, baseY: 380,
    color: "#3d2418", hairColor: "#0a0a0a", size: 95,
    description: "An extremely morbidly obese black girl. Trembles the building.",
    transformForm: "bouboule", transformLabel: "turn Moggayla into a Bouboule (black circle)",
    isFat: true, behavior: "static", staticSpot: true,
    chatLines: ["...wha?", "bring me food", "crack me daddy"],
    reactionEmojis: ["⚫", "😴"],
    defaultMood: "neutral",
    specialAction: { label: "Bring her moldy food (-5 chud)", emoji: "🍖" },
  },
  {
    id: "caillo", name: "Caillo Qui Casse les Couilles", homeScene: "tutorat",
    baseX: 540, baseY: 400, color: "#f4d7b8", hairColor: "#5a3520", size: 20,
    description: "The most annoying student ever. Pays for tutorat.",
    transformForm: "rock", transformLabel: "turn Caillo into a literal rock",
    behavior: "wander",
    chatLines: ["but why does 2+2 = 4?", "wait what's a number", "explain it like im 4", "this is too hard"],
    reactionEmojis: ["🤔", "🧱", "📚"],
    defaultMood: "scared",
    specialAction: { label: "Give extra homework (+$10, he weeps)", emoji: "📚" },
  },
  // 1. Rename "Cousin Roy" → "Cousin" everywhere in NPC def
  {
    id: "cousin-roy", name: "Cousin", homeScene: "basement", baseX: 400, baseY: 280,
    color: "#5a3a28", hairColor: "#1a0a05", size: 70,
    description: "Lives in the basement. Eats anyone who comes too close. Don't approach.",
    transformForm: "rock", transformLabel: "(impossible) turn Cousin to stone",
    isFat: true, behavior: "guard", staticSpot: true,
    chatLines: ["*GROWL*", "*chomp chomp*", "...come closer cousin", "*licks lips*"],
    reactionEmojis: ["🍖", "🩸", "👹"],
    defaultMood: "angry",
    specialAction: { label: "Throw him a bone (-10 chud, 5s safe)", emoji: "🦴" },
  },
  {
    id: "mom", name: "Mom", homeScene: "upstairs", baseX: 360, baseY: 280,
    color: "#e8b8a0", hairColor: "#7a5028", size: 30,
    description: "Watches TV all day. Doesn't acknowledge Martin.",
    transformForm: "rock", transformLabel: "(impossible) the bond is sacred",
    isFat: true, behavior: "watchTV", staticSpot: true,
    chatLines: ["...mhm", "shut up Martin im watching TV", "did you take out the trash", "your father called"],
    reactionEmojis: ["📺", "💢", "🚬"],
    defaultMood: "sad",
    specialAction: { label: "Clean the ashtray (+10 HP, she notices)", emoji: "🚬" },
  },
  {
    id: "mcmoggayla", name: "McMoggayla", homeScene: "stripclub", baseX: 500, baseY: 280,
    color: "#2d1810", hairColor: "#0a0a0a", size: 110,
    description: "McMoggayla. Bigger. Crackier. Thicker. The original's mom.",
    transformForm: "bouboule", transformLabel: "turn McMoggayla into a McBouboule",
    isFat: true, behavior: "dance", staticSpot: true,
    chatLines: ["tip me chud", "$10 for a crack", "I AM the show", "extra wide tonight"],
    reactionEmojis: ["💵", "💃", "💥"],
    defaultMood: "horny",
    specialAction: { label: "Request private show ($15, +12 chud)", emoji: "💃" },
  },
  {
    id: "carl", name: "Carl the Fisherman", homeScene: "fishing", baseX: 200, baseY: 280,
    color: "#c8a878", hairColor: "#a0a0a0", size: 24,
    description: "An old fisherman. Smells like fish and sadness.",
    transformForm: "rock", transformLabel: "turn Carl into a fish",
    behavior: "wander",
    chatLines: ["caught a Wolf yesterday", "the sea takes everything", "if you eat bait, are you bait?", "use sus pole, catch sus things"],
    reactionEmojis: ["🎣", "🐟", "😶"],
    defaultMood: "sad",
    specialAction: { label: "Fish together (doubles catch chance)", emoji: "🎣" },
  },
  {
    id: "moggayla-bt", name: "MoGgayla", homeScene: "boutique", baseX: 450, baseY: 320,
    color: "#3d2418", hairColor: "#0a0a0a", size: 95,
    description: "An obese black girl. Owner of MoggMcCrackeggayla Boutique.",
    transformForm: "bouboule", transformLabel: "turn MoGgayla into a Bouboule",
    isFat: true, behavior: "static", staticSpot: true,
    chatLines: ["Martin darling...", "my boutique, my rules", "travel awaits us both"],
    reactionEmojis: ["💕", "⚫", "✨"],
    defaultMood: "happy",
  },
];

const COLORS = {
  doorway: "#f4b860",
  building: "#7a5a40",
};

const stdWalls = (w: number, h: number) => [
  { x: 0, y: 0, w, h: 30 },
  { x: 0, y: h - 30, w, h: 30 },
  { x: 0, y: 0, w: 30, h },
  { x: w - 30, y: 0, w: 30, h },
];

export const SCENES: Record<string, SceneDef> = {
  outside: {
    id: "outside", name: "Town", width: 2800, height: 2000,
    bgColor: "#4a7038", bgPattern: "grass", spawnPos: { x: 400, y: 450 },
    walls: [
      { x: 0, y: 0, w: 2800, h: 20 },
      { x: 0, y: 1980, w: 2800, h: 20 },
      { x: 0, y: 0, w: 20, h: 2000 },
      { x: 2780, y: 0, w: 20, h: 2000 },
      // Top row
      { x: 250, y: 280, w: 360, h: 220, color: COLORS.building, label: "Martin's House" },
      { x: 900, y: 250, w: 320, h: 240, color: "#5a7a8a", label: "Tutorat Center" },
      { x: 1380, y: 260, w: 360, h: 280, color: "#a87850", label: "Basketball Court" },
      { x: 1900, y: 260, w: 340, h: 280, color: "#3a2030", label: "Fight Club" },
      { x: 2380, y: 280, w: 320, h: 260, color: "#503020", label: "Chud Zone" },
      // Middle row decor
      { x: 320, y: 1100, w: 260, h: 200, color: "#604838", label: "Moggayla's Apt" },
      { x: 720, y: 1080, w: 260, h: 220, color: "#3a4858", label: "Cartier Santos Shop" },
      { x: 1120, y: 1100, w: 260, h: 200, color: "#604850", label: "Nelly's Belly Bar" },
      { x: 1520, y: 1080, w: 280, h: 220, color: "#5a5a3a", label: "Daron's Gym" },
      { x: 1920, y: 1100, w: 260, h: 200, color: "#3a3a3a", label: "Asbestos Poubelle" },
      // NEW bottom row
      { x: 320, y: 1700, w: 260, h: 200, color: "#8a3060", label: "McMoggayla Strip Club" },
      { x: 720, y: 1700, w: 260, h: 200, color: "#3a5a78", label: "Fishing Dock" },
      { x: 1120, y: 1700, w: 260, h: 200, color: "#5a4030", label: "Cousin's Crack Den" },
      { x: 1520, y: 1700, w: 260, h: 200, color: "#403060", label: "Sus Salon" },
      { x: 1920, y: 1700, w: 260, h: 200, color: "#605030", label: "MoggMcCrackeggayla Boutique" },
    ],
    doors: [
      { id: "d-home", x: 410, y: 470, w: 60, h: 30, targetScene: "home", targetPos: { x: 420, y: 580 }, label: "Home", color: COLORS.doorway },
      { id: "d-tutorat", x: 1040, y: 460, w: 60, h: 30, targetScene: "tutorat", targetPos: { x: 400, y: 580 }, label: "Tutorat", color: COLORS.doorway },
      { id: "d-court", x: 1540, y: 510, w: 60, h: 30, targetScene: "court", targetPos: { x: 400, y: 600 }, label: "Court", color: COLORS.doorway },
      { id: "d-fight", x: 2050, y: 510, w: 60, h: 30, targetScene: "fightclub", targetPos: { x: 400, y: 580 }, label: "Fight Club", color: COLORS.doorway },
      { id: "d-chud", x: 2520, y: 510, w: 60, h: 30, targetScene: "chudzone", targetPos: { x: 400, y: 580 }, label: "Chud Zone", color: COLORS.doorway },
      { id: "d-mog", x: 430, y: 1280, w: 60, h: 30, targetScene: "moggayla", targetPos: { x: 400, y: 580 }, label: "Moggayla's", color: COLORS.doorway },
      { id: "d-cart", x: 830, y: 1280, w: 60, h: 30, targetScene: "cartier", targetPos: { x: 400, y: 580 }, label: "Cartier", color: COLORS.doorway },
      { id: "d-nelly", x: 1230, y: 1280, w: 60, h: 30, targetScene: "nelly", targetPos: { x: 400, y: 580 }, label: "Nelly's Bar", color: COLORS.doorway },
      { id: "d-gym", x: 1640, y: 1280, w: 60, h: 30, targetScene: "gym", targetPos: { x: 400, y: 580 }, label: "Daron's Gym", color: COLORS.doorway },
      { id: "d-asb", x: 2030, y: 1280, w: 60, h: 30, targetScene: "asbestos", targetPos: { x: 400, y: 580 }, label: "Asbestos", color: COLORS.doorway },
      { id: "d-strip", x: 430, y: 1880, w: 60, h: 30, targetScene: "stripclub", targetPos: { x: 400, y: 580 }, label: "Strip Club", color: "#ff80c0" },
      { id: "d-fish", x: 830, y: 1880, w: 60, h: 30, targetScene: "fishing", targetPos: { x: 400, y: 580 }, label: "Fishing", color: "#80c0ff" },
      { id: "d-boutique", x: 2030, y: 1880, w: 60, h: 30, targetScene: "boutique", targetPos: { x: 400, y: 580 }, label: "Boutique", color: "#d4a574" },
    ],
    interactables: [
      { id: "street-food-1", x: 800, y: 700, w: 60, h: 60, label: "Eat trash bag", type: "street-food", emoji: "🗑️" },
      { id: "street-food-2", x: 1400, y: 800, w: 60, h: 60, label: "Eat lamp post", type: "street-food", emoji: "💡" },
      { id: "street-food-3", x: 1850, y: 750, w: 60, h: 60, label: "Eat fire hydrant", type: "street-food", emoji: "🚒" },
      { id: "street-food-4", x: 2200, y: 900, w: 60, h: 60, label: "Eat bench", type: "street-food", emoji: "🪑" },
      { id: "street-food-5", x: 1100, y: 950, w: 60, h: 60, label: "Eat tree", type: "street-food", emoji: "🌳" },
      { id: "shartin-egg", x: 2500, y: 1950, w: 80, h: 30, label: "Tombstone: 'SHARTIN' RIP", type: "easter-text", emoji: "🪦" },
      { id: "fartin-egg", x: 250, y: 1950, w: 80, h: 30, label: "Plaque: 'FARTIN was here'", type: "easter-text", emoji: "💨" },
      { id: "graffiti-1", x: 1300, y: 1950, w: 100, h: 30, label: "Graffiti: 'Wolf was here'", type: "easter-text", emoji: "🎨" },
      { id: "graffiti-2", x: 600, y: 1950, w: 100, h: 30, label: "Graffiti: 'mogg her'", type: "easter-text", emoji: "🎨" },
      { id: "lost-ball", x: 2400, y: 1850, w: 50, h: 50, label: "Lost basketball (signed by Charle)", type: "easter-object", emoji: "🏀" },
    ],
  },

  home: {
    id: "home", name: "Martin's House", width: 900, height: 700,
    bgColor: "#7a4a28", bgPattern: "wood", spawnPos: { x: 420, y: 580 },
    walls: [...stdWalls(900, 700), { x: 30, y: 280, w: 360, h: 20 }],
    doors: [
      { id: "exit", x: 410, y: 660, w: 80, h: 40, targetScene: "outside", targetPos: { x: 440, y: 530 }, label: "Outside", color: COLORS.doorway },
      { id: "to-basement", x: 380, y: 350, w: 80, h: 50, targetScene: "basement", targetPos: { x: 400, y: 510 }, label: "↓ Basement", color: "#3a1010" },
      { id: "to-upstairs", x: 540, y: 350, w: 80, h: 50, targetScene: "upstairs", targetPos: { x: 400, y: 510 }, label: "↑ Mom", color: "#603030" },
      { id: "to-hidden", x: 760, y: 560, w: 30, h: 30, targetScene: "hidden-room", targetPos: { x: 300, y: 420 }, label: "???", color: "#0a0505" },
    ],
    interactables: [
      { id: "fridge", x: 80, y: 80, w: 90, h: 110, label: "Open Fridge", type: "fridge", emoji: "🧊" },
      { id: "bed", x: 80, y: 360, w: 200, h: 130, label: "Sleep", type: "bed", emoji: "🛏️" },
      { id: "tv", x: 700, y: 80, w: 100, h: 80, label: "Chud Out on Couch", type: "chud-circle", emoji: "📺" },
      { id: "toilet", x: 720, y: 320, w: 80, h: 100, label: "Take a Shit (-chud)", type: "decor-eat", emoji: "🚽" },
      { id: "selfie", x: 460, y: 580, w: 70, h: 50, label: "Take a selfie", type: "selfie-spot", emoji: "📸" },
      { id: "fridge-magnet", x: 200, y: 80, w: 50, h: 40, label: "Fridge magnet: 'Yo Nelly check out my belly'", type: "easter-text", emoji: "🧲" },
    ],
  },

  basement: {
    id: "basement", name: "The Basement", width: 800, height: 600,
    bgColor: "#1a0a05", bgPattern: "concrete", spawnPos: { x: 400, y: 500 },
    walls: stdWalls(800, 600),
    doors: [
      { id: "exit", x: 380, y: 560, w: 80, h: 30, targetScene: "home", targetPos: { x: 420, y: 410 }, label: "↑ Up to House", color: COLORS.doorway },
      { id: "to-tunnel", x: 680, y: 260, w: 40, h: 40, targetScene: "tunnel", targetPos: { x: 100, y: 200 }, label: "???", color: "#050505" },
    ],
    interactables: [
      { id: "bones-pile", x: 100, y: 100, w: 80, h: 60, label: "A pile of bones (don't ask)", type: "easter-text", emoji: "🦴" },
      { id: "cousin-recipe", x: 600, y: 80, w: 100, h: 80, label: "Recipe book: 'Human Cuisine vol.4'", type: "easter-text", emoji: "📖" },
      { id: "chains", x: 80, y: 400, w: 80, h: 60, label: "Suspicious bloody chains", type: "easter-text", emoji: "⛓️" },
      { id: "shit-barrel", x: 620, y: 400, w: 80, h: 80, label: "Eat fresh shit barrel", type: "decor-eat", emoji: "🛢️" },
      { id: "spider-web", x: 400, y: 80, w: 60, h: 50, label: "Spider web with 30 spiders", type: "easter-text", emoji: "🕸️" },
      { id: "blood-stain", x: 200, y: 480, w: 120, h: 40, label: "Old blood stain (humanoid shape)", type: "easter-text", emoji: "🩸" },
      { id: "cage", x: 540, y: 200, w: 100, h: 100, label: "Empty cage labeled 'Damian'", type: "easter-text", emoji: "🪤" },
      { id: "basement-hummus", x: 300, y: 200, w: 70, h: 70, label: "Grab David's hummus", type: "quest-item", emoji: "🥙", oneShot: true },
    ],
  },

  upstairs: {
    id: "upstairs", name: "Upstairs - Mom's Floor", width: 800, height: 600,
    bgColor: "#604030", bgPattern: "carpet", spawnPos: { x: 400, y: 500 },
    walls: stdWalls(800, 600),
    doors: [
      { id: "exit", x: 380, y: 560, w: 80, h: 30, targetScene: "home", targetPos: { x: 580, y: 410 }, label: "↓ Down to House", color: COLORS.doorway },
    ],
    interactables: [
      { id: "mom-tv", x: 320, y: 80, w: 160, h: 100, label: "Mom's TV (Chud Channel 24/7)", type: "mom-tv", emoji: "📺" },
      { id: "couch", x: 250, y: 200, w: 300, h: 90, label: "Mom's couch (do not sit, mom's spot)", type: "easter-object", emoji: "🛋️" },
      { id: "family-photos", x: 80, y: 100, w: 80, h: 60, label: "Family photos: Martin at every age, all fat", type: "easter-text", emoji: "🖼️" },
      { id: "moms-pills", x: 600, y: 100, w: 80, h: 60, label: "Mom's diabetes pills (eat for chud rush)", type: "easter-text", emoji: "💊" },
      { id: "tv-guide", x: 80, y: 380, w: 80, h: 60, label: "TV Guide: Chud Channel all day", type: "easter-text", emoji: "📰" },
      { id: "ashtray", x: 600, y: 380, w: 80, h: 60, label: "Mom's ashtray (overflowing)", type: "easter-text", emoji: "🚬" },
      { id: "snack-table", x: 350, y: 380, w: 100, h: 80, label: "Mom's snack table: chips & rakia", type: "decor-eat", emoji: "🍿" },
      { id: "dad-photo", x: 350, y: 480, w: 100, h: 50, label: "Dad's photo (face crossed out)", type: "easter-text", emoji: "👤" },
    ],
  },

  tutorat: {
    id: "tutorat", name: "Tutorat Center", width: 900, height: 700,
    bgColor: "#c8c0b0", bgPattern: "tile", spawnPos: { x: 400, y: 580 },
    walls: stdWalls(900, 700),
    doors: [{ id: "exit", x: 380, y: 660, w: 80, h: 40, targetScene: "outside", targetPos: { x: 1070, y: 510 }, label: "Outside", color: COLORS.doorway }],
    interactables: [
      { id: "tutorat-desk", x: 380, y: 250, w: 160, h: 100, label: "Start Tutorat", type: "tutorat-desk", emoji: "📚" },
      { id: "blackboard", x: 380, y: 80, w: 200, h: 80, label: "Blackboard: '2+2 = ?' (still unsolved)", type: "easter-text", emoji: "📋" },
      { id: "test-paper", x: 100, y: 200, w: 80, h: 60, label: "Caillo's test (1/100)", type: "easter-text", emoji: "📝" },
      { id: "smartboard", x: 700, y: 200, w: 100, h: 80, label: "Smartboard (no one knows how)", type: "easter-text", emoji: "🖥️" },
      { id: "asbestos-coffee", x: 100, y: 460, w: 80, h: 60, label: "Asbestos Poubelle Coffee (free)", type: "decor-eat", emoji: "☕" },
    ],
  },

  court: {
    id: "court", name: "Basketball Court", width: 900, height: 700,
    bgColor: "#a87850", bgPattern: "wood", spawnPos: { x: 400, y: 600 },
    walls: stdWalls(900, 700),
    doors: [{ id: "exit", x: 380, y: 660, w: 80, h: 40, targetScene: "outside", targetPos: { x: 1560, y: 560 }, label: "Outside", color: COLORS.doorway }],
    interactables: [
      { id: "hoop", x: 420, y: 60, w: 80, h: 70, label: "Basketball Hoop", type: "easter-object", emoji: "🏀" },
      { id: "charle-button", x: 360, y: 430, w: 200, h: 50, label: "rendre charle une balle de basket", type: "charle-button", emoji: "🟠" },
      { id: "water-bottle", x: 100, y: 200, w: 60, h: 60, label: "Spilled energy drinks (eat for chud)", type: "decor-eat", emoji: "🥤" },
      { id: "broken-net", x: 700, y: 200, w: 80, h: 60, label: "Net torn by Cousin", type: "easter-text", emoji: "🥅" },
      { id: "score-card", x: 100, y: 480, w: 80, h: 60, label: "Score: Charle 0 - Martin 999", type: "easter-text", emoji: "📊" },
    ],
  },

  fightclub: {
    id: "fightclub", name: "Fight Club", width: 900, height: 700,
    bgColor: "#5a2030", bgPattern: "ring", spawnPos: { x: 400, y: 580 },
    walls: stdWalls(900, 700),
    doors: [{ id: "exit", x: 380, y: 660, w: 80, h: 40, targetScene: "outside", targetPos: { x: 2070, y: 560 }, label: "Outside", color: COLORS.doorway }],
    interactables: [
      { id: "fight-pit", x: 360, y: 220, w: 180, h: 60, label: "Choose Fighter", type: "fight-pit", emoji: "🥊" },
      { id: "rules-poster", x: 100, y: 100, w: 100, h: 80, label: "First rule of Fight Club: chud harder", type: "easter-text", emoji: "📜" },
      { id: "bell", x: 700, y: 100, w: 60, h: 80, label: "Ring bell (already cracked)", type: "easter-object", emoji: "🔔" },
      { id: "blood-stain-fc", x: 100, y: 480, w: 100, h: 50, label: "Blood stain shaped like Pitounbibtibi", type: "easter-text", emoji: "🩸" },
    ],
  },

  chudzone: {
    id: "chudzone", name: "Chud Zone", width: 900, height: 700,
    bgColor: "#503020", bgPattern: "concrete", spawnPos: { x: 400, y: 580 },
    walls: stdWalls(900, 700),
    doors: [{ id: "exit", x: 380, y: 660, w: 80, h: 40, targetScene: "outside", targetPos: { x: 2540, y: 560 }, label: "Outside", color: COLORS.doorway }],
    interactables: [
      { id: "chud-circle", x: 380, y: 200, w: 160, h: 60, label: "Chud Out with Friends", type: "chud-circle", emoji: "🤤" },
      { id: "energy-cans", x: 100, y: 100, w: 80, h: 80, label: "Mountain of energy drink cans", type: "easter-text", emoji: "🥫" },
      { id: "broken-tv", x: 700, y: 100, w: 100, h: 80, label: "Broken TV (chudded too hard)", type: "easter-text", emoji: "📺" },
      { id: "anish-mic", x: 700, y: 400, w: 60, h: 80, label: "Anish's stand-up mic (cringe)", type: "easter-text", emoji: "🎤" },
      { id: "cigs", x: 100, y: 400, w: 60, h: 60, label: "Cigarette butts spelling 'CHUD'", type: "easter-text", emoji: "🚬" },
    ],
  },

  moggayla: {
    id: "moggayla", name: "Moggayla's Apt", width: 900, height: 700,
    bgColor: "#3a2820", bgPattern: "carpet", spawnPos: { x: 400, y: 580 },
    walls: stdWalls(900, 700),
    doors: [{ id: "exit", x: 380, y: 660, w: 80, h: 40, targetScene: "outside", targetPos: { x: 460, y: 1310 }, label: "Outside", color: COLORS.doorway }],
    interactables: [
      { id: "crack-btn", x: 280, y: 460, w: 160, h: 50, label: "crack", type: "moggayla-crack", emoji: "💥" },
      { id: "egg-mog-1", x: 80, y: 80, w: 80, h: 60, label: "Trembling photo: 'Bouboule 2024'", type: "easter-text", emoji: "🖼️" },
      { id: "egg-mog-2", x: 700, y: 80, w: 80, h: 60, label: "Diary: 'mogg her, daily'", type: "easter-text", emoji: "📖" },
      { id: "mog-meter", x: 80, y: 460, w: 80, h: 80, label: "Mogg-meter (broken at 100%)", type: "easter-text", emoji: "📈" },
      { id: "empty-fridge", x: 700, y: 460, w: 80, h: 80, label: "Empty fridge (she ate it all)", type: "easter-text", emoji: "🧊" },
      { id: "ring-light", x: 700, y: 250, w: 80, h: 80, label: "TikTok ring light (covered in dust)", type: "easter-text", emoji: "💡" },
    ],
  },

  cartier: {
    id: "cartier", name: "Cartier Santos Shop", width: 900, height: 700,
    bgColor: "#1a2030", bgPattern: "tile", spawnPos: { x: 400, y: 580 },
    walls: stdWalls(900, 700),
    doors: [{ id: "exit", x: 380, y: 660, w: 80, h: 40, targetScene: "outside", targetPos: { x: 860, y: 1310 }, label: "Outside", color: COLORS.doorway }],
    interactables: [
      { id: "egg-cart-1", x: 200, y: 100, w: 100, h: 80, label: "Display: Cartier Santos Watch", type: "easter-object", emoji: "⌚" },
      { id: "egg-cart-2", x: 600, y: 100, w: 100, h: 80, label: "Poster: 'Wolf Santos Bobitos'", type: "easter-text", emoji: "🐺" },
      { id: "egg-cart-3", x: 400, y: 320, w: 100, h: 80, label: "Receipt: '37,500€ paid by Wolf'", type: "easter-text", emoji: "🧾" },
      { id: "watch-box", x: 100, y: 460, w: 80, h: 60, label: "Watch box stolen from Wolf", type: "easter-text", emoji: "📦" },
      { id: "mannequin", x: 700, y: 460, w: 80, h: 100, label: "Mannequin wearing 8 Cartiers", type: "easter-text", emoji: "🧍" },
      { id: "crying-rep", x: 100, y: 280, w: 80, h: 60, label: "Sales rep crying in corner", type: "easter-text", emoji: "😭" },
    ],
  },

  nelly: {
    id: "nelly", name: "Nelly's Belly Bar", width: 900, height: 700,
    bgColor: "#3a2030", bgPattern: "wood", spawnPos: { x: 400, y: 580 },
    walls: stdWalls(900, 700),
    doors: [{ id: "exit", x: 380, y: 660, w: 80, h: 40, targetScene: "outside", targetPos: { x: 1260, y: 1310 }, label: "Outside", color: COLORS.doorway }],
    interactables: [
      { id: "nelly-belly", x: 200, y: 100, w: 200, h: 60, label: "yo Nelly check out my belly", type: "easter-text", emoji: "🥁" },
      { id: "nelly-jukebox", x: 600, y: 100, w: 100, h: 100, label: "Jukebox: 'Hot in Herre'", type: "easter-object", emoji: "🎶" },
      { id: "nelly-belly-photo", x: 400, y: 320, w: 100, h: 80, label: "Photo of Martin's belly", type: "easter-text", emoji: "📸" },
      { id: "belly-cocktails", x: 100, y: 460, w: 100, h: 80, label: "Belly-themed cocktails menu", type: "easter-text", emoji: "🍸" },
      { id: "broken-bench", x: 700, y: 460, w: 100, h: 60, label: "Bench that broke under Martin", type: "easter-text", emoji: "🪑" },
      { id: "nelly-merch", x: 100, y: 280, w: 80, h: 60, label: "Nelly merch (XXXXL only)", type: "easter-text", emoji: "👕" },
    ],
  },

  gym: {
    id: "gym", name: "Daron's Gym", width: 900, height: 700,
    bgColor: "#2a2a1a", bgPattern: "concrete", spawnPos: { x: 400, y: 580 },
    walls: stdWalls(900, 700),
    doors: [{ id: "exit", x: 380, y: 660, w: 80, h: 40, targetScene: "outside", targetPos: { x: 1670, y: 1310 }, label: "Outside", color: COLORS.doorway }],
    interactables: [
      { id: "gym-bench", x: 200, y: 100, w: 120, h: 80, label: "Bench Press (broken under Martin)", type: "easter-object", emoji: "🏋️" },
      { id: "gym-poster", x: 600, y: 100, w: 100, h: 100, label: "Poster: Daniel Jhondon Daron", type: "easter-text", emoji: "💪" },
      { id: "gym-sign", x: 400, y: 320, w: 200, h: 60, label: "Sign: 'NO CHUDS ALLOWED' (ignored)", type: "easter-text", emoji: "🚫" },
      { id: "daron-jersey", x: 100, y: 460, w: 80, h: 80, label: "Autographed Daron jersey", type: "easter-text", emoji: "👕" },
      { id: "rakia-shaker", x: 700, y: 460, w: 80, h: 80, label: "Protein shaker filled with rakia", type: "decor-eat", emoji: "🥃" },
      { id: "treadmill", x: 100, y: 280, w: 100, h: 60, label: "Treadmill (never used)", type: "easter-text", emoji: "🏃" },
    ],
  },

  asbestos: {
    id: "asbestos", name: "Asbestos Poubelle", width: 900, height: 700,
    bgColor: "#1a1a1a", bgPattern: "concrete", spawnPos: { x: 400, y: 580 },
    walls: stdWalls(900, 700),
    doors: [{ id: "exit", x: 380, y: 660, w: 80, h: 40, targetScene: "outside", targetPos: { x: 2060, y: 1310 }, label: "Outside", color: COLORS.doorway }],
    interactables: [
      { id: "asb-bin", x: 200, y: 100, w: 100, h: 120, label: "Eat asbestos from bin", type: "decor-eat", emoji: "☣️" },
      { id: "asb-poster", x: 600, y: 100, w: 100, h: 100, label: "Poster: 'Asbestos Poubelle Coffee'", type: "easter-text", emoji: "☕" },
      { id: "asb-sign", x: 400, y: 320, w: 200, h: 60, label: "Warning: not approved by Cousin", type: "easter-text", emoji: "⚠️" },
      { id: "asb-menu", x: 100, y: 460, w: 80, h: 80, label: "Asbestos coffee menu (only 1 item)", type: "easter-text", emoji: "📋" },
      { id: "asb-chips", x: 700, y: 460, w: 80, h: 80, label: "Asbestos-flavored chips", type: "decor-eat", emoji: "🥨" },
      { id: "disclaimer", x: 100, y: 280, w: 80, h: 60, label: "Disclaimer (in fine print)", type: "easter-text", emoji: "📄" },
    ],
  },

  fishing: {
    id: "fishing", name: "Fishing Dock", width: 900, height: 700,
    bgColor: "#2a4858", bgPattern: "water", spawnPos: { x: 400, y: 580 },
    walls: stdWalls(900, 700),
    doors: [{ id: "exit", x: 380, y: 660, w: 80, h: 40, targetScene: "outside", targetPos: { x: 860, y: 1920 }, label: "Outside", color: COLORS.doorway }],
    interactables: [
      { id: "fishing-rod", x: 380, y: 200, w: 140, h: 50, label: "Cast fishing line", type: "fishing-rod", emoji: "🎣" },
      { id: "bait-bucket", x: 100, y: 100, w: 80, h: 80, label: "Bobby's Bait Bucket", type: "easter-text", emoji: "🪣" },
      { id: "dead-fish", x: 700, y: 100, w: 80, h: 80, label: "Dead fish (too cooked to eat)", type: "easter-text", emoji: "🐟" },
      { id: "fishing-diary", x: 100, y: 380, w: 100, h: 80, label: "Carl's diary: 'Caught Wolf today'", type: "easter-text", emoji: "📓" },
      { id: "sus-pole", x: 700, y: 380, w: 100, h: 80, label: "Sus pole signed by Cousin", type: "easter-text", emoji: "🪧" },
      { id: "fish-hook", x: 380, y: 460, w: 60, h: 60, label: "A fishhook the size of a Cousin", type: "easter-text", emoji: "🪝" },
      { id: "boat", x: 480, y: 460, w: 80, h: 60, label: "Capsized rowboat (Wolf-shaped dent)", type: "easter-text", emoji: "🚣" },
    ],
  },

  stripclub: {
    id: "stripclub", name: "Strip Club: McMoggayla's", width: 900, height: 700,
    bgColor: "#3a0a30", bgPattern: "club", spawnPos: { x: 400, y: 580 },
    walls: stdWalls(900, 700),
    doors: [{ id: "exit", x: 380, y: 660, w: 80, h: 40, targetScene: "outside", targetPos: { x: 460, y: 1920 }, label: "Outside", color: COLORS.doorway }],
    interactables: [
      { id: "tip-jar", x: 100, y: 100, w: 80, h: 80, label: "Tip jar (chud only)", type: "tip-jar", emoji: "💰" },
      { id: "lap-pole", x: 700, y: 100, w: 80, h: 200, label: "Stripper pole (already worn out)", type: "easter-object", emoji: "🪴" },
      { id: "vip-booth", x: 100, y: 380, w: 120, h: 80, label: "VIP booth (smells like rakia)", type: "easter-text", emoji: "🛋️" },
      { id: "mcmog-crack", x: 280, y: 460, w: 200, h: 50, label: "crack McMoggayla", type: "moggayla-crack", emoji: "💥" },
      { id: "stripclub-poster", x: 400, y: 200, w: 120, h: 100, label: "Poster: McMoggayla 2X TONITE", type: "easter-text", emoji: "🎭" },
      { id: "club-bar", x: 700, y: 460, w: 100, h: 80, label: "Bar: 1 drink = 1 chud", type: "decor-eat", emoji: "🍹" },
    ],
  },

  // SECRET: underground tunnel connecting basement to chud zone
  tunnel: {
    id: "tunnel", name: "???", width: 700, height: 400,
    bgColor: "#0a0805", bgPattern: "concrete", spawnPos: { x: 100, y: 200 },
    walls: stdWalls(700, 400),
    doors: [
      { id: "tunnel-to-basement", x: 30, y: 170, w: 50, h: 60, targetScene: "basement", targetPos: { x: 200, y: 480 }, label: "← Basement", color: "#1a0a05" },
      { id: "tunnel-to-chudzone", x: 620, y: 170, w: 50, h: 60, targetScene: "chudzone", targetPos: { x: 150, y: 500 }, label: "Chud Zone →", color: "#503020" },
    ],
    interactables: [
      { id: "tunnel-graffiti", x: 200, y: 80, w: 120, h: 60, label: "Graffiti: 'Cousin was here. So was Kai.'", type: "easter-text", emoji: "🎨" },
      { id: "tunnel-bones", x: 400, y: 280, w: 80, h: 60, label: "A trail of gnawed bones", type: "easter-text", emoji: "🦴" },
      { id: "tunnel-stash", x: 580, y: 80, w: 80, h: 80, label: "Hidden stash: $30 and a moldy sandwich", type: "secret-stash", emoji: "💰" },
      { id: "tunnel-hole", x: 300, y: 150, w: 100, h: 80, label: "A hole in the wall. Someone scratched 'MARTIN' in it.", type: "easter-text", emoji: "🕳️" },
    ],
  },

  // SECRET: locked room in Martin's house — very hidden
  "hidden-room": {
    id: "hidden-room", name: "???", width: 600, height: 500,
    bgColor: "#100808", bgPattern: "carpet", spawnPos: { x: 300, y: 420 },
    walls: stdWalls(600, 500),
    doors: [
      { id: "hidden-exit", x: 270, y: 460, w: 60, h: 30, targetScene: "home", targetPos: { x: 550, y: 350 }, label: "← Back", color: "#3a1010" },
    ],
    interactables: [
      { id: "secret-diary", x: 80, y: 80, w: 100, h: 80, label: "Martin's secret diary. 80% chud entries.", type: "secret-diary", emoji: "📓" },
      { id: "secret-photo", x: 420, y: 80, w: 80, h: 80, label: "Photo of a woman. 'Pitounbibtibi 2019' on the back.", type: "easter-text", emoji: "📸" },
      { id: "secret-trophy", x: 250, y: 100, w: 100, h: 80, label: "Trophy: '1st place — Regional Chud Championship'", type: "easter-object", emoji: "🏆" },
      { id: "secret-cash", x: 80, y: 320, w: 80, h: 80, label: "Emergency cash hidden in sock", type: "secret-stash", emoji: "💵" },
      { id: "secret-mirror", x: 420, y: 280, w: 80, h: 100, label: "A mirror. Martin stares. Something stares back.", type: "easter-text", emoji: "🪞" },
    ],
  },

  boutique: {
    id: "boutique", name: "MoggMcCrackeggayla Boutique", width: 900, height: 700,
    bgColor: "#4a3828", bgPattern: "carpet", spawnPos: { x: 400, y: 580 },
    walls: stdWalls(900, 700),
    doors: [{ id: "exit", x: 380, y: 660, w: 80, h: 40, targetScene: "outside", targetPos: { x: 2050, y: 1920 }, label: "Outside", color: COLORS.doorway }],
    interactables: [
      { id: "bt-mirror", x: 700, y: 80, w: 80, h: 100, label: "Full-length mirror (MoGgayla-sized)", type: "easter-text", emoji: "🪞" },
      { id: "bt-rack", x: 100, y: 200, w: 120, h: 80, label: "Rack of designer boubous", type: "easter-text", emoji: "👗" },
      { id: "bt-perfume", x: 100, y: 400, w: 80, h: 60, label: "Perfume: 'Eau de Chud'", type: "easter-text", emoji: "🧴" },
      { id: "bt-counter", x: 350, y: 180, w: 200, h: 60, label: "Boutique counter", type: "easter-text", emoji: "💎" },
    ],
  },
};
