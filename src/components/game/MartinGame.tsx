import { useEffect, useRef, useState, useCallback } from "react";
import { SCENES, NPC_DEFS, MOLDY_FOODS, STREET_FOODS, FIGHTERS, CHUD_ACTIVITIES, ALL_QUESTS, DAY_LENGTH_SECONDS, DAY_START_HOUR, DAY_END_HOUR, PLAYER_SPEED, PLAYER_RADIUS, CALL_SCRIPTS, DAILY_EVENTS, SCENE_INTERESTS } from "@/game/world";
import type { Direction, GameStats, Interactable, MartinState, NpcDef, NpcRuntime, SceneId, CarState } from "@/game/types";
import { clamp, dist, randomChoice, randomInt } from "@/lib/utils";
import { sound } from "@/game/sound";
import HUD from "./HUD";
import DialogPanel from "./DialogPanel";
import PhoneMenu from "./PhoneMenu";

interface KeyState { up: boolean; down: boolean; left: boolean; right: boolean; interact: boolean; phone: boolean; mute: boolean; gear1: boolean; gear2: boolean; gear3: boolean; gear4: boolean; reverse: boolean; headlights: boolean; neutral: boolean; garageDoor: boolean; startEngine: boolean; }

interface ShadowChud {
  x: number; y: number;
  speed: number;
  phase: number; // for wobble animation
  warningShown: boolean;
}

interface FightState {
  opponentId: string; opponentHp: number; opponentMaxHp: number; martinHp: number;
  log: string[]; turn: "player" | "enemy" | "animating"; ended: boolean; victory: boolean;
  martinAnim: "idle" | "attack" | "block" | "hit" | "ko";
  oppAnim: "idle" | "attack" | "block" | "hit" | "ko";
  martinAnimKey: number; oppAnimKey: number;
  kapowText: string | null; kapowKey: number;
}

type DialogChoice = { label: string; onSelect: () => void; danger?: boolean; primary?: boolean };
type DialogPayload = { title: string; body: string; choices: DialogChoice[]; emoji?: string } | null;

const KEY_MAP: Record<string, keyof KeyState> = {
  ArrowUp: "up", w: "up", W: "up",
  ArrowDown: "down", s: "down", S: "down",
  ArrowLeft: "left", a: "left", A: "left",
  ArrowRight: "right", d: "right", D: "right",
  e: "interact", E: "interact", Enter: "interact",
  p: "phone", P: "phone",
  m: "mute", M: "mute",
  "1": "gear1", "2": "gear2", "3": "gear3", "4": "gear4",
  r: "reverse", R: "reverse",
  h: "headlights", H: "headlights",
  n: "neutral", N: "neutral",
  g: "garageDoor", G: "garageDoor",
  " ": "startEngine",
};

function makeNpcs(): NpcRuntime[] {
  return NPC_DEFS.map((def) => ({
    def, scene: def.homeScene, x: def.baseX, y: def.baseY,
    targetX: def.baseX, targetY: def.baseY, walkPhase: 0,
    speed: 0.8 + Math.random() * 0.5, thoughtTimer: Math.random() * 2000,
    transformed: false, pendingMoveTimer: 0,
    mood: def.defaultMood ?? "neutral", activity: def.behavior, activityTimer: 0,
    reactionEmoji: null, reactionTimer: 0, partnerId: null,
    speechBubble: null, speechTimer: 0, facingDir: "down",
    emotion: def.defaultMood ?? "neutral", emotionTimer: 0,
    friendship: 20,
    ballX: def.behavior === "soccer" ? def.baseX + 30 : undefined,
    ballY: def.behavior === "soccer" ? def.baseY + 30 : undefined,
    ballVX: 0, ballVY: 0,
    anger: 0, hp: 50,
    asleep: false, stalking: false, pickpocketCd: 0,
    goingHome: false, stuckTimer: 0,
  }));
}

function mergeNpcs(saved: any[] | undefined): NpcRuntime[] {
  const current = makeNpcs();
  if (!saved || !Array.isArray(saved)) return current;
  const savedById = new Map(saved.map((n) => [n.def?.id, n]));
  return current.map((n) => {
    const s = savedById.get(n.def.id);
    if (!s) return n;
    return { ...n, ...s, def: n.def };
  });
}

function initialStats(): GameStats {
  return {
    money: 0, hunger: 30, chud: 0, day: 1, timeSec: 0, shake: 0,
    dead: false, causeOfDeath: "",
    tutoratAvailable: true, tutoratDoneToday: false,
    totalMoneyEarned: 0, fightsWon: 0, fightsLost: 0,
    fightsWonToday: 0, fightsWonFighters: [],
    npcsTransformed: 0, foodsEaten: 0,
    shitsToday: 0, tutoratStreak: 0,
    calledNpcs: [], survivedNight: false,
    dailyEvent: null, secretsFound: [],
    questsCompleted: ["wake-up"], scenesVisited: ["home"],
    tutorialStep: 0,
    buttplugQuestStep: 0, hasHummus: false, hasButtplug: false, hellDefeated: false, hasTicket: false,
    apartmentKeys: [],
  };
}

function loadSaveData(): { stats: GameStats; martin: MartinState; npcs: NpcRuntime[] } | null {
  try {
    const saved = localStorage.getItem("martinGameSave");
    if (!saved) return null;
    const data = JSON.parse(saved);
    const scene = data.martin?.scene ?? "home";
    const spawnPos = SCENES[scene]?.spawnPos ?? { x: 420, y: 580 };
    return {
      stats: { ...initialStats(), ...data.stats, hellDefeated: data.stats?.hellDefeated ?? false, apartmentKeys: data.stats?.apartmentKeys ?? [] },
      martin: { scene, x: spawnPos.x, y: spawnPos.y, dir: "down", walking: false, walkPhase: 0, hp: data.martin?.hp ?? 100, hpMax: data.martin?.hpMax ?? 100 },
      npcs: mergeNpcs(data.npcs),
    };
  } catch {
    return null;
  }
}

export default function MartinGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showStart, setShowStart] = useState(() => !localStorage.getItem("martinGameSave"));
  const [transitionFlash, setTransitionFlash] = useState(0);
  const [dialog, setDialog] = useState<DialogPayload>(null);
  const [fight, setFight] = useState<FightState | null>(null);
  const [toast, setToast] = useState<{ msg: string; key: number } | null>(null);
  const [showPhone, setShowPhone] = useState(false);
  const [flightAnim, setFlightAnim] = useState<{ phase: "idle" | "takeoff" | "flying" | "landing"; timer: number; } | null>(null);
  const [muted, setMuted] = useState(false);
  const dialogRef = useRef<DialogPayload>(null); dialogRef.current = dialog;
  const fightRef = useRef<FightState | null>(null); fightRef.current = fight;
  const showPhoneRef = useRef(false); showPhoneRef.current = showPhone;

  const savedData = typeof window !== "undefined" ? loadSaveData() : null;

  const martinRef = useRef<MartinState>(savedData?.martin ?? { scene: "home", x: 420, y: 580, dir: "down", walking: false, walkPhase: 0, hp: 100, hpMax: 100 });
  const statsRef = useRef<GameStats>(savedData?.stats ?? initialStats());
  const npcsRef = useRef<NpcRuntime[]>(savedData?.npcs ?? makeNpcs());
  const keysRef = useRef<KeyState>({ up: false, down: false, left: false, right: false, interact: false, phone: false, mute: false, gear1: false, gear2: false, gear3: false, gear4: false, reverse: false, headlights: false, neutral: false, garageDoor: false });
  const lastInteractRef = useRef(0);
  const lastPhoneRef = useRef(0);
  const lastMuteRef = useRef(0);
  const lastGarageRef = useRef(0);
  const cameraRef = useRef({ x: 0, y: 0 });
  const eatTimerRef = useRef(0);
  const cousinChompCdRef = useRef(0);
  const stepSoundCdRef = useRef(0);
  const shadowChudRef = useRef<ShadowChud | null>(null);
  const shadowChudCdRef = useRef(0); // cooldown between bites
  const nightWarningShownRef = useRef(false);
  const ballAnimRef = useRef<{ t: number; made: boolean } | null>(null); // basketball arc anim
  const hellBossRef = useRef<{ hp: number; hpMax: number; x: number; y: number; punchCd: number; barrageCd: number; walkPhase: number; dir: Direction } | null>(null);
  const hellProjectilesRef = useRef<{ x: number; y: number; vx: number; vy: number; damage: number; active: boolean; emoji: string }[]>([]);
  const hellPickupsRef = useRef<{ x: number; y: number; type: "gun" | "food"; active: boolean; timer: number; lifetime: number }[]>([]);
  const playerGunRef = useRef<{ active: boolean; ammo: number; timer: number } | null>(null);
  const punchCdRef = useRef(0);
  const greaseCdRef = useRef(0);
  const hellWelcomeRef = useRef(0);
  const greaseProjectilesRef = useRef<{ x: number; y: number; vx: number; vy: number; active: boolean }[]>([]);
  const carRef = useRef<CarState>({ x: 400, y: 120, angle: Math.PI / 2, speed: 0, gear: 0, gas: 100, headlights: false, engineRunning: false, inCar: false, steerAngle: 0, driftAngle: Math.PI / 2, rpm: 0, scene: "garage" });
  const garageDoorOpen = useRef(false);
  const gunSpawnCdRef = useRef(0);
  const foodSpawnCdRef = useRef(0);
  const flightAnimRef = useRef<{ phase: "idle" | "takeoff" | "flying" | "landing"; timer: number; } | null>(null); flightAnimRef.current = flightAnim;
  const [, forceUpdate] = useState(0);

  const showToast = useCallback((msg: string) => setToast({ msg, key: Date.now() + Math.random() }), []);
  const triggerTransition = useCallback(() => setTransitionFlash((n) => n + 1), []);

  // Save/Load functions
  const saveGame = useCallback(() => {
    try {
      const saveData = {
        version: 1,
        stats: statsRef.current,
        martin: martinRef.current,
        npcs: npcsRef.current,
        timestamp: Date.now(),
      };
      localStorage.setItem("martinGameSave", JSON.stringify(saveData));
    } catch (e) {
      console.error("Failed to save game:", e);
    }
  }, []);

  const hasSave = useCallback(() => {
    return !!localStorage.getItem("martinGameSave");
  }, []);

  const clearSave = useCallback(() => {
    localStorage.removeItem("martinGameSave");
  }, []);

  const loadGame = useCallback(() => {
    const saved = localStorage.getItem("martinGameSave");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        statsRef.current = { ...initialStats(), ...data.stats, hellDefeated: data.stats?.hellDefeated ?? false, apartmentKeys: data.stats?.apartmentKeys ?? [] };
        const scene = data.martin?.scene ?? "home";
        const spawnPos = SCENES[scene]?.spawnPos ?? { x: 420, y: 580 };
        martinRef.current = { scene, x: spawnPos.x, y: spawnPos.y, dir: "down", walking: false, walkPhase: 0, hp: data.martin?.hp ?? 100, hpMax: data.martin?.hpMax ?? 100 };
        npcsRef.current = mergeNpcs(data.npcs);
        return true;
      } catch (e) {
        console.error("Failed to load save:", e);
        return false;
      }
    }
    return false;
  }, []);

  const completeQuest = useCallback((id: string) => {
    if (statsRef.current.questsCompleted.includes(id)) return;
    statsRef.current.questsCompleted.push(id);
    const hardQuests = ["win-3-fights","transform-all","survive-night","broke","call-everyone","fish-wolf","full-hunger","toilet-5","fight-all","chud-80","tutorat-3days"];
    const reward = hardQuests.includes(id) ? 50 : 20;
    statsRef.current.money += reward;
    statsRef.current.totalMoneyEarned += reward;
    sound.play("questDone");
    showToast(`✓ Quest: ${ALL_QUESTS.find((q) => q.id === id)?.label} (+$${reward})`);
    saveGame();
  }, [showToast, saveGame]);

  const visitScene = useCallback((id: SceneId) => {
    if (!statsRef.current.scenesVisited.includes(id)) {
      statsRef.current.scenesVisited.push(id);
    }
    if (id === "basement") completeQuest("explore-basement");
    if (id === "upstairs") completeQuest("explore-upstairs");
  }, [completeQuest]);

  const moveToScene = useCallback((scene: SceneId, x: number, y: number) => {
    martinRef.current.scene = scene;
    martinRef.current.x = x;
    martinRef.current.y = y;
    triggerTransition();
    sound.play("door");
    visitScene(scene);
    saveGame();
  }, [triggerTransition, visitScene, saveGame]);

  // UI tick
  const [, setUiTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setUiTick((n) => (n + 1) % 1_000_000), 100);
    return () => clearInterval(id);
  }, []);

  // Auto-save during play
  useEffect(() => {
    if (showStart) return;
    const id = setInterval(() => saveGame(), 30000);
    const onUnload = () => saveGame();
    window.addEventListener("beforeunload", onUnload);
    return () => { clearInterval(id); window.removeEventListener("beforeunload", onUnload); };
  }, [showStart, saveGame]);

  // Input
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (showStart) return;
      const k = KEY_MAP[e.key];
      if (k) { keysRef.current[k] = true; e.preventDefault(); }
    };
    const up = (e: KeyboardEvent) => {
      const k = KEY_MAP[e.key];
      if (k) keysRef.current[k] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [showStart]);

  // Helpers
  const addChud = useCallback((n: number) => {
    statsRef.current.chud = clamp(statsRef.current.chud + n, 0, 100);
    if (statsRef.current.chud >= 90) sound.startAlarm();
    else sound.stopAlarm();
    // Chud now slows movement instead of killing
  }, []);

  const addFriendship = useCallback((npcId: string, amount: number) => {
    const npc = npcsRef.current.find(n => n.def.id === npcId);
    if (npc) npc.friendship = clamp(npc.friendship + amount, 0, 100);
  }, []);
  const addMoney = useCallback((n: number) => {
    statsRef.current.money = Math.max(0, statsRef.current.money + n);
    if (n > 0) statsRef.current.totalMoneyEarned += n;
    if (n > 0) sound.play("coin");
  }, []);
  const addHunger = useCallback((n: number) => {
    statsRef.current.hunger = clamp(statsRef.current.hunger + n, 0, 100);
  }, []);

  const reactNearbyNpcs = useCallback((emoji: string, range = 220) => {
    const m = martinRef.current;
    npcsRef.current.forEach((n) => {
      if (n.scene === m.scene && !n.transformed && dist(n.x, n.y, m.x, m.y) < range) {
        n.reactionEmoji = emoji; n.reactionTimer = 1800;
      }
    });
  }, []);

  const startNewDay = useCallback(() => {
    const s = statsRef.current;
    // Check night survival quest
    if (s.survivedNight) completeQuest("survive-night");
    // Check tutorat streak
    if (s.tutoratDoneToday) {
      s.tutoratStreak += 1;
      if (s.tutoratStreak >= 3) completeQuest("tutorat-3days");
    } else {
      s.tutoratStreak = 0;
    }
    s.day += 1;
    s.timeSec = 0;
    s.tutoratAvailable = Math.random() < 0.5;
    s.tutoratDoneToday = false;
    s.hunger = clamp(s.hunger + 20, 0, 100);
    s.fightsWonToday = 0;
    s.shitsToday = 0;
    s.survivedNight = false;
    martinRef.current.hp = martinRef.current.hpMax;
    moveToScene("home", 420, 580);
    shadowChudRef.current = null;
    nightWarningShownRef.current = false;
    hellBossRef.current = null;
    hellProjectilesRef.current = [];
    hellPickupsRef.current = [];
    playerGunRef.current = null;
    npcsRef.current.forEach((n) => {
      if (Math.random() < 0.6) n.transformed = false;
      n.scene = n.def.homeScene;
      n.x = n.def.baseX + randomInt(-30, 30);
      n.y = n.def.baseY + randomInt(-30, 30);
      n.targetX = n.x; n.targetY = n.y;
      n.activity = n.def.behavior; n.activityTimer = 0;
      n.partnerId = null; n.speechBubble = null; n.speechTimer = 0;
    });
    // Pick random daily event (70% chance)
    let eventMsg = "";
    if (Math.random() < 0.7) {
      const evt = DAILY_EVENTS[Math.floor(Math.random() * DAILY_EVENTS.length)];
      s.dailyEvent = evt.id;
      eventMsg = `\n${evt.title}: ${evt.description}`;
      // Apply immediate effects
      if (evt.effect === "tutorat-closed") s.tutoratAvailable = false;
      if (evt.effect === "cousin-loose") {
        // Move Cousin to outside world
        const cousin = npcsRef.current.find(n => n.def.id === "cousin-roy");
        if (cousin) { cousin.scene = "outside"; cousin.x = 1400; cousin.y = 1000; cousin.targetX = 1400; cousin.targetY = 1000; }
      }
    } else {
      s.dailyEvent = null;
    }
    sound.play("sleep");
    showToast(`Day ${statsRef.current.day} • ${statsRef.current.tutoratAvailable ? "Tutorat available!" : "No tutorat today"}${eventMsg}`);
  }, [moveToScene, showToast]);

  const startGame = (fresh = false) => {
    sound.init(); sound.resume();
    if (fresh) {
      clearSave();
      statsRef.current = initialStats();
      martinRef.current = { scene: "home", x: 420, y: 580, dir: "down", walking: false, walkPhase: 0, hp: 100, hpMax: 100 };
      npcsRef.current = makeNpcs();
    } else {
      const loaded = loadGame();
      if (!loaded) {
        statsRef.current.tutoratAvailable = true;
        martinRef.current.scene = "home";
        martinRef.current.x = 420; martinRef.current.y = 580;
      }
    }
    setShowStart(false);
    if (fresh || statsRef.current.tutorialStep === 0) {
      statsRef.current.tutorialStep = 1;
      showToast("Tutorial: Go open the fridge (ice block) to start!");
      saveGame();
    } else if (!fresh && hasSave()) {
      showToast("Game loaded! Welcome back, Martin.");
    } else {
      showToast("Day 1 • Wake up Martin. WASD to move. E to interact. P for phone.");
    }
  };

  // Init sound when resuming a saved session (skip start screen)
  useEffect(() => {
    if (savedData) {
      sound.init();
      sound.resume();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dialog actions
  const openFridge = () => {
    sound.play("fridge");
    setDialog({
      title: "The Fridge", emoji: "🧊",
      body: "It reeks. Pick a moldy item to feast on.",
      choices: MOLDY_FOODS.map((f) => ({
        label: `${f.emoji} ${f.name} (-${f.hunger} hunger, +${f.chud} chud)`,
        onSelect: () => {
          addHunger(-f.hunger * (statsRef.current.dailyEvent === "free-food" ? 2 : 1)); addChud(f.chud);
          eatTimerRef.current = 60;
          statsRef.current.foodsEaten += 1;
          completeQuest("eat-fridge");
          sound.play("eat");
          setTimeout(() => sound.play("burp"), 400);
          reactNearbyNpcs("🤢");
          setDialog(null);
          showToast(`Martin devours ${f.name}. Burps moldily.`);
          // Tutorial progression
          if (statsRef.current.tutorialStep === 1) {
            statsRef.current.tutorialStep = 2;
            showToast("Tutorial: Now go talk to your mom upstairs!");
            saveGame();
          }
        },
      })).concat([{ label: "Close fridge", onSelect: () => setDialog(null) }]),
    });
  };

  const eatStreetFood = (it: Interactable) => {
    const food = STREET_FOODS.find((f) => f.emoji === it.emoji) ?? randomChoice(STREET_FOODS);
    setDialog({
      title: "Eat the world", emoji: it.emoji,
      body: `You shove ${food.name} down your throat. NOT filling but the chud rejoices.`,
      choices: [
        { label: `Eat ${food.name} (+${food.chud} chud)`, primary: true,
          onSelect: () => {
            addChud(food.chud); eatTimerRef.current = 60;
            statsRef.current.foodsEaten += 1;
            sound.play("eat"); reactNearbyNpcs("🤔");
            setDialog(null);
            showToast(`Martin chomps a ${food.name}. Hunger unchanged.`);
          } },
        { label: "Walk away", onSelect: () => setDialog(null) },
      ],
    });
  };

  const startTutorat = () => {
    if (!statsRef.current.tutoratAvailable || statsRef.current.dailyEvent === "tutorat-closed") {
      setDialog({
        title: "Tutorat Center", emoji: "📚",
        body: statsRef.current.dailyEvent === "tutorat-closed"
          ? "Caillo called in sick today. No tutorat."
          : "u chud nobody wants to take tutorat with you. Caillo isn't here today.",
        choices: [{ label: "Leave", onSelect: () => setDialog(null) }],
      }); return;
    }
    if (statsRef.current.tutoratDoneToday) {
      setDialog({ title: "Tutorat Center", emoji: "📚", body: "You already taught Caillo today. He went home crying.",
        choices: [{ label: "Leave", onSelect: () => setDialog(null) }] }); return;
    }
    const earn = 50 + randomInt(-10, 30);
    setDialog({
      title: "Tutoring Caillo Qui Casse les Couilles", emoji: "📚",
      body: `Caillo asks you 14 stupid questions in a row. Somehow you teach him pre-algebra.\n\nYou earned $${earn}.`,
      choices: [{ label: "Pocket the cash", primary: true,
        onSelect: () => {
          addMoney(earn); statsRef.current.tutoratDoneToday = true;
          statsRef.current.timeSec += 60; completeQuest("tutorat");
          setDialog(null);
          showToast(`+ $${earn} from tutorat`);
        } }],
    });
  };

  const transformNpc = (npc: NpcRuntime) => {
    npc.transformed = true;
    npc.emotion = "shocked"; npc.emotionTimer = 3000;
    statsRef.current.npcsTransformed += 1;
    completeQuest("transform");
    // Check if all transformable NPCs are now transformed
    const transformable = npcsRef.current.filter(n => !["cousin-roy","mom"].includes(n.def.id));
    if (transformable.every(n => n.transformed)) completeQuest("transform-all");
    sound.play("transform");
    reactNearbyNpcs("😱");
    let text = "";
    switch (npc.def.transformForm) {
      case "basketball": text = "Charle compresses into a perfect orange basketball. He's still slightly screaming."; break;
      case "vegetable-wheelchair": text = "Damian becomes a wheelchair vegetable. He'll roll around for the rest of the day."; break;
      case "cartier-watch": text = "Wolf collapses into a Cartier Santos watch. Ticks aggressively."; break;
      case "bulgarian-flag": text = `${npc.def.name} unfurls into a perfect Bulgarian flag.`; break;
      case "israeli-flag": text = `${npc.def.name} unfolds into a crisp Israeli flag.`; break;
      case "bouboule": text = `${npc.def.name} rounds out into a giant black circle: the Bouboule.`; break;
      case "trash-can": text = "Anish becomes a trash can. Fitting."; break;
      case "rock": text = `${npc.def.name} becomes a literal rock. Finally peace.`; break;
      default: text = `${npc.def.name} becomes a ${npc.def.transformForm}.`;
    }
    showToast(text);
  };

  const transformCharle = () => {
    const charle = npcsRef.current.find((n) => n.def.id === "charle");
    if (!charle) return;
    if (!charle.transformed) {
      charle.transformed = true; charle.scene = "court";
      charle.x = 460; charle.y = 200;
      statsRef.current.npcsTransformed += 1;
      completeQuest("transform");
      sound.play("transform"); reactNearbyNpcs("😱");
      showToast("Charle becomes a basketball. Approach the hoop and press E to shoot!");
    }
  };

  const shootBasketball = () => {
    const make = Math.random() < 0.7;
    ballAnimRef.current = { t: 0, made: make };
    if (make) {
      const earn = 20 + randomInt(0, 30);
      addMoney(earn); addChud(2); sound.play("swish");
      reactNearbyNpcs("🏀");
      completeQuest("shoot-hoop");
      showToast(`SWISH! +$${earn}.`);
    } else {
      addChud(6); sound.play("miss"); reactNearbyNpcs("😬");
      showToast("Air ball. Charle bounces sadly. (+6 chud)");
    }
  };

  const startFightDialog = () => {
    const step = statsRef.current.buttplugQuestStep;
    const available = FIGHTERS.filter((f) => {
      if (f.id === "kai") return step >= 5 && step < 6;
      return true;
    });
    setDialog({
      title: "Fight Club — Pick your opponent", emoji: "🥊",
      body: step >= 5 && step < 6 ? "Wolf sent you here. Kai awaits in the ring." : "First rule of Fight Club: chud harder.",
      choices: available.map((f) => ({
        label: `${f.name} — ${f.desc} ($${f.reward})`,
        onSelect: () => {
          setDialog(null);
          sound.play("cheer");
          setFight({
            opponentId: f.id, opponentHp: f.hp, opponentMaxHp: f.hp,
            martinHp: martinRef.current.hp,
            log: [`${f.name} steps into the ring. The floor cracks.`],
            turn: "player", ended: false, victory: false,
            martinAnim: "idle", oppAnim: "idle",
            martinAnimKey: 0, oppAnimKey: 0,
            kapowText: null, kapowKey: 0,
          });
        },
      })).concat([{ label: "Chicken out", onSelect: () => setDialog(null) }]),
    });
  };

  const fightAttack = () => {
    if (!fightRef.current || fightRef.current.ended || fightRef.current.turn !== "player") return;
    const f = { ...fightRef.current };
    const opp = FIGHTERS.find((x) => x.id === f.opponentId)!;
    const dmg = randomInt(8, 22);
    sound.play("punch");
    f.martinAnim = "attack"; f.martinAnimKey += 1;
    f.kapowText = "BAM!"; f.kapowKey += 1;
    f.turn = "animating";
    setFight(f);

    setTimeout(() => {
      const cur = fightRef.current; if (!cur) return;
      const f2 = { ...cur, opponentHp: Math.max(0, cur.opponentHp - dmg) };
      f2.oppAnim = "hit"; f2.oppAnimKey += 1;
      f2.log = [...f2.log.slice(-4), `Martin belly flops for ${dmg} dmg.`];
      f2.kapowText = `-${dmg}!`; f2.kapowKey += 1;
      sound.play("thud");
      if (f2.opponentHp <= 0) {
        f2.ended = true; f2.victory = true;
        f2.oppAnim = "ko"; f2.oppAnimKey += 1;
        f2.martinAnim = "idle";
        f2.log.push(`${opp.name} collapses. +$${opp.reward}, +5 chud.`);
        addMoney(opp.reward * (statsRef.current.dailyEvent === "fight-bonus" ? 2 : 1)); addChud(5);
        statsRef.current.fightsWon += 1;
        statsRef.current.fightsWonToday += 1;
        if (!statsRef.current.fightsWonFighters.includes(opp.id))
          statsRef.current.fightsWonFighters.push(opp.id);
        if (statsRef.current.fightsWonToday >= 3) completeQuest("win-3-fights");
        if (statsRef.current.fightsWonFighters.length >= FIGHTERS.length) completeQuest("fight-all");
        completeQuest("fight");
        if (opp.id === "kai" && statsRef.current.buttplugQuestStep === 5) {
          statsRef.current.buttplugQuestStep = 6;
          showToast("Kai is down! Go see Wolf for the buttplug.");
          saveGame();
        }
        sound.play("victory");
      } else {
        f2.martinAnim = "idle"; f2.turn = "enemy";
      }
      setFight(f2);
      if (!f2.ended) {
        setTimeout(() => {
          const cur2 = fightRef.current; if (!cur2 || cur2.ended) return;
          const f3 = { ...cur2 };
          f3.oppAnim = "attack"; f3.oppAnimKey += 1;
          f3.kapowText = "POW!"; f3.kapowKey += 1;
          sound.play("punch");
          setFight(f3);
          setTimeout(() => {
            const cur3 = fightRef.current; if (!cur3 || cur3.ended) return;
            const dmg2 = randomInt(opp.dmg - 5, opp.dmg + 5);
            const f4 = { ...cur3, martinHp: Math.max(0, cur3.martinHp - dmg2) };
            f4.martinAnim = "hit"; f4.martinAnimKey += 1;
            f4.oppAnim = "idle";
            f4.log = [...f4.log.slice(-4), `${opp.name} hits Martin for ${dmg2}.`];
            f4.kapowText = `-${dmg2}!`; f4.kapowKey += 1;
            sound.play("thud");
            if (f4.martinHp <= 0) {
              f4.ended = true; f4.victory = false;
              f4.martinAnim = "ko"; f4.martinAnimKey += 1;
              f4.log.push(`Martin is KO'd. +12 chud (cope).`);
              addChud(12); statsRef.current.fightsLost += 1;
              martinRef.current.hp = 25;
              sound.play("defeat");
            } else {
              f4.turn = "player";
              martinRef.current.hp = f4.martinHp;
              setTimeout(() => {
                const c = fightRef.current; if (!c) return;
                setFight({ ...c, martinAnim: "idle", oppAnim: "idle" });
              }, 350);
            }
            setFight(f4);
          }, 250);
        }, 350);
      } else {
        martinRef.current.hp = Math.min(martinRef.current.hpMax, f2.martinHp);
      }
    }, 350);
  };

  const fightBlock = () => {
    if (!fightRef.current || fightRef.current.ended || fightRef.current.turn !== "player") return;
    const f = { ...fightRef.current };
    const opp = FIGHTERS.find((x) => x.id === f.opponentId)!;
    f.martinAnim = "block"; f.martinAnimKey += 1;
    f.log = [...f.log.slice(-4), "Martin tries to block with his belly."];
    f.turn = "animating";
    sound.play("block");
    setFight(f);
    setTimeout(() => {
      const cur = fightRef.current; if (!cur || cur.ended) return;
      const f2 = { ...cur };
      f2.oppAnim = "attack"; f2.oppAnimKey += 1;
      f2.kapowText = "POW!"; f2.kapowKey += 1;
      sound.play("punch");
      setFight(f2);
      setTimeout(() => {
        const cur2 = fightRef.current; if (!cur2 || cur2.ended) return;
        const dmg2 = Math.max(2, randomInt(opp.dmg - 14, opp.dmg - 4));
        const f3 = { ...cur2, martinHp: Math.max(0, cur2.martinHp - dmg2) };
        f3.log = [...f3.log.slice(-4), `Blocked! Only took ${dmg2} dmg.`];
        f3.kapowText = `-${dmg2}!`; f3.kapowKey += 1;
        f3.martinAnim = "hit"; f3.martinAnimKey += 1;
        f3.oppAnim = "idle";
        sound.play("thud");
        if (f3.martinHp <= 0) {
          f3.ended = true; f3.victory = false;
          f3.martinAnim = "ko"; f3.martinAnimKey += 1;
          f3.log.push("Martin folds.");
          addChud(8); statsRef.current.fightsLost += 1;
          martinRef.current.hp = 25;
          sound.play("defeat");
        } else {
          f3.turn = "player";
          martinRef.current.hp = f3.martinHp;
          setTimeout(() => {
            const c = fightRef.current; if (!c) return;
            setFight({ ...c, martinAnim: "idle", oppAnim: "idle" });
          }, 350);
        }
        setFight(f3);
      }, 250);
    }, 350);
  };

  const closeFight = () => setFight(null);

  const chudOut = () => {
    const acts = [];
    for (let i = 0; i < 3; i++) acts.push(randomChoice(CHUD_ACTIVITIES));
    setDialog({
      title: "Chudding Out", emoji: "🤤",
      body: `You and the boys (Anish, David, Konstantin, Kai) decide to:\n\n• ${acts.join("\n• ")}`,
      choices: [
        { label: "Send it (+25 chud, very fun)", primary: true,
          onSelect: () => {
            addChud(25); statsRef.current.timeSec += 30;
            const bonusMoney = statsRef.current.dailyEvent === "chud-zone-party" ? 15 : 0;
            if (bonusMoney) addMoney(bonusMoney);
            completeQuest("chud"); sound.play("cheer"); reactNearbyNpcs("🤡");
            setDialog(null);
            showToast(`MASSIVE chud session.${bonusMoney ? ` Party bonus +$${bonusMoney}!` : ""}`);
          } },
        { label: "Walk away (you can't, you're a chud)", onSelect: () => setDialog(null) },
      ],
    });
  };

  const sleepNow = () => {
    setDialog({
      title: "Bed", emoji: "🛏️",
      body: "Sleep until tomorrow morning?",
      choices: [
        { label: "Sleep until 10AM", primary: true,
          onSelect: () => { setDialog(null); startNewDay(); } },
        { label: "Stay up", onSelect: () => setDialog(null) },
      ],
    });
  };

  const easterText = (it: Interactable) => {
    setDialog({
      title: it.label, emoji: it.emoji,
      body: `Martin reads / examines: "${it.label}". A faint cringe radiates.`,
      choices: [{ label: "Walk away", onSelect: () => setDialog(null) }],
    });
  };

  const moggaylaCrack = (isMc: boolean) => {
    addChud(isMc ? 20 : 15);
    if (isMc) addMoney(15);
    if (statsRef.current.dailyEvent === "moggayla-rampage") {
      martinRef.current.hp = Math.max(1, martinRef.current.hp - 20);
      showToast("MOGGAYLA IS RAMPAGING. She barely noticed you. -20 HP.");
    }
    sound.play("crack");
    statsRef.current.shake = 10;
    reactNearbyNpcs(isMc ? "💃" : "💥");
    completeQuest(isMc ? "crack-mcmog" : "crack-mog");
    addFriendship(isMc ? "mcmoggayla" : "moggayla", 5);
    if (!statsRef.current.dailyEvent || statsRef.current.dailyEvent !== "moggayla-rampage")
      showToast(isMc ? "CRACK! McMoggayla earns you $15 in tips. (+20 chud)" : "CRACK! Moggayla cracks. (+15 chud)");
  };

  const decorEat = (it: Interactable) => {
    addChud(10); sound.play("eat"); eatTimerRef.current = 60;
    statsRef.current.foodsEaten += 1;
    showToast(`Martin eats the ${it.label}. (+10 chud)`);
  };

  const takeShit = () => {
    const chudReduction = 12 + randomInt(0, 8);
    statsRef.current.chud = clamp(statsRef.current.chud - chudReduction, 0, 100);
    if (statsRef.current.chud < 90) sound.stopAlarm();
    statsRef.current.timeSec += 10;
    statsRef.current.shitsToday += 1;
    if (statsRef.current.shitsToday >= 5) completeQuest("toilet-5");
    sound.play("burp");
    reactNearbyNpcs("🤢");
    showToast(`Martin takes a massive shit. Chud evacuated. (−${chudReduction} chud)`);
    // Tutorial progression
    if (statsRef.current.tutorialStep === 3) {
      statsRef.current.tutorialStep = 4;
      showToast("Tutorial: Now go outside and interact with a character (press E)!");
      saveGame();
    }
  };

  const fishCast = () => {
    sound.play("fishCast");
    setDialog({
      title: "Casting line...", emoji: "🎣", body: "You cast into the murky water...",
      choices: [{ label: "Wait", onSelect: () => {} }],
    });
    setTimeout(() => {
      const bigCatch = statsRef.current.dailyEvent === "carl-big-catch";
      const r = Math.random();
      let title = "", body = "";
      if (r < (bigCatch ? 0.65 : 0.4)) {
        const earn = 5 + randomInt(0, 5);
        addHunger(-15); addMoney(earn); completeQuest("fish");
        sound.play("fishCatch");
        title = "🐟 Caught a fish!"; body = `Caught a normal fish. -15 hunger, +$${earn}.${bigCatch ? " (Carl's tip paid off!)" : ""}`;
      } else if (r < (bigCatch ? 0.85 : 0.6)) {
        const earn = 15;
        addHunger(-30); addMoney(earn); completeQuest("fish");
        sound.play("fishCatch");
        title = "🐠 Big catch!"; body = `Caught a HUGE fish. -30 hunger, +$${earn}.`;
      } else if (r < (bigCatch ? 0.9 : 0.8)) {
        title = "🪣 Nothing"; body = "The line came back empty.";
      } else if (r < 0.9) {
        addChud(5); title = "🥾 A boot"; body = "Caught an old boot. You ate it. (+5 chud)";
        sound.play("eat");
      } else {
        addChud(20); addMoney(30);
        title = "🐺 Wolf head!"; body = "Caught Wolf Bobitos's head. Sus. +$30, +20 chud.";
        completeQuest("fish-wolf");
        sound.play("shock");
      }
      setDialog({ title, body, emoji: "🎣",
        choices: [{ label: "Cast again", onSelect: () => { setDialog(null); fishCast(); } },
                  { label: "Stop fishing", onSelect: () => setDialog(null) }] });
    }, 1500);
  };

  const tipJar = () => {
    if (statsRef.current.money < 5) {
      setDialog({ title: "Tip Jar", emoji: "💰",
        body: "You don't have $5 to tip. McMoggayla glares.",
        choices: [{ label: "Walk away", onSelect: () => setDialog(null) }] });
      return;
    }
    setDialog({
      title: "Tip Jar", emoji: "💰",
      body: "Pay $5 for a 'show'?",
      choices: [
        { label: "Tip $5 (+8 chud, McMog winks)", primary: true,
          onSelect: () => {
            addMoney(-5); addChud(8); sound.play("coin"); reactNearbyNpcs("💃");
            const mcm = npcsRef.current.find(n => n.def.id === "mcmoggayla");
            if (mcm) { mcm.reactionEmoji = "💋"; mcm.reactionTimer = 1500; }
            setDialog(null); showToast("McMoggayla winks. The chud is real.");
          } },
        { label: "Walk away", onSelect: () => setDialog(null) },
      ],
    });
  };

  const momTV = () => {
    sound.play("tvStatic");
    setDialog({
      title: "Mom watching TV", emoji: "📺",
      body: "Mom is glued to the Chud Channel. She doesn't look up.",
      choices: [
        { label: "Hi mom (she ignores you)",
          onSelect: () => {
            addChud(1); setDialog(null); showToast("Mom: '...mhm.'");
            // Tutorial progression
            if (statsRef.current.tutorialStep === 2) {
              statsRef.current.tutorialStep = 3;
              showToast("Tutorial: Now go take a shit in the toilet!");
              saveGame();
            }
          } },
        { label: "Beg for $20 (20% chance)",
          onSelect: () => {
            if (Math.random() < 0.2) { addMoney(20); showToast("Mom hands you a crumpled $20 without looking."); sound.play("coin"); }
            else { addChud(3); showToast("Mom: 'go away Martin im watching.'"); }
            setDialog(null);
            // Tutorial progression
            if (statsRef.current.tutorialStep === 2) {
              statsRef.current.tutorialStep = 3;
              showToast("Tutorial: Now go take a shit in the toilet!");
              saveGame();
            }
          } },
        { label: "Hug mom (heal 10 HP)", primary: true,
          onSelect: () => {
            martinRef.current.hp = Math.min(martinRef.current.hpMax, martinRef.current.hp + 10);
            statsRef.current.chud = Math.max(0, statsRef.current.chud - 2);
            setDialog(null); showToast("Mom love. +10 HP, -2 chud.");
            sound.play("victory");
            // Tutorial progression
            if (statsRef.current.tutorialStep === 2) {
              statsRef.current.tutorialStep = 3;
              showToast("Tutorial: Now go take a shit in the toilet!");
              saveGame();
            }
          } },
        { label: "Watch TV with her (+5 chud)",
          onSelect: () => {
            addChud(5); statsRef.current.timeSec += 20;
            sound.play("tvStatic"); setDialog(null);
            showToast("You both stare at the chud channel. Time melts.");
            // Tutorial progression
            if (statsRef.current.tutorialStep === 2) {
              statsRef.current.tutorialStep = 3;
              showToast("Tutorial: Now go take a shit in the toilet!");
              saveGame();
            }
          } },
      ],
    });
  };

  const selfieSpot = () => {
    sound.play("shutter");
    setDialog({
      title: "Selfie 📸", emoji: "📸",
      body: "Martin holds up his cracked phone. SNAP. The selfie is awful.",
      choices: [{ label: "Post it (+2 chud, 0 likes)", onSelect: () => { addChud(2); setDialog(null); showToast("0 likes. Mom blocked you."); } },
                { label: "Delete it", onSelect: () => setDialog(null) }],
    });
  };

  const startPlaneFlight = () => {
    setDialog(null);
    setFlightAnim({ phase: "takeoff", timer: 0 });
    sound.play("sleep");
    showToast("✈️ Boarding the plane with MoGgayla...");
  };

  const airportDesk = () => {
    const s = statsRef.current;
    const questComplete = s.buttplugQuestStep >= 8;

    if (!questComplete) {
      setDialog({
        title: "Control Desk", emoji: "✈️",
        body: "Welcome to Martin Int'l Airport. Where would you like to go?\n\nSorry sir, we only have one destination: HELL. And you need to complete your buttplug quest first.",
        choices: [{ label: "Walk away", onSelect: () => setDialog(null) }],
      });
      return;
    }

    if (s.hasTicket) {
      setDialog({
        title: "Control Desk", emoji: "✈️",
        body: "Your ticket to HELL is confirmed. Gate 666. MoGgayla is waiting at the gate.",
        choices: [
          { label: "✈️ Board the plane with MoGgayla", primary: true, onSelect: startPlaneFlight },
          { label: "Not yet", onSelect: () => setDialog(null) },
        ],
      });
      return;
    }

    if (s.money < 500) {
      setDialog({
        title: "Control Desk", emoji: "✈️",
        body: "One-way ticket to HELL: $500. You don't have enough money, sir. Maybe sell some moldy food?",
        choices: [{ label: "Walk away", onSelect: () => setDialog(null) }],
      });
      return;
    }

    setDialog({
      title: "Control Desk", emoji: "✈️",
      body: "One-way ticket to HELL: $500. No refunds. No survival guarantee. MoGgayla gets a free seat.",
      choices: [
        { label: "💸 Buy ticket ($500)", primary: true,
          onSelect: () => {
            addMoney(-500);
            s.hasTicket = true;
            sound.play("coin");
            showToast("Ticket purchased! $500 for a one-way trip to HELL.");
            saveGame();
            setDialog({
              title: "Control Desk", emoji: "✈️",
              body: "Your ticket is confirmed. Gate 666. Don't be late.",
              choices: [
                { label: "✈️ Board the plane with MoGgayla", primary: true, onSelect: startPlaneFlight },
                { label: "Not yet", onSelect: () => setDialog(null) },
              ],
            });
          } },
        { label: "Walk away", onSelect: () => setDialog(null) },
      ],
    });
  };

  const interactWithNpc = (npc: NpcRuntime) => {
    if (npc.transformed) {
      setDialog({
        title: `${npc.def.name} (transformed)`, emoji: "✨",
        body: `${npc.def.name} is currently a ${npc.def.transformForm}. They can't reply.`,
        choices: [
          { label: "Revert them",
            onSelect: () => { npc.transformed = false; sound.play("transform");
              showToast(`${npc.def.name} is restored. They cry a little.`); setDialog(null); } },
          { label: "Leave them be", onSelect: () => setDialog(null) },
        ],
      });
      return;
    }

    if (npc.def.id === "mom") { momTV(); return; }
    if (npc.def.id === "cousin-roy") {
      setDialog({ title: "Cousin Roy", emoji: "👹",
        body: "Cousin Roy stares at you with hungry eyes. Getting closer is suicide. The smell is unspeakable.",
        choices: [
          { label: "Slowly back away", primary: true, onSelect: () => setDialog(null) },
          { label: "🦴 Throw him a bone (-10 chud, 5s safe)",
            onSelect: () => {
              statsRef.current.chud = Math.max(0, statsRef.current.chud - 10);
              cousinChompCdRef.current = 5000;
              npc.emotion = "happy"; npc.emotionTimer = 3000;
              sound.play("eat");
              showToast("Cousin Roy gnaws the bone. Briefly satisfied. (-10 chud)"); setDialog(null);
            } },
          { label: "Throw him a moldy fish (-5 chud)",
            onSelect: () => { statsRef.current.chud = Math.max(0, statsRef.current.chud - 5); sound.play("eat");
              npc.emotion = "happy"; npc.emotionTimer = 2000;
              showToast("Cousin Roy eats the fish. He's pleased. (-5 chud)"); setDialog(null); } },
        ] });
      return;
    }

    if (npc.def.id === "moggayla-bt") {
      const m = martinRef.current;
      const stats = statsRef.current;
      if (m.scene === "hell") {
        if (stats.hellDefeated) {
          setDialog({
            title: "MoGgayla", emoji: "💕",
            body: "Oh my gosh Martin! You defeated Charle! You're so brave! I love you so much!",
            choices: [
              {
                label: "Return to hometown with me",
                onSelect: () => {
                  npc.scene = "boutique";
                  npc.x = npc.def.baseX;
                  npc.y = npc.def.baseY;
                  moveToScene("outside", 400, 450);
                  setDialog(null);
                },
              },
              { label: "Stay here", onSelect: () => setDialog(null) },
            ],
          });
        } else {
          setDialog({
            title: "MoGgayla", emoji: "💕",
            body: "Martin... this is scary. Please protect me.",
            choices: [{ label: "I will protect you", onSelect: () => setDialog(null) }],
          });
        }
        return;
      }
      const step = statsRef.current.buttplugQuestStep;
      if (step === 0) {
        setDialog({
          title: "MoGgayla", emoji: "💕",
          body: "Oh my gosh Martin, you are so fat obese and strong, I fell in love with you, but before we can travel, please help me find my buttplug darling, maybe David knows :)",
          choices: [{
            label: "I'll find it!", primary: true,
            onSelect: () => {
              statsRef.current.buttplugQuestStep = 1;
              completeQuest("buttplug-quest");
              showToast("📜 New Main Quest: Find MoGgayla's buttplug");
              setDialog(null);
            },
          }],
        });
        return;
      }
      if (step >= 1 && step < 7) {
        setDialog({
          title: "MoGgayla", emoji: "💕",
          body: "Please help me find my buttplug darling! Maybe David knows...",
          choices: [{ label: "I'm on it", onSelect: () => setDialog(null) }],
        });
        return;
      }
      if (step === 7 && statsRef.current.hasButtplug) {
        setDialog({
          title: "MoGgayla", emoji: "💕",
          body: "Omg Martin, you are so brave! Now we can leave this little hometown — I could never leave without my buttplug.",
          choices: [{
            label: "Let's travel together!", primary: true,
            onSelect: () => {
              statsRef.current.buttplugQuestStep = 8;
              statsRef.current.hasButtplug = false;
              addFriendship("moggayla-bt", 30);
              showToast("MoGgayla hugs you. The adventure begins!");
              saveGame();
              setDialog(null);
            },
          }],
        });
        return;
      }
      const choices: DialogChoice[] = [{ label: "Say hi", onSelect: () => { showToast("MoGgayla: 'My hero Martin!'"); setDialog(null); } }];
      if (stats.hellDefeated) {
        choices.push({
          label: "Come with me to hell",
          onSelect: () => {
            npc.scene = "hell";
            npc.x = 300;
            npc.y = 300;
            startPlaneFlight();
          },
        });
      }
      setDialog({ title: "MoGgayla", emoji: "💕", body: npc.def.description, choices });
      return;
    }

    const setEmotion = (e: typeof npc.emotion) => { npc.emotion = e; npc.emotionTimer = 3000; };
    const questStep = statsRef.current.buttplugQuestStep;

    const choices: DialogChoice[] = [];

    // Quest-specific interactions (unlocked in sequence)
    if (npc.def.id === "david" && questStep === 1) {
      choices.push({
        label: "🥙 Ask about MoGgayla's buttplug", primary: true,
        onSelect: () => {
          statsRef.current.buttplugQuestStep = 2;
          showToast("David: hummus is in your basement. Go grab it!");
          setDialog({
            title: "David", emoji: "🥙",
            body: "Bring me some hummus and I will tell you who has it. I might have lost it in your basement.",
            choices: [{ label: "Got it", onSelect: () => { saveGame(); setDialog(null); } }],
          });
        },
      });
    }
    if (npc.def.id === "david" && questStep === 3 && statsRef.current.hasHummus) {
      choices.push({
        label: "🥙 Give David the hummus", primary: true,
        onSelect: () => {
          statsRef.current.buttplugQuestStep = 4;
          statsRef.current.hasHummus = false;
          showToast("David: Go ask Wolf, he definitely has it.");
          setDialog({
            title: "David", emoji: "🥙",
            body: "Go ask Wolf, he definitely has it.",
            choices: [{ label: "Thanks David", onSelect: () => { saveGame(); setDialog(null); } }],
          });
        },
      });
    }
    if (npc.def.id === "wolf-npc" && questStep === 4) {
      choices.push({
        label: "🔌 Ask about the forbidden buttplug", primary: true,
        onSelect: () => {
          statsRef.current.buttplugQuestStep = 5;
          showToast("Wolf: Kill Kai at the Fight Club. Then we'll talk.");
          setDialog({
            title: "Wolf Shartos Bartos Bobitos", emoji: "⌚",
            body: "Oh... that forbidden buttplug. I have it, but it is so valuable that I need you to do something — you will have to kill Kai for me... at the fight club.",
            choices: [{ label: "It shall be done", onSelect: () => { saveGame(); setDialog(null); } }],
          });
        },
      });
    }
    if (npc.def.id === "wolf-npc" && questStep === 6) {
      choices.push({
        label: "🔌 Collect the buttplug", primary: true,
        onSelect: () => {
          statsRef.current.buttplugQuestStep = 7;
          statsRef.current.hasButtplug = true;
          showToast("Wolf hands you the forbidden buttplug. Bring it to MoGgayla!");
          setDialog({
            title: "Wolf Shartos Bartos Bobitos", emoji: "⌚",
            body: "You earned it. Take the buttplug to MoGgayla at the boutique. And don't tell anyone I had it.",
            choices: [{ label: "Thank you Wolf", onSelect: () => { saveGame(); setDialog(null); } }],
          });
        },
      });
    }

    choices.push(
      { label: "Say hi", onSelect: () => {
          npc.speechBubble = randomChoice(npc.def.chatLines || ["...??"]);
          npc.speechTimer = 2500;
          setEmotion("happy");
          addFriendship(npc.def.id, 3);
          sound.play("select");
          showToast(`${npc.def.name}: "${npc.speechBubble}"`); setDialog(null);
          // Tutorial progression
          if (statsRef.current.tutorialStep === 4 && martinRef.current.scene === "outside") {
            statsRef.current.tutorialStep = 5;
            showToast("Tutorial complete! You're ready to explore the world of Martin.");
            saveGame();
          }
        } },
      { label: "Mock them (+3 chud)",
        onSelect: () => { addChud(3); setEmotion("angry"); npc.reactionEmoji = "😠"; npc.reactionTimer = 2000;
          addFriendship(npc.def.id, -8);
          showToast(`${npc.def.name} looks hurt. You cackle.`); setDialog(null); } },
      { label: npc.def.transformLabel, primary: true,
        onSelect: () => { transformNpc(npc); setDialog(null); } },
    );

    // Special action per NPC (skip david hummus during quest steps 1-4)
    const skipDavidHummus = npc.def.id === "david" && questStep >= 1 && questStep <= 4;
    const skipWolfWatch = npc.def.id === "wolf-npc" && questStep >= 4 && questStep <= 6;
    if (npc.def.specialAction && !skipDavidHummus && !skipWolfWatch) {
      const sa = npc.def.specialAction;
      choices.push({
        label: `${sa.emoji} ${sa.label}`,
        onSelect: () => {
          switch (npc.def.id) {
            case "charle": {
              const win = Math.random() < 0.6;
              if (win) { addMoney(10); setEmotion("sad"); sound.play("swish"); showToast("HORSE: you win. Charle is devastated. +$10"); }
              else { addChud(5); setEmotion("happy"); sound.play("miss"); showToast("HORSE: Charle wins by default. +5 chud embarrassment"); }
              break;
            }
            case "damian": {
              if (npc.ballX !== undefined) { npc.ballVX = 0; npc.ballVY = 0; }
              addMoney(5); setEmotion("sad"); sound.play("coin");
              showToast("You steal Damian's ball. He stares in silence. +$5");
              break;
            }
            case "wolf-npc": {
              if (questStep < 4 || questStep >= 7) {
                statsRef.current.timeSec += 25; setEmotion("smug"); sound.play("select");
                showToast("Wolf shows off the Cartier for 15 minutes. Time lost forever.");
              }
              break;
            }
            case "konstantin": {
              addHunger(-15); addChud(8); setEmotion("happy"); sound.play("eat");
              showToast("You drink rakia with Konstantin. BULGARIA. (+8 chud, -15 hunger)");
              break;
            }
            case "kai": {
              addChud(10); setEmotion("shocked"); sound.play("eat");
              const dares = ["a cigarette butt", "half a candle", "raw asbestos", "a battery", "motor oil"];
              showToast(`Kai eats ${randomChoice(dares)}. You both get +10 chud.`);
              break;
            }
            case "david": {
              addHunger(-20); addChud(-3); setEmotion("happy"); sound.play("eat");
              showToast("David's hummus. Grandma recipe. -20 hunger, -3 chud.");
              break;
            }
            case "anish": {
              addChud(15); setEmotion("smug"); sound.play("tvStatic");
              showToast("Anish does his stand-up. One joke. It's about rizz. +15 chud.");
              break;
            }
            case "moggayla": {
              // Give her moldy food from inventory concept — just a flat bonus
              addChud(-5); setEmotion("happy"); sound.play("eat");
              showToast("Moggayla eats. She's satisfied. -5 chud.");
              break;
            }
            case "caillo": {
              addMoney(500); setEmotion("scared"); sound.play("coin");
              showToast("Extra homework assigned. Caillo cries. +$500.");
              break;
            }
            case "mcmoggayla": {
              if (statsRef.current.money >= 15) { addMoney(-15); addChud(12); setEmotion("horny"); sound.play("crack"); showToast("Private show. $15 gone. +12 chud. Worth it? No."); }
              else { showToast("Not enough cash for the private show."); }
              break;
            }
            case "carl": {
              // Fishing with Carl doubles reward — set a flag via a toast for now
              setEmotion("happy"); sound.play("select");
              showToast("Carl fishes alongside you. Next cast has double rewards!");
              // Tiny cheat: give fish reward directly as a bonus
              addHunger(-15); addMoney(10);
              break;
            }
            case "mom": {
              martinRef.current.hp = Math.min(martinRef.current.hpMax, martinRef.current.hp + 10);
              setEmotion("happy"); sound.play("victory");
              showToast("You clean Mom's ashtray. She glances over. 'Thanks.' +10 HP");
              break;
            }
          }
          setDialog(null);
        }
      });
    }

    if (npc.def.id === "damian") {
      const anger = npc.anger ?? 0;
      const angerEmojis = ["😐", "😠", "😡", "🤬", "💢", "🤯"];
      const angerLabel = angerEmojis[Math.min(anger, 5)];
      choices.push({ label: `Pass the soccer ball ${angerLabel}`,
        onSelect: () => {
          if (npc.ballX !== undefined) {
            const angle = Math.random() * Math.PI * 2;
            npc.ballVX = Math.cos(angle) * 8; npc.ballVY = Math.sin(angle) * 8;
            sound.play("soccerKick");
          }
          showToast("You pass to Damian. He doesn't acknowledge. He kicks back hard."); setDialog(null);
        } });
      choices.push({ label: "🦶 Kick ball far away",
        onSelect: () => {
          if (npc.ballX !== undefined) {
            const angle = Math.random() * Math.PI * 2;
            npc.ballVX = Math.cos(angle) * 18; npc.ballVY = Math.sin(angle) * 18;
            sound.play("soccerKick");
          }
          npc.anger = (npc.anger ?? 0) + 1;
          const newAnger = npc.anger ?? 0;
          if (newAnger >= 5) {
            npc.anger = 0;
            showToast("Damian has a MELTDOWN! He screams silently, runs in circles, then forgets why he was angry.");
            sound.play("miss");
          } else {
            const angerLines = [
              "Damian stares at you. His eye twitches.",
              "Damian clenches his tiny fists. He's fuming.",
              "Damian points at the ball, then at you. Accusation.",
              "Damian kicks the ground. He's PISSED.",
              "Damian is about to EXPLODE. His face is red.",
            ];
            showToast(angerLines[Math.min(newAnger - 1, 4)]);
            sound.play("swish");
          }
          setDialog(null);
        } });
      choices.push({ label: "👊 Hit Damian",
        onSelect: () => {
          npc.anger = (npc.anger ?? 0) + 1;
          npc.hp = (npc.hp ?? 50) - (5 + Math.floor(Math.random() * 6));
          const newAnger = npc.anger ?? 0;
          if (newAnger >= 5) {
            npc.anger = 0;
            showToast("Damian has a MELTDOWN! He screams silently, runs in circles, then forgets why he was angry.");
            sound.play("miss");
          } else {
            const hitLines = [
              "Damian stares in shock. He didn't see that coming.",
              "Damian rubs his head. He looks betrayed.",
              "Damian starts to cry. Then he stops. Then he glares.",
              "Damian is FURIOUS. He chases his own tail in anger.",
              "Damian is about to EXPLODE. His face is red.",
            ];
            showToast(hitLines[Math.min(newAnger - 1, 4)]);
            sound.play("punch");
          }
          statsRef.current.shake = 4;
          setDialog(null);
        } });
    }
    if (npc.def.id === "mcmoggayla") {
      choices.push({ label: "Tip her ($5, +5 chud)",
        onSelect: () => {
          if (statsRef.current.money >= 5) { addMoney(-5); addChud(5); sound.play("coin"); showToast("McMog: 'thanks chud daddy.'"); }
          else { showToast("Not enough cash."); }
          setDialog(null);
        } });
    }
    if (npc.def.id === "carl") {
      choices.push({ label: "Buy fishing tip ($2)",
        onSelect: () => {
          if (statsRef.current.money >= 2) { addMoney(-2); showToast("Carl: 'use a sus pole, you'll catch sus things.'"); }
          else { showToast("Carl: 'no cash, no tips.'"); }
          setDialog(null);
        } });
    }
    setDialog({ title: npc.def.name, emoji: "🧑", body: npc.def.description, choices });
  };

  const tryInteract = useCallback(() => {
    if (statsRef.current.dead) return;
    const m = martinRef.current;
    const scene = SCENES[m.scene];
    if (!scene) return;

    const nearbyNpc = npcsRef.current.find(
      (n) => n.scene === m.scene && !n.transformed && dist(n.x, n.y, m.x, m.y) < 70 + n.def.size,
    );
    if (nearbyNpc) { interactWithNpc(nearbyNpc); return; }

    // Car interaction (works in outside and garage)
    const car = carRef.current;
    if ((m.scene === "outside" || m.scene === "garage") && !car.inCar && dist(m.x, m.y, car.x, car.y) < 60) {
      car.inCar = true;
      car.gear = 0;
      showToast("🚗 Hold W to start engine & drive • G: garage door • E: exit car");
      return;
    }
    if (car.inCar) {
      car.inCar = false;
      car.engineRunning = false;
      car.speed = 0;
      car.gear = 0;
      car.steerAngle = 0;
      m.x = car.x + Math.cos(car.angle + Math.PI / 2) * 40;
      m.y = car.y + Math.sin(car.angle + Math.PI / 2) * 40;
      showToast("Exited car");
      return;
    }

    // Gas station interaction
    // Gas station — only refill when near the pump
    if (m.scene === "gas-station") {
      const pump = SCENES["gas-station"].interactables.find(it => it.id === "gas-pump");
      if (pump && m.x > pump.x - 50 && m.x < pump.x + pump.w + 50 && m.y > pump.y - 50 && m.y < pump.y + pump.h + 50) {
        if (statsRef.current.money >= 10) {
          addMoney(-10);
          car.gas = 100;
          sound.play("coin");
          showToast("⛽ Tank refilled! -$10");
        } else {
          showToast("⛽ Not enough money ($10 needed)");
        }
        return;
      }
      // Fall through to normal door/interactable checks below
    }

    if (m.scene === "hell") {
      for (const p of hellPickupsRef.current) {
        if (!p.active) continue;
        if (dist(m.x, m.y, p.x, p.y) < 60) {
          if (p.type === "gun") {
            playerGunRef.current = { active: true, ammo: 10, timer: 15000 };
            p.active = false;
            sound.play("select");
            showToast("Picked up a gun! 10 ammo");
          } else {
            martinRef.current.hp = Math.min(martinRef.current.hpMax, martinRef.current.hp + 15);
            p.active = false;
            sound.play("eat");
            showToast("Ate hell food! +15 HP");
          }
          return;
        }
      }
      const boss = hellBossRef.current;
      if (boss && dist(m.x, m.y, boss.x, boss.y) < 80) {
        if (punchCdRef.current <= 0) {
          const dmg = randomInt(8, 15);
          boss.hp -= dmg;
          punchCdRef.current = 500;
          statsRef.current.shake = 5;
          sound.play("punch");
          showToast(`You punched Charle for ${dmg} dmg!`);
          return;
        }
      }
      const gun = playerGunRef.current;
      if (gun && gun.active && gun.ammo > 0) {
        if (boss) {
          const angle = Math.atan2(boss.y - m.y, boss.x - m.x);
          hellProjectilesRef.current.push({
            x: m.x,
            y: m.y,
            vx: Math.cos(angle) * 8,
            vy: Math.sin(angle) * 8,
            damage: 25,
            active: true,
            emoji: "💨",
          });
          gun.ammo -= 1;
          if (gun.ammo <= 0) playerGunRef.current = null;
          sound.play("swish");
          showToast(`Gun shot! ${gun.ammo} ammo left`);
          return;
        }
      }
    }

    for (const d of scene.doors) {
      if (m.x > d.x - 30 && m.x < d.x + d.w + 30 && m.y > d.y - 30 && m.y < d.y + d.h + 30) {
        if (d.targetScene === "apartments") {
          setDialog({
            title: "Private Property", emoji: "🚫",
            body: "Private property you fatass.",
            choices: [{ label: "Walk away", onSelect: () => setDialog(null) }],
          });
          return;
        }
        // Garage: bring car along if in car
        if (d.targetScene === "garage") {
          if (!garageDoorOpen.current) {
            setDialog({
              title: "Garage Door", emoji: "🚪",
              body: "The garage door is closed. Press G near the door to open it.",
              choices: [{ label: "Walk away", onSelect: () => setDialog(null) }],
            });
            return;
          }
          const car = carRef.current;
          car.scene = "garage";
          if (car.inCar) {
            car.inCar = false;
            car.x = 400; car.y = 120; car.angle = Math.PI / 2; car.driftAngle = Math.PI / 2;
            car.speed = 0; car.gear = 0; car.engineRunning = false;
            moveToScene("garage", d.targetPos.x, d.targetPos.y);
            showToast("🚗 Parked in garage");
          } else {
            moveToScene(d.targetScene, d.targetPos.x, d.targetPos.y);
          }
          return;
        }
        // Garage exit: place car outside
        if (m.scene === "garage" && d.targetScene === "outside") {
          const car = carRef.current;
          car.scene = "outside";
          car.x = 560; car.y = 700; car.angle = Math.PI / 2;
          car.speed = 0; car.gear = 0; car.engineRunning = false;
          moveToScene(d.targetScene, d.targetPos.x, d.targetPos.y);
          return;
        }
        moveToScene(d.targetScene, d.targetPos.x, d.targetPos.y); return;
      }
    }

    for (const it of scene.interactables) {
      if (m.x > it.x - 50 && m.x < it.x + it.w + 50 && m.y > it.y - 50 && m.y < it.y + it.h + 50) {
        switch (it.type) {
          case "fridge": openFridge(); return;
          case "bed": sleepNow(); return;
          case "tutorat-desk": startTutorat(); return;
          case "charle-button": transformCharle(); return;
          case "fight-pit": startFightDialog(); return;
          case "chud-circle": chudOut(); return;
          case "easter-text":
          case "easter-object": easterText(it); return;
          case "moggayla-crack": moggaylaCrack(it.id === "mcmog-crack"); return;
          case "street-food": eatStreetFood(it); return;
          case "decor-eat":
            if (it.id === "toilet") { takeShit(); return; }
            decorEat(it); return;
          case "quest-item":
            if (it.id === "basement-hummus" && statsRef.current.buttplugQuestStep >= 2 && !statsRef.current.hasHummus) {
              statsRef.current.hasHummus = true;
              statsRef.current.buttplugQuestStep = 3;
              sound.play("select");
              showToast("Martin grabs David's hummus. Bring it to David!");
              saveGame();
              return;
            }
            if (it.id === "apt-key-1") {
              statsRef.current.apartmentKeys.push("apt-door-1");
              showToast("Found a key! It has 'Damian' written on it.");
              sound.play("coin");
              saveGame();
              return;
            }
            if (it.id === "apt-key-2") {
              const randomApt = ["apt-door-2", "apt-door-3", "apt-door-4", "apt-door-5", "apt-door-6"][Math.floor(Math.random() * 5)];
              statsRef.current.apartmentKeys.push(randomApt);
              showToast(`Found a key! Wonder which door it opens...`);
              sound.play("coin");
              saveGame();
              return;
            }
            return;
          case "fishing-rod": fishCast(); return;
          case "airport-desk": airportDesk(); return;
          case "apartment-door": {
            const aptId = it.id;
            if (statsRef.current.apartmentKeys.includes(aptId)) {
              showToast("You unlocked the door with your key!");
            } else {
              setDialog({
                title: "Locked", emoji: "🔒",
                body: "This door is locked. You need a key. Maybe you can find one somewhere...",
                choices: [{ label: "Walk away", onSelect: () => setDialog(null) }],
              });
            }
            return;
          }
          case "tip-jar": tipJar(); return;
          case "mom-tv": momTV(); return;
          case "selfie-spot": selfieSpot(); return;
          case "secret-stash": {
            const s = statsRef.current;
            if (!s.secretsFound.includes(it.id)) {
              s.secretsFound.push(it.id);
              addMoney(it.id === "secret-cash" ? 40 : 30);
              sound.play("coin");
              showToast(`🔍 SECRET FOUND: ${it.label}. +$${it.id === "secret-cash" ? 40 : 30}`);
              if (m.scene === "tunnel") completeQuest("find-tunnel");
              if (m.scene === "hidden-room") completeQuest("find-hidden-room");
            } else {
              showToast("Already looted this one.");
            }
            return;
          }
          case "secret-diary": {
            const s = statsRef.current;
            if (!s.secretsFound.includes(it.id)) {
              s.secretsFound.push(it.id);
              completeQuest("find-hidden-room");
              sound.play("select");
            }
            setDialog({
              title: "Martin's Secret Diary", emoji: "📓",
              body: "Page 1: 'Chud level 47. Normal day.'\nPage 12: 'Cousin looked at me weird. Fed him fish.'\nPage 31: 'Wolf got a Cartier. I got moldy bread. Balance.'\nPage 58: 'Pitounbibtibi was at the boutique. I ran.'\nPage 99: 'Who keeps reading this??'",
              choices: [{ label: "Close diary", onSelect: () => setDialog(null) }],
            });
            return;
          }
        }
      }
    }

    const charle = npcsRef.current.find((n) => n.def.id === "charle");
    if (charle?.transformed && m.scene === "court") {
      const hoop = SCENES.court.interactables.find((x) => x.id === "hoop");
      if (hoop && m.x > hoop.x - 50 && m.x < hoop.x + hoop.w + 50 && m.y > hoop.y - 50 && m.y < hoop.y + hoop.h + 80) {
        shootBasketball(); return;
      }
    }
  }, [moveToScene]);

  // Interact key edge / phone toggle / mute toggle
  useEffect(() => {
    let prevI = false, prevP = false, prevM = false, prevG = false;
    let rafId = 0;
    const tick = () => {
      const k = keysRef.current;
      const now = performance.now();
      if (k.interact && !prevI && !dialogRef.current && !fightRef.current && !showPhoneRef.current && !flightAnimRef.current && !showStart) {
        if (now - lastInteractRef.current > 200) {
          lastInteractRef.current = now;
          // Grease attack in hell
          if (martinRef.current.scene === "hell" && greaseCdRef.current <= 0) {
            const target = hellBossRef.current ?? { x: 1000, y: 750 };
            const m = martinRef.current;
            const angle = Math.atan2(target.y - m.y, target.x - m.x);
            const speed = 10;
            greaseProjectilesRef.current.push({
              x: m.x, y: m.y,
              vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
              active: true,
            });
            greaseCdRef.current = 800;
            sound.play("swish");
            showToast("🛢️ Grease attack!");
          } else {
            tryInteract();
          }
        }
      }
      if (k.phone && !prevP && !showStart) {
        if (now - lastPhoneRef.current > 250) {
          lastPhoneRef.current = now;
          setShowPhone((v) => { sound.play(v ? "phoneTab" : "phoneOpen"); return !v; });
        }
      }
      if (k.mute && !prevM && !showStart) {
        if (now - lastMuteRef.current > 250) {
          lastMuteRef.current = now;
          const m = sound.toggleMute(); setMuted(m);
        }
      }
      if (k.garageDoor && !prevG && !showStart) {
        if (now - lastGarageRef.current > 250) {
          lastGarageRef.current = now;
          const m = martinRef.current;
          if (m.scene === "outside") {
            const garDoor = SCENES.outside.doors.find(d => d.id === "d-garage");
            if (garDoor && m.x > garDoor.x - 60 && m.x < garDoor.x + garDoor.w + 60 && m.y > garDoor.y - 60 && m.y < garDoor.y + garDoor.h + 60) {
              garageDoorOpen.current = !garageDoorOpen.current;
              sound.play("door");
              showToast(garageDoorOpen.current ? "🚪 Garage door OPENED" : "🚪 Garage door CLOSED");
            }
          }
        }
      }
      prevI = k.interact; prevP = k.phone; prevM = k.mute; prevG = k.garageDoor;
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [tryInteract, showStart]);

  // Game loop
  useEffect(() => {
    if (showStart) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    let raf = 0; let lastTs = performance.now();
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`; canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize(); window.addEventListener("resize", resize);

    const loop = (ts: number) => {
      const dt = Math.min(40, ts - lastTs); lastTs = ts;
      const dtSec = dt / 1000;
      const stats = statsRef.current; const m = martinRef.current;
      const scene = SCENES[m.scene];
      const dialogActive = !!dialogRef.current || !!fightRef.current || showPhoneRef.current || !!flightAnimRef.current;
      punchCdRef.current -= dt;

      if (m.scene === "hell" && !stats.hellDefeated) {
        if (!hellBossRef.current) {
          hellBossRef.current = { hp: 750, hpMax: 750, x: 1000, y: 750, punchCd: 0, barrageCd: 0, slamCd: 0, walkPhase: 0, dir: "down" };
        }
        const boss = hellBossRef.current;
        const bdx = m.x - boss.x;
        const bdy = m.y - boss.y;
        const bd = Math.hypot(bdx, bdy);
        // Speed increases as HP drops: 0.35 -> 0.52 when low HP
        const enrageMult = 1 + (1 - boss.hp / boss.hpMax) * 0.5;
        if (bd > 100) {
          const bsp = 0.35 * enrageMult * (dt / 16);
          boss.x += (bdx / bd) * bsp;
          boss.y += (bdy / bd) * bsp;
        }
        if (bd > 0) {
          if (Math.abs(bdx) > Math.abs(bdy)) boss.dir = bdx > 0 ? "right" : "left";
          else boss.dir = bdy > 0 ? "down" : "up";
        }
        boss.walkPhase += dt / 200;
        // Punch attack
        if (bd < 120 && boss.punchCd <= 0) {
          martinRef.current.hp = Math.max(0, martinRef.current.hp - 25);
          boss.punchCd = 1200;
          stats.shake = 8;
          sound.play("punch");
          showToast("Charle punches you! -25 HP");
        }
        // Basketball barrage: 16 projectiles
        if (bd > 150 && bd < 450 && boss.barrageCd <= 0) {
          for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            const spd = 3 + Math.random() * 1.5;
            hellProjectilesRef.current.push({ x: boss.x, y: boss.y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, damage: 18, active: true, emoji: "🏀" });
          }
          boss.barrageCd = 2500;
          sound.play("swish");
          showToast("Charle unleashes a MASSIVE basketball barrage!");
        }
        // Shockwave slam: boss jumps, expanding ring damage
        if (bd > 80 && bd < 350 && boss.slamCd <= 0) {
          boss.slamCd = 5000;
          sound.play("punch");
          showToast("Charle SLAMS the ground! Shockwave incoming!");
          // Create expanding ring projectile
          hellProjectilesRef.current.push({ x: boss.x, y: boss.y, vx: 0, vy: 0, damage: 30, active: true, emoji: "💥" });
        }
        boss.punchCd -= dt;
        boss.barrageCd -= dt;
        boss.slamCd -= dt;
        // Minion basketballs: spawn bouncing balls that wander
        if (Math.random() < 0.008 * enrageMult) {
          const mx = 100 + Math.random() * 1800;
          const my = 100 + Math.random() * 1300;
          const mangle = Math.random() * Math.PI * 2;
          const mspd = 1.5 + Math.random() * 1.5;
          hellProjectilesRef.current.push({ x: mx, y: my, vx: Math.cos(mangle) * mspd, vy: Math.sin(mangle) * mspd, damage: 12, active: true, emoji: "🔥" });
        }
        for (const proj of hellProjectilesRef.current) {
          if (!proj.active) continue;
          proj.x += proj.vx * (dt / 16);
          proj.y += proj.vy * (dt / 16);
          // Bouncing minions
          if (proj.emoji === "🔥") {
            if (proj.x < 50 || proj.x > scene.width - 50) proj.vx *= -1;
            if (proj.y < 50 || proj.y > scene.height - 50) proj.vy *= -1;
            const pd = dist(proj.x, proj.y, m.x, m.y);
            if (pd < 40) {
              martinRef.current.hp = Math.max(0, martinRef.current.hp - proj.damage);
              proj.active = false;
              stats.shake = 4;
              sound.play("cousinChomp");
              showToast(`Minion basketball hit! -${proj.damage} HP`);
            }
            continue;
          }
          // Shockwave ring: expands outward, hits once
          if (proj.emoji === "💥") {
            const ringRadius = (proj.x - boss.x) + 4 * (dt / 16); // expand outward
            proj.x = boss.x + ringRadius;
            const ringDist = dist(m.x, m.y, boss.x, boss.y);
            if (ringDist < ringRadius + 30 && ringDist > ringRadius - 30) {
              martinRef.current.hp = Math.max(0, martinRef.current.hp - proj.damage);
              proj.active = false;
              stats.shake = 10;
              sound.play("punch");
              showToast("Shockwave hits! -30 HP");
            }
            if (ringRadius > 400) proj.active = false;
            continue;
          }
          if (proj.emoji === "💨") {
            if (boss) {
              const bdist = dist(proj.x, proj.y, boss.x, boss.y);
              if (bdist < 85) {
                boss.hp -= proj.damage;
                proj.active = false;
                stats.shake = 3;
                sound.play("punch");
                showToast(`Bullet hits Charle! -${proj.damage} dmg`);
              }
            }
          } else {
            const pd = dist(proj.x, proj.y, m.x, m.y);
            if (pd < 45) {
              martinRef.current.hp = Math.max(0, martinRef.current.hp - proj.damage);
              proj.active = false;
              stats.shake = 6;
              sound.play("cousinChomp");
              showToast(`Basketball hit! -${proj.damage} HP`);
            }
          }
          if (proj.x < 0 || proj.x > scene.width || proj.y < 0 || proj.y > scene.height) {
            proj.active = false;
          }
        }
        hellProjectilesRef.current = hellProjectilesRef.current.filter((p) => p.active);
        if (gunSpawnCdRef.current <= 0) {
          hellPickupsRef.current.push({ x: 100 + Math.random() * 1800, y: 100 + Math.random() * 1300, type: "gun", active: true, timer: 0, lifetime: 12000 });
          gunSpawnCdRef.current = 6000 + Math.random() * 4000;
        }
        if (foodSpawnCdRef.current <= 0) {
          hellPickupsRef.current.push({ x: 100 + Math.random() * 1800, y: 100 + Math.random() * 1300, type: "food", active: true, timer: 0, lifetime: 15000 });
          foodSpawnCdRef.current = 8000 + Math.random() * 5000;
        }
        gunSpawnCdRef.current -= dt;
        foodSpawnCdRef.current -= dt;
        for (const p of hellPickupsRef.current) {
          if (!p.active) continue;
          p.timer += dt;
          if (p.timer >= p.lifetime) p.active = false;
        }
        hellPickupsRef.current = hellPickupsRef.current.filter((p) => p.active);
        if (playerGunRef.current) {
          playerGunRef.current.timer -= dt;
          if (playerGunRef.current.timer <= 0) {
            playerGunRef.current = null;
            showToast("Gun expired!");
          }
        }
        if (boss.hp <= 0) {
          stats.hellDefeated = true;
          showToast("CHARLE THE COLOSSUS HAS FALLEN!");
          hellBossRef.current = null;
          hellProjectilesRef.current = [];
          hellPickupsRef.current = [];
          playerGunRef.current = null;
        }
        if (martinRef.current.hp <= 0 && !stats.dead) {
          martinRef.current.hp = 50;
          martinRef.current.scene = "airport";
          martinRef.current.x = 500;
          martinRef.current.y = 580;
          showToast("You were crushed by Charle. The airport gives you a free return flight.");
          stats.shake = 10;
          flightAnimRef.current = null;
          setFlightAnim(null);
          hellBossRef.current = null;
          hellProjectilesRef.current = [];
          hellPickupsRef.current = [];
          playerGunRef.current = null;
        }
      }

      // Grease attack updates (always run in hell)
      greaseCdRef.current = Math.max(0, greaseCdRef.current - dt);
      hellWelcomeRef.current = Math.max(0, hellWelcomeRef.current - dt);
      if (m.scene === "hell") {
        for (const g of greaseProjectilesRef.current) {
          if (!g.active) continue;
          g.x += g.vx * (dt / 16);
          g.y += g.vy * (dt / 16);
          if (g.x < 0 || g.x > scene.width || g.y < 0 || g.y > scene.height) { g.active = false; continue; }
          const boss = hellBossRef.current;
          if (boss && dist(g.x, g.y, boss.x, boss.y) < 90) {
            boss.hp -= 15;
            g.active = false;
            stats.shake = 8;
            sound.play("punch");
            showToast("🛢️ GREASE HITS CHARLE! -15 HP");
          }
        }
        greaseProjectilesRef.current = greaseProjectilesRef.current.filter((g) => g.active);
      } else {
        greaseProjectilesRef.current = [];
      }

      // Car physics
      const car = carRef.current;
      const k = keysRef.current;
      if (car.inCar && (car.scene === "outside" || car.scene === "garage") && !dialogActive && !fightRef.current) {
        // Gear shifting (only on key edge - prevent spam)
        if (k.gear1 && car.gear !== 1) { car.gear = 1; showToast("⚙️ Gear 1"); }
        if (k.gear2 && car.gear !== 2) { car.gear = 2; showToast("⚙️ Gear 2"); }
        if (k.gear3 && car.gear !== 3) { car.gear = 3; showToast("⚙️ Gear 3"); }
        if (k.gear4 && car.gear !== 4) { car.gear = 4; showToast("⚙️ Gear 4"); }
        if (k.reverse && car.gear !== -1) { car.gear = -1; showToast("⚙️ Reverse"); }
        if (k.neutral && car.gear !== 0) { car.gear = 0; showToast("⚙️ Neutral"); }
        if (k.headlights) { car.headlights = !car.headlights; showToast(car.headlights ? "🔦 Headlights ON" : "🔦 Headlights OFF"); }

        // Engine start with SPACEBAR when stopped (hold to start)
        if (!car.engineRunning && k.startEngine && car.gas > 0) {
          car.engineRunning = true;
          if (car.gear === 0) car.gear = 1; // auto-shift to 1st
          sound.play("engineStart");
          showToast("🚗 Engine started! Gear 1 - Use W to accelerate");
        }

        // Engine off in neutral when stopped
        if (car.engineRunning && car.gear === 0 && Math.abs(car.speed) < 0.1) {
          car.engineRunning = false;
        }

        // Acceleration
        const accel = car.engineRunning && car.gas > 0 ? 0.12 * car.gear * (dt / 16) : 0;
        car.speed += accel;

        // Friction / braking - natural slowdown when not accelerating
        if (!k.up && !k.down) car.speed *= 0.94;
        if (k.down && car.gear === 0) car.speed *= 0.90;
        // Additional friction when in gear but not accelerating
        if (car.gear !== 0 && !k.up && Math.abs(car.speed) > 0.2) car.speed *= 0.97;

        // Speed limits per gear
        const maxSpd = car.gear > 0 ? car.gear * 3 : car.gear === -1 ? -1.5 : 0;
        if (car.gear !== 0) {
          if (car.gear > 0) car.speed = Math.min(car.speed, maxSpd);
          else car.speed = Math.max(car.speed, maxSpd);
        }
        car.speed = clamp(car.speed, -2, 12);

        // Steering
        const steerRate = 0.03 * Math.max(0.5, Math.abs(car.speed) / 3) * (dt / 16);
        if (k.left) { car.angle -= steerRate; car.steerAngle = Math.max(-1, car.steerAngle - 0.1); }
        else if (k.right) { car.angle += steerRate; car.steerAngle = Math.min(1, car.steerAngle + 0.1); }
        else { car.steerAngle *= 0.85; }

        // Drift
        if (Math.abs(car.speed) > 2.5 && (k.left || k.right)) {
          car.driftAngle += (car.angle - car.driftAngle) * 0.05;
        } else {
          car.driftAngle += (car.angle - car.driftAngle) * 0.15;
        }

        // Move
        car.x += Math.cos(car.driftAngle) * car.speed;
        car.y += Math.sin(car.driftAngle) * car.speed;

        // Wall collision — bounce back (skip inside garage, just clamp bounds)
        if (car.scene !== "garage") {
          for (const w of SCENES[car.scene].walls) {
            if (w.w < 30 && w.h < 30) continue;
            const cx2 = clamp(car.x, w.x, w.x + w.w);
            const cy2 = clamp(car.y, w.y, w.y + w.h);
            const cdx = car.x - cx2; const cdy = car.y - cy2;
            const distSq = cdx * cdx + cdy * cdy;
            if (distSq < 1200) { // Increased collision radius for better detection
              let nearDoor = false;
              for (const d of SCENES[car.scene].doors) {
                if (Math.abs(d.x + d.w/2 - cx2) < d.w/2 + 40 && Math.abs(d.y + d.h/2 - cy2) < d.h/2 + 40) {
                  nearDoor = true; break;
                }
              }
              if (nearDoor) continue;
              const pa = Math.atan2(cdy, cdx);
              // Push car further away from wall to prevent sticking
              const pushDist = 35 + Math.abs(car.speed) * 2;
              car.x = cx2 + Math.cos(pa) * pushDist;
              car.y = cy2 + Math.sin(pa) * pushDist;
              // Stronger bounce with more friction to stop completely
              car.speed *= -0.3;
              car.driftAngle = car.angle; // Reset drift on impact
              stats.shake = Math.min(8, Math.abs(car.speed) * 2);
              sound.play("carBounce");
            }
          }
        }

        // NPC collision — fling NPCs backward
        if (Math.abs(car.speed) > 0.8) {
          for (const n of npcsRef.current) {
            if (n.scene !== "outside" || n.transformed) continue;
            const npcDist = dist(car.x, car.y, n.x, n.y);
            if (npcDist < 45) {
              const angle = Math.atan2(n.y - car.y, n.x - car.x);
              const force = Math.abs(car.speed) * 15;
              n.x += Math.cos(angle) * force;
              n.y += Math.sin(angle) * force;
              n.x = clamp(n.x, 60, SCENES.outside.width - 60);
              n.y = clamp(n.y, 60, SCENES.outside.height - 60);
              n.targetX = n.x; n.targetY = n.y;
              n.reactionEmoji = "😱";
              n.reactionTimer = 2000;
              n.emotion = "shocked";
              n.emotionTimer = 2000;
              n.friendship = Math.max(0, n.friendship - 15);
              stats.shake = 4;
              sound.play("punch");
              showToast(`💥 Hit ${n.def.name}! Bounced off the car!`);
              car.speed *= 0.7;
              break;
            }
          }
        }

        car.x = clamp(car.x, 40, SCENES[car.scene].width - 40);
        car.y = clamp(car.y, 40, SCENES[car.scene].height - 40);

        // Car door detection — drive through doors
        for (const d of scene.doors) {
          if (car.x > d.x - 60 && car.x < d.x + d.w + 60 && car.y > d.y - 60 && car.y < d.y + d.h + 60) {
            if (d.targetScene === "apartments") continue;
            if (d.targetScene === "garage" && car.scene === "outside") {
              if (!garageDoorOpen.current) {
                showToast("🚫 Garage door is CLOSED! Press G near the door to open it.");
                car.speed *= -0.5;
              } else {
                car.scene = "garage";
                car.x = 400; car.y = 120; car.angle = Math.PI / 2; car.driftAngle = Math.PI / 2;
                car.speed = 0; car.gear = 0; car.engineRunning = false;
                car.inCar = false;
                m.scene = "garage"; m.x = car.x; m.y = car.y;
                showToast("🚗 Parked in garage");
              }
              break;
            }
            if (d.targetScene === "outside" && car.scene === "garage") {
              car.scene = "outside";
              car.x = 560; car.y = 700; car.angle = Math.PI / 2; car.driftAngle = Math.PI / 2;
              car.speed = 0; car.gear = 0; car.engineRunning = false;
              m.scene = "outside"; m.x = car.x; m.y = car.y;
              triggerTransition();
              showToast("🚗 Drove out of garage");
              break;
            }
            car.speed *= -0.5;
            break;
          }
        }

        // Gas
        if (car.engineRunning && Math.abs(car.speed) > 0.1) {
          car.gas = Math.max(0, car.gas - Math.abs(car.speed) * 0.003 * (dt / 16));
          if (car.gas <= 0) { car.engineRunning = false; car.speed = 0; showToast("⛽ Out of gas!"); }
        }
        car.rpm = car.engineRunning ? Math.abs(car.speed) * 200 + (car.gear > 0 ? car.gear * 500 : 0) : 0;

        // Engine sound - idle and driving
        if (car.engineRunning) {
          if (Math.abs(car.speed) > 0.5) {
            // Driving sound
            if (Math.random() < 0.08 + car.rpm * 0.00003) {
              sound.play("engineDrive");
            }
          } else {
            // Idle sound
            if (Math.random() < 0.02) {
              sound.play("engineIdle");
            }
          }
          // Occasional engine rev
          if (Math.random() < 0.015 + car.rpm * 0.00001) {
            sound.play("engineRev");
          }
        }

        // Player follows car
        m.x = car.x; m.y = car.y;
        m.walking = Math.abs(car.speed) > 0.3;
      }

      if (!stats.dead && !dialogActive) {
        let dx = 0, dy = 0;
        if (keysRef.current.up) dy -= 1;
        if (keysRef.current.down) dy += 1;
        if (keysRef.current.left) dx -= 1;
        if (keysRef.current.right) dx += 1;
        const len = Math.hypot(dx, dy);
        if (len > 0) {
          dx /= len; dy /= len;
          const chudSlowdown = m.scene === "hell" ? 1 : 1 - (stats.chud / 100) * 0.7; // Up to 70% slower at 100% chud
          const speed = PLAYER_SPEED * chudSlowdown * (dt / 16);
          const newX = m.x + dx * speed;
          const newY = m.y + dy * speed;
          if (!collides(newX, m.y, m.scene)) m.x = newX;
          if (!collides(m.x, newY, m.scene)) m.y = newY;
          if (Math.abs(dx) > Math.abs(dy)) m.dir = dx > 0 ? "right" : "left";
          else m.dir = dy > 0 ? "down" : "up";
          m.walking = true; m.walkPhase += dt / 110;
          stats.shake = Math.min(3, stats.shake + 0.3);
          stepSoundCdRef.current -= dt;
          if (stepSoundCdRef.current <= 0) { sound.play("step"); stepSoundCdRef.current = 280; }
        } else {
          m.walking = false;
          stats.shake *= 0.85;
        }
        m.x = clamp(m.x, 30 + PLAYER_RADIUS, scene.width - 30 - PLAYER_RADIUS);
        m.y = clamp(m.y, 30 + PLAYER_RADIUS, scene.height - 30 - PLAYER_RADIUS);
      } else {
        stats.shake *= 0.85;
      }

      // Hunger / chud (no chud buildup in hell during boss fight)
      if (!stats.dead && !dialogActive && m.scene !== "hell") {
        stats.hunger = clamp(stats.hunger + dtSec * 1.4, 0, 100);
        if (stats.hunger >= 100) stats.chud = clamp(stats.chud + dtSec * 0.4, 0, 100);
      }
      if (!stats.dead && !dialogActive && !m.walking && m.scene === "home") stats.chud = clamp(stats.chud + dtSec * 0.15, 0, 100);
      if (!stats.dead && !dialogActive && !m.walking && m.scene !== "hell") stats.chud = clamp(stats.chud + dtSec * 0.04, 0, 100);



      // Night flag (used for shadow chud and quests)
      const isNight = stats.timeSec / DAY_LENGTH_SECONDS > 0.7;

      // Hard quest checks
      if (stats.chud >= 80 && !stats.dead) completeQuest("chud-80");
      if (stats.hunger >= 100 && !stats.dead) completeQuest("full-hunger");
      if (stats.money === 0 && stats.totalMoneyEarned > 0) completeQuest("broke");
      if (isNight && m.scene !== "outside" && nightWarningShownRef.current) stats.survivedNight = true;

      // Max chud slows movement — no death from chud
      if (stats.chud >= 100) stats.shake = Math.min(6, stats.shake + 0.05);

      if (martinRef.current.hp <= 0 && !stats.dead && !fightRef.current) {
        stats.dead = true;
        stats.causeOfDeath = "Martin's body gave out from a beating.";
        sound.stopAlarm(); sound.play("death");
      }

      // Cousin Roy chomp
      if (cousinChompCdRef.current > 0) cousinChompCdRef.current -= dt;
      if (m.scene === "basement" && cousinChompCdRef.current <= 0 && !stats.dead) {
        const cousin = npcsRef.current.find((n) => n.def.id === "cousin-roy");
        if (cousin && !cousin.transformed) {
          const d = dist(cousin.x, cousin.y, m.x, m.y);
          if (d < 100) {
            martinRef.current.hp = Math.max(0, martinRef.current.hp - 25);
            stats.shake = 8;
            cousinChompCdRef.current = 2500;
            sound.play("cousinChomp");
            const angle = Math.atan2(m.y - cousin.y, m.x - cousin.x);
            m.x += Math.cos(angle) * 80; m.y += Math.sin(angle) * 80;
            m.x = clamp(m.x, 30 + PLAYER_RADIUS, SCENES.basement.width - 30 - PLAYER_RADIUS);
            m.y = clamp(m.y, 30 + PLAYER_RADIUS, SCENES.basement.height - 30 - PLAYER_RADIUS);
            statsRef.current.chud = clamp(statsRef.current.chud + 8, 0, 100);
            cousin.reactionEmoji = "🍖"; cousin.reactionTimer = 1500;
            showToast("CHOMP! Cousin Roy bit Martin. -25 HP, +8 chud trauma");
            if (martinRef.current.hp <= 0) {
              stats.dead = true;
              stats.causeOfDeath = "Eaten by Cousin Roy in the basement.";
              sound.play("death");
            }
          }
        }
      }

      // Cousin loose event — Cousin roams outside and chomps Martin
      if (statsRef.current.dailyEvent === "cousin-loose" && m.scene === "outside" && !stats.dead) {
        const cousin = npcsRef.current.find(n => n.def.id === "cousin-roy");
        if (cousin && cousin.scene === "outside") {
          // Move toward Martin
          const cdx = m.x - cousin.x; const cdy = m.y - cousin.y;
          const cd = Math.hypot(cdx, cdy);
          if (cd > 2) { const sp = 1.2 * (dt / 16); cousin.x += (cdx / cd) * sp; cousin.y += (cdy / cd) * sp; }
          if (cd < 90 && cousinChompCdRef.current <= 0) {
            martinRef.current.hp = Math.max(0, martinRef.current.hp - 20);
            stats.shake = 10; cousinChompCdRef.current = 2500;
            sound.play("cousinChomp");
            const ang = Math.atan2(m.y - cousin.y, m.x - cousin.x);
            m.x += Math.cos(ang) * 100; m.y += Math.sin(ang) * 100;
            m.x = clamp(m.x, 30 + PLAYER_RADIUS, SCENES.outside.width - 30 - PLAYER_RADIUS);
            m.y = clamp(m.y, 30 + PLAYER_RADIUS, SCENES.outside.height - 30 - PLAYER_RADIUS);
            cousin.reactionEmoji = "🍖"; cousin.reactionTimer = 1500;
            showToast("COUSIN IS OUTSIDE. He chomped you. -20 HP");
            if (martinRef.current.hp <= 0 && !stats.dead) {
              stats.dead = true; stats.causeOfDeath = "Cousin ate you. Outside. In broad daylight.";
              sound.play("death");
            }
          }
        }
      }
      if (isNight && m.scene === "outside" && !stats.dead) {
        // Show warning once per night
        if (!nightWarningShownRef.current) {
          nightWarningShownRef.current = true;
          showToast("👁️ THE COUSIN HAS AWAKENED. GET INSIDE.");
          sound.play("shock");
        }
        // Spawn if not present
        if (!shadowChudRef.current) {
          const edges: { x: number; y: number }[] = [
            { x: randomInt(100, 2700), y: 50 },
            { x: randomInt(100, 2700), y: 1950 },
            { x: 50, y: randomInt(100, 1900) },
            { x: 2750, y: randomInt(100, 1900) },
          ];
          const spawn = randomChoice(edges);
          shadowChudRef.current = { x: spawn.x, y: spawn.y, speed: 1.2, phase: 0, warningShown: true };
        }
        // Move Shadow Chud toward Martin
        const sc = shadowChudRef.current;
        if (sc) {
          sc.phase += dtSec * 4;
          const dx2 = m.x - sc.x; const dy2 = m.y - sc.y;
          const dist2 = Math.hypot(dx2, dy2);
          if (dist2 > 1) {
            const sp = sc.speed * (dt / 16);
            sc.x += (dx2 / dist2) * sp;
            sc.y += (dy2 / dist2) * sp;
          }
          // Speed scales with night depth - calculate dayProgress here to avoid scope issues
          const dayProgress = stats.timeSec / DAY_LENGTH_SECONDS;
          sc.speed = 1.0 + Math.max(0, (dayProgress - 0.7) * 6);
          // If caught
          if (dist2 < 45) {
            if (shadowChudCdRef.current <= 0) {
              const chdHit = 18 + randomInt(0, 10);
              addChud(chdHit);
              martinRef.current.hp = Math.max(0, martinRef.current.hp - 15);
              stats.shake = 12;
              shadowChudCdRef.current = 2000;
              sound.play("cousinChomp");
              const ang = Math.atan2(m.y - sc.y, m.x - sc.x);
              m.x += Math.cos(ang) * 120; m.y += Math.sin(ang) * 120;
              m.x = clamp(m.x, 30 + PLAYER_RADIUS, SCENES.outside.width - 30 - PLAYER_RADIUS);
              m.y = clamp(m.y, 30 + PLAYER_RADIUS, SCENES.outside.height - 30 - PLAYER_RADIUS);
              showToast(`THE COUSIN TOUCHES YOU. +${chdHit} chud, -15 HP`);
              if (martinRef.current.hp <= 0 && !stats.dead) {
                stats.dead = true;
                stats.causeOfDeath = "Devoured by The Cousin under the night sky.";
                sound.play("death");
              }
            }
          }
        }
      } else if (!isNight || m.scene !== "outside") {
        // Despawn shadow chud when inside or during day
        shadowChudRef.current = null;
      }
      if (shadowChudCdRef.current > 0) shadowChudCdRef.current -= dt;

      // NPC AI
      if (m.scene === "hell" && stats.hellDefeated) {
        const moggaylaBt = npcsRef.current.find((n) => n.def.id === "moggayla-bt");
        if (moggaylaBt && moggaylaBt.scene !== "hell") {
          moggaylaBt.scene = "hell";
          moggaylaBt.x = 300;
          moggaylaBt.y = 300;
        }
      }

      const currentHour = ((stats.timeSec / DAY_LENGTH_SECONDS) * (DAY_END_HOUR - DAY_START_HOUR)) + DAY_START_HOUR;
      const npcs = npcsRef.current;

      function getCurrentScheduleEntry(npc: NpcRuntime, hour: number) {
        if (!npc.def.schedule) return null;
        for (const entry of npc.def.schedule) {
          if (entry.startHour < entry.endHour) {
            if (hour >= entry.startHour && hour < entry.endHour) return entry;
          } else {
            if (hour >= entry.startHour || hour < entry.endHour) return entry;
          }
        }
        return null;
      }

      for (const n of npcs) {
        if (n.reactionTimer > 0) { n.reactionTimer -= dt; if (n.reactionTimer <= 0) n.reactionEmoji = null; }
        if (n.speechTimer > 0) { n.speechTimer -= dt; if (n.speechTimer <= 0) n.speechBubble = null; }
        if (n.emotionTimer > 0) { n.emotionTimer -= dt; if (n.emotionTimer <= 0) n.emotion = n.def.defaultMood ?? "neutral"; }
        if (n.transformed) continue;
        n.activityTimer -= dt;

        const entry = getCurrentScheduleEntry(n, currentHour);

        let targetScene = n.def.homeScene;
        let targetActivity: NpcActivity = "static";
        let targetX = n.def.baseX;
        let targetY = n.def.baseY;
        let isAsleep = false;

        if (entry) {
          targetScene = entry.scene;
          targetActivity = entry.activity;
          targetX = entry.targetX ?? (entry.scene === n.def.homeScene ? n.def.baseX : (SCENES[entry.scene]?.spawnPos.x ?? 400));
          targetY = entry.targetY ?? (entry.scene === n.def.homeScene ? n.def.baseY : (SCENES[entry.scene]?.spawnPos.y ?? 400));
          isAsleep = entry.startHour > entry.endHour;
        } else {
          const noSleepAt19 = ["mom", "mcmoggayla", "cousin-roy", "moggayla", "boss-charle"];
          if (currentHour >= 19 && !noSleepAt19.includes(n.def.id)) {
            isAsleep = true;
          } else {
            targetActivity = n.def.behavior;
          }
        }

        // Apply teleportation if scene changed
        if (n.scene !== targetScene) {
          n.scene = targetScene;
          n.x = targetX;
          n.y = targetY;
          n.targetX = targetX;
          n.targetY = targetY;
        }

        const wasAsleep = n.asleep;
        n.asleep = isAsleep;
        n.activity = targetActivity;

        if (wasAsleep && !n.asleep) {
          n.emotion = "angry";
          n.emotionTimer = 3000;
        }

        if (n.asleep) {
          n.speechBubble = null;
          n.speechTimer = 0;
          continue;
        }

        // End of day — walk to apartments at 6:30 PM, then disappear
        const aptDoor = SCENES.outside.doors.find(d => d.targetScene === "apartments");
        const aptDoorX = aptDoor ? aptDoor.x + aptDoor.w / 2 : 1260;
        const aptDoorY = aptDoor ? aptDoor.y + aptDoor.h / 2 : 1895;
        if (!n.goingHome && n.scene === "outside" && currentHour >= 18.5) {
          n.goingHome = true;
          n.targetX = aptDoorX;
          n.targetY = aptDoorY;
        }
        if (n.goingHome && n.scene === "outside") {
          if (dist(n.x, n.y, aptDoorX, aptDoorY) < 35) {
            n.goingHome = false;
            n.scene = "apartments";
            n.x = 500; n.y = 580;
            n.targetX = 500; n.targetY = 580;
            continue;
          }
          n.targetX = aptDoorX;
          n.targetY = aptDoorY;
        }
        // Wake up at 10 AM — teleport outside to open area
        if (n.scene === "apartments" && currentHour >= 10 && currentHour < 18.5) {
          n.goingHome = false;
          n.scene = "outside";
          const roadPts = SCENE_INTERESTS.outside ?? [];
          if (roadPts.length > 0) {
            const pt = roadPts[Math.floor(Math.random() * roadPts.length)];
            n.x = pt.x + randomInt(-15, 15);
            n.y = pt.y + randomInt(-15, 15);
            n.targetX = pt.x + randomInt(-60, 60);
            n.targetY = pt.y + randomInt(-60, 60);
          } else {
            n.x = 1400; n.y = 660;
            n.targetX = 1400; n.targetY = 660;
          }
          n.targetX = clamp(n.targetX, 60, SCENES.outside.width - 60);
          n.targetY = clamp(n.targetY, 60, SCENES.outside.height - 60);
          if (n.def.behavior === "soccer") {
            n.ballX = n.x; n.ballY = n.y;
            n.ballVX = 0; n.ballVY = 0;
          }
          continue;
        }

        // Soccer behavior
        if (n.def.behavior === "soccer" && n.ballX !== undefined && n.ballY !== undefined && n.ballVX !== undefined && n.ballVY !== undefined) {
          n.ballX += n.ballVX * (dt / 16);
          n.ballY += n.ballVY * (dt / 16);
          n.ballVX *= 0.95; n.ballVY *= 0.95;
          const sceneW = SCENES[n.scene].width;
          const sceneH = SCENES[n.scene].height;
          if (n.ballX < 50) { n.ballX = 50; n.ballVX = Math.abs(n.ballVX); }
          if (n.ballX > sceneW - 50) { n.ballX = sceneW - 50; n.ballVX = -Math.abs(n.ballVX); }
          if (n.ballY < 50) { n.ballY = 50; n.ballVY = Math.abs(n.ballVY); }
          if (n.ballY > sceneH - 50) { n.ballY = sceneH - 50; n.ballVY = -Math.abs(n.ballVY); }
          // Ball bounces off buildings/walls
          const ballR = 10;
          for (const w of SCENES[n.scene].walls) {
            if (w.w <= 30 && w.h <= 30) continue;
            const closestX = clamp(n.ballX, w.x, w.x + w.w);
            const closestY = clamp(n.ballY, w.y, w.y + w.h);
            const bdx = n.ballX - closestX;
            const bdy = n.ballY - closestY;
            if (bdx * bdx + bdy * bdy < ballR * ballR) {
              const cx = w.x + w.w / 2;
              const cy = w.y + w.h / 2;
              const pushX = n.ballX - cx;
              const pushY = n.ballY - cy;
              if (Math.abs(pushX) / w.w > Math.abs(pushY) / w.h) {
                n.ballVX = -n.ballVX;
                n.ballX = pushX > 0 ? w.x + w.w + ballR : w.x - ballR;
              } else {
                n.ballVY = -n.ballVY;
                n.ballY = pushY > 0 ? w.y + w.h + ballR : w.y - ballR;
              }
            }
          }
          const ballSpeed = Math.hypot(n.ballVX, n.ballVY);
          const dToBall = dist(n.x, n.y, n.ballX, n.ballY);
          if (ballSpeed < 0.3 && dToBall < 30) {
            const angle = Math.random() * Math.PI * 2;
            n.ballVX = Math.cos(angle) * 7;
            n.ballVY = Math.sin(angle) * 7;
            sound.play("soccerKick");
            n.reactionEmoji = "⚽"; n.reactionTimer = 700;
          } else if (ballSpeed < 0.5) {
            n.targetX = n.ballX; n.targetY = n.ballY;
          }
        }

        // Activity-based behavior
        if (n.activity === "static" || n.activity === "watchTV") {
          n.targetX = targetX;
          n.targetY = targetY;
          n.thoughtTimer -= dt;
          if (n.thoughtTimer <= 0) {
            n.thoughtTimer = 3000 + Math.random() * 2000;
            if (n.activity === "watchTV" && Math.random() < 0.4) {
              n.speechBubble = randomChoice(["...mhm", "shut up Martin im watching TV", "did you take out the trash", "your father called"]);
              n.speechTimer = 2500;
            } else if (n.def.chatLines && Math.random() < 0.3) {
              n.speechBubble = randomChoice(n.def.chatLines);
              n.speechTimer = 2500;
            }
          }
        } else if (n.activity === "guard") {
          n.thoughtTimer -= dt;
          if (n.thoughtTimer <= 0) {
            n.thoughtTimer = 2000 + Math.random() * 2000;
            n.targetX = clamp(targetX + randomInt(-60, 60), 60, SCENES[n.scene].width - 60);
            n.targetY = clamp(targetY + randomInt(-60, 60), 60, SCENES[n.scene].height - 60);
          }
        } else if (n.activity === "dance") {
          n.thoughtTimer -= dt;
          if (n.thoughtTimer <= 0) {
            n.thoughtTimer = 1000 + Math.random() * 1000;
            n.targetX = clamp(targetX + randomInt(-40, 40), 60, SCENES[n.scene].width - 60);
            n.targetY = clamp(targetY + randomInt(-40, 40), 60, SCENES[n.scene].height - 60);
          }
        } else if (n.activity === "stare") {
          n.targetX = n.x;
          n.targetY = n.y;
          const mdx = m.x - n.x, mdy = m.y - n.y;
          if (Math.abs(mdx) > Math.abs(mdy)) n.facingDir = mdx > 0 ? "right" : "left";
          else n.facingDir = mdy > 0 ? "down" : "up";
          n.thoughtTimer -= dt;
          if (n.thoughtTimer <= 0) {
            n.thoughtTimer = 2500 + Math.random() * 2000;
            if (n.def.chatLines && Math.random() < 0.3) {
              n.speechBubble = randomChoice(n.def.chatLines);
              n.speechTimer = 2500;
            }
          }
        } else if (n.activity === "eat") {
          n.thoughtTimer -= dt;
          if (n.thoughtTimer <= 0) {
            n.thoughtTimer = 2000 + Math.random() * 2000;
            if (Math.random() < 0.4) {
              n.speechBubble = randomChoice(["*munch munch*", "this is good", "more food", "eating is life"]);
              n.speechTimer = 2500;
            }
          }
        }

        // Separation: push NPCs apart if too close
        if (n.activity !== "chat") {
          for (const other of npcs) {
            if (other === n || other.scene !== n.scene || other.transformed || n.transformed) continue;
            const sepDist = dist(n.x, n.y, other.x, other.y);
            if (sepDist < 50 && sepDist > 0) {
              const pushStrength = (50 - sepDist) * 0.08;
              const pushX = (n.x - other.x) / sepDist;
              const pushY = (n.y - other.y) / sepDist;
              n.x += pushX * pushStrength * (dt / 16);
              n.y += pushY * pushStrength * (dt / 16);
            }
          }
        }

        // Wander targets — walk to interest points with purpose
        if (n.activity === "wander" || n.activity === "guard" || n.activity === "dance" || n.activity === "eat") {
          n.thoughtTimer -= dt;
          const distToTarget = dist(n.x, n.y, n.targetX, n.targetY);
          if (n.thoughtTimer <= 0 || distToTarget < 10) {
            n.thoughtTimer = 3000 + Math.random() * 4000;
            const interests = SCENE_INTERESTS[n.scene] ?? [];
            if (interests.length > 0) {
              let pt = interests[Math.floor(Math.random() * interests.length)];
              let attempts = 0;
              while (attempts < 8 && npcs.some(o => o !== n && o.scene === n.scene && !o.transformed && dist(o.x, o.y, pt.x, pt.y) < 45)) {
                pt = interests[Math.floor(Math.random() * interests.length)];
                attempts++;
              }
              n.targetX = clamp(pt.x + randomInt(-15, 15), 60, SCENES[n.scene].width - 60);
              n.targetY = clamp(pt.y + randomInt(-15, 15), 60, SCENES[n.scene].height - 60);
            } else {
              const range = 150;
              n.targetX = clamp(targetX + randomInt(-range, range), 60, SCENES[n.scene].width - 60);
              n.targetY = clamp(targetY + randomInt(-range, range), 60, SCENES[n.scene].height - 60);
            }
            if (n.def.chatLines && Math.random() < 0.1) {
              n.speechBubble = randomChoice(n.def.chatLines); n.speechTimer = 2200;
            }
          }
        }

        // Konstantin pickpocket behavior
        if (n.def.id === "konstantin" && !n.asleep && n.scene === m.scene) {
          n.pickpocketCd = Math.max(0, (n.pickpocketCd ?? 0) - dt);
          if (n.stalking) {
            n.targetX = m.x;
            n.targetY = m.y;
            const dToPlayer = dist(n.x, n.y, m.x, m.y);
            if (dToPlayer < 50) {
              // Pickpocket!
              const stealAmount = Math.min(100, statsRef.current.money);
              if (stealAmount > 0) {
                statsRef.current.money -= stealAmount;
                n.stalking = false;
                n.pickpocketCd = 30000 + Math.random() * 20000; // 30-50s cooldown
                n.reactionEmoji = "💰"; n.reactionTimer = 2000;
                sound.play("coin");
                showToast(`Konstantin pickpocketed you! -$${stealAmount} gone! He drinks it away at Nelly's.`);
                n.speechBubble = "Thanks for the donation, peasant!";
                n.speechTimer = 2500;
              } else {
                n.stalking = false;
                n.pickpocketCd = 15000; // shorter cooldown if no money
                n.reactionEmoji = "🙄"; n.reactionTimer = 2000;
                showToast("Konstantin tried to pickpocket you but you're broke. He looks disappointed.");
              }
            } else if (dToPlayer > 300) {
              // Lost the player, give up
              n.stalking = false;
              n.reactionEmoji = "😤"; n.reactionTimer = 1500;
            } else {
              n.reactionEmoji = "🥷"; n.reactionTimer = 300;
            }
          } else if ((n.pickpocketCd ?? 0) <= 0 && !n.stalking) {
            // Small chance to start stalking: ~1.5% per second
            if (Math.random() < 0.000015 * dt) {
              n.stalking = true;
              n.reactionEmoji = "👀"; n.reactionTimer = 1500;
            }
          }
        }

        // Move toward target
        const dx = n.targetX - n.x;
        const dy = n.targetY - n.y;
        const d2 = Math.hypot(dx, dy);
        if (d2 > 2) {
          n.stuckTimer = 0;
          const sp = n.speed * (dt / 16);
          n.x += (dx / d2) * sp; n.y += (dy / d2) * sp;
          n.walkPhase += dt / 130;
          if (Math.abs(dx) > Math.abs(dy)) n.facingDir = dx > 0 ? "right" : "left";
          else n.facingDir = dy > 0 ? "down" : "up";
          // NPC collision check - push back if inside wall/building
          if (collides(n.x, n.y, n.scene)) {
            n.x -= (dx / d2) * sp * 2;
            n.y -= (dy / d2) * sp * 2;
            const fallback = SCENE_INTERESTS[n.scene] ?? [];
            if (fallback.length > 0) {
              const pt = fallback[Math.floor(Math.random() * fallback.length)];
              n.targetX = pt.x + randomInt(-20, 20);
              n.targetY = pt.y + randomInt(-20, 20);
            } else {
              n.targetX = clamp(n.x + randomInt(-60, 60), 60, SCENES[n.scene].width - 60);
              n.targetY = clamp(n.y + randomInt(-60, 60), 60, SCENES[n.scene].height - 60);
            }
          }
        } else {
          // Stuck detector — if NPC hasn't moved for 2s, teleport to road
          n.stuckTimer += dt;
          if (n.stuckTimer > 2000) {
            n.stuckTimer = 0;
            const fallback = SCENE_INTERESTS[n.scene] ?? [];
            if (fallback.length > 0) {
              const pt = fallback[Math.floor(Math.random() * fallback.length)];
              n.x = pt.x; n.y = pt.y;
              n.targetX = pt.x + randomInt(-40, 40);
              n.targetY = pt.y + randomInt(-40, 40);
            }
            if (n.def.behavior === "soccer" && n.ballX !== undefined && n.ballY !== undefined) {
              n.ballX = n.x; n.ballY = n.y;
              n.ballVX = 0; n.ballVY = 0;
            }
          }
        }
      }

      // Camera
      const camTarget = { x: m.x - canvas.clientWidth / 2, y: m.y - canvas.clientHeight / 2 };
      camTarget.x = clamp(camTarget.x, 0, Math.max(0, scene.width - canvas.clientWidth));
      camTarget.y = clamp(camTarget.y, 0, Math.max(0, scene.height - canvas.clientHeight));
      cameraRef.current.x += (camTarget.x - cameraRef.current.x) * 0.15;
      cameraRef.current.y += (camTarget.y - cameraRef.current.y) * 0.15;

      // Flight animation update
      const flight = flightAnimRef.current;
      if (flight) {
        flight.timer += dt;
        if (flight.phase === "takeoff" && flight.timer > 1500) {
          flight.phase = "flying";
          flight.timer = 0;
        } else if (flight.phase === "flying" && flight.timer > 2500) {
          flight.phase = "landing";
          flight.timer = 0;
        } else if (flight.phase === "landing" && flight.timer > 1500) {
          flightAnimRef.current = null;
          setFlightAnim(null);
          statsRef.current.hellDefeated = false; // Boss respawns
          martinRef.current.scene = "hell";
          martinRef.current.x = 1000;
          martinRef.current.y = 1200;
          martinRef.current.hp = 100; // Full heal before fight
          triggerTransition();
          sound.play("door");
          showToast("✈️ Welcome to HELL. Enjoy your stay.");
          hellWelcomeRef.current = 10000;
          visitScene("hell");
          saveGame();
        }
      }

      render(ctx, canvas, scene, m, npcs, stats, eatTimerRef.current, shadowChudRef.current, ballAnimRef.current, flightAnimRef.current, hellBossRef.current, hellProjectilesRef.current, hellPickupsRef.current, greaseProjectilesRef.current, hellWelcomeRef.current, carRef.current, garageDoorOpen.current);
      eatTimerRef.current = Math.max(0, eatTimerRef.current - dt);
      if (ballAnimRef.current) {
        ballAnimRef.current.t += dt / 800; // 800ms full arc
        if (ballAnimRef.current.t >= 1) ballAnimRef.current = null;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [showStart, startNewDay, showToast]);

  // Day timer
  useEffect(() => {
    if (showStart) return;
    let raf = 0; let last = performance.now();
    const tick = (ts: number) => {
      const dt = Math.min(50, ts - last); last = ts;
      const stats = statsRef.current;
      const dialogActive = !!dialogRef.current || !!fightRef.current || showPhoneRef.current || !!flightAnimRef.current;
      if (!stats.dead && !dialogActive) {
        stats.timeSec += dt / 1000;
        if (stats.timeSec >= DAY_LENGTH_SECONDS) { stats.timeSec = 0; startNewDay(); }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [showStart, startNewDay]);

  // Visit-scene tracking on every change
  useEffect(() => {
    const interval = setInterval(() => {
      visitScene(martinRef.current.scene);
    }, 500);
    return () => clearInterval(interval);
  }, [visitScene]);

  // Quest completion check (visited all easter)
  useEffect(() => {
    const interval = setInterval(() => {
      const visited = statsRef.current.scenesVisited;
      const easter = ["moggayla", "cartier", "nelly", "gym", "asbestos", "stripclub", "fishing"];
      if (easter.every((s) => visited.includes(s))) completeQuest("explore-easter");
    }, 1000);
    return () => clearInterval(interval);
  }, [completeQuest]);

  const gameTime = (() => {
    const stats = statsRef.current;
    const totalMinutes = (stats.timeSec / DAY_LENGTH_SECONDS) * (DAY_END_HOUR - DAY_START_HOUR) * 60;
    const hours = Math.floor(totalMinutes / 60) + DAY_START_HOUR;
    const mins = Math.floor(totalMinutes % 60);
    const ampm = hours >= 12 ? "PM" : "AM";
    const display = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${display}:${mins.toString().padStart(2, "0")} ${ampm}`;
  })();

  const respawn = () => {
    clearSave();
    statsRef.current = initialStats();
    martinRef.current = { scene: "home", x: 420, y: 580, dir: "down", walking: false, walkPhase: 0, hp: 100, hpMax: 100 };
    npcsRef.current = makeNpcs();
    sound.stopAlarm();
    setShowStart(true); setFight(null); setDialog(null); setShowPhone(false);
    forceUpdate((n) => n + 1);
  };

  const stats = statsRef.current;

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black overflow-hidden">
      <canvas ref={canvasRef} className="block w-full h-full" />

      {!showStart && (
        <HUD
          money={stats.money} hunger={stats.hunger} chud={stats.chud}
          day={stats.day} timeStr={gameTime}
          hp={martinRef.current.hp} hpMax={martinRef.current.hpMax}
          sceneName={SCENES[martinRef.current.scene].name}
          muted={muted}
          onTogglePhone={() => { setShowPhone((v) => { sound.play(v ? "phoneTab" : "phoneOpen"); return !v; }); }}
          onToggleMute={() => { const m = sound.toggleMute(); setMuted(m); }}
          questsDone={stats.questsCompleted.length}
          questsTotal={ALL_QUESTS.length}
          dailyEvent={stats.dailyEvent}
          tutorialStep={stats.tutorialStep}
          mainQuestStep={stats.buttplugQuestStep}
          hasHummus={stats.hasHummus}
          hasButtplug={stats.hasButtplug}
        />
      )}

      {transitionFlash > 0 && <div key={transitionFlash} className="transition-overlay" />}

      {toast && (
        <div key={toast.key}
          className="fade-in absolute top-24 left-1/2 -translate-x-1/2 bg-black/85 border border-primary/60 text-white px-4 py-2 rounded-md pixel-text text-[11px] z-30 max-w-[80%] text-center"
          onAnimationEnd={() => setTimeout(() => setToast((t) => (t && t.key === toast.key ? null : t)), 2400)}>
          {toast.msg}
        </div>
      )}

      {dialog && <DialogPanel title={dialog.title} body={dialog.body} emoji={dialog.emoji} choices={dialog.choices} />}

      {fight && <FightOverlay state={fight} onAttack={fightAttack} onBlock={fightBlock} onClose={closeFight} />}

      <PhoneMenu
        open={showPhone}
        onClose={() => { setShowPhone(false); sound.play("phoneTab"); }}
        stats={stats} npcs={npcsRef.current} quests={ALL_QUESTS}
        martinScene={martinRef.current.scene}
        martinPos={{ x: martinRef.current.x, y: martinRef.current.y }}
        muted={muted}
        onToggleMute={() => { const m = sound.toggleMute(); setMuted(m); }}
        onCallNpc={(npcId) => {
          const s = statsRef.current;
          if (!s.calledNpcs.includes(npcId)) {
            s.calledNpcs.push(npcId);
            const callableIds = Object.keys(CALL_SCRIPTS);
            if (callableIds.every(id => s.calledNpcs.includes(id))) completeQuest("call-everyone");
          }
        }}
      />

      {stats.dead && (
        <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center z-40 gap-4">
          <div className="pixel-text text-3xl text-destructive">GAME OVER</div>
          <div className="pixel-text text-sm text-foreground max-w-md text-center px-6">{stats.causeOfDeath}</div>
          <div className="pixel-text text-xs text-muted-foreground">Day {stats.day} • ${stats.totalMoneyEarned} total earned</div>
          <button onClick={respawn} className="pixel-text bg-primary text-primary-foreground px-5 py-3 rounded mt-2 hover:brightness-110">
            Restart
          </button>
        </div>
      )}

      {/* Car HUD when in car */}
      {!showStart && carRef.current.inCar && (
        <div className="absolute inset-0 pointer-events-none z-20">
          {/* Gear / Speed / Gas display */}
          <div className="absolute bottom-16 left-3 bg-black/80 border border-primary/40 rounded px-4 py-3 pixel-text text-[9px]">
            <div className="flex gap-4 mb-2">
              <span className="text-primary">Gear: {carRef.current.gear === 0 ? "N" : carRef.current.gear === -1 ? "R" : carRef.current.gear}</span>
              <span className="text-foreground">{Math.abs(Math.round(carRef.current.speed * 20))} km/h</span>
              <span className={carRef.current.headlights ? "text-yellow-400" : "text-muted-foreground"}>🔦 {carRef.current.headlights ? "ON" : "OFF"}</span>
            </div>
            <div className="flex gap-3 items-center mb-1">
              <span className="text-accent">⛽ {Math.round(carRef.current.gas)}%</span>
              <div className="w-20 h-2 bg-secondary rounded overflow-hidden">
                <div className={`h-full ${carRef.current.gas > 20 ? "bg-accent" : "bg-destructive"} transition-all`} style={{ width: `${carRef.current.gas}%` }} />
              </div>
            </div>
            <div className="text-[7px] text-muted-foreground mt-1">
              1-4: gears • R: reverse • N: neutral • H: lights • W: accel • E: exit
            </div>
          </div>
          {/* Steering wheel */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto">
            <svg width="80" height="80" viewBox="-40 -40 80 80">
              <circle cx="0" cy="0" r="35" fill="none" stroke="#8B7355" strokeWidth="6" />
              <circle cx="0" cy="0" r="30" fill="none" stroke="#6B5335" strokeWidth="2" />
              <line x1="0" y1="0" x2={Math.sin(carRef.current.steerAngle) * 25} y2={-Math.cos(carRef.current.steerAngle) * 25}
                stroke="#ddd" strokeWidth="3" strokeLinecap="round" />
              <circle cx="0" cy="0" r="5" fill="#555" />
              <text x="0" y="1" textAnchor="middle" dominantBaseline="middle" fill="#999" fontSize="4" fontFamily="monospace">Z</text>
            </svg>
          </div>
          {/* E to exit prompt */}
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 bg-black/60 rounded px-3 py-1 pixel-text text-[8px] text-muted-foreground">
            Press E to exit car
          </div>
        </div>
      )}

      {showStart && <StartScreen hasSave={hasSave()} onContinue={() => startGame(false)} onNewGame={() => startGame(true)} />}
    </div>
  );
}

// Helpers ----------------------------------------------------------

function collides(x: number, y: number, sceneId: SceneId): boolean {
  const scene = SCENES[sceneId];
  for (const w of scene.walls) {
    const r = PLAYER_RADIUS - 4;
    const closestX = clamp(x, w.x, w.x + w.w);
    const closestY = clamp(y, w.y, w.y + w.h);
    const dx = x - closestX; const dy = y - closestY;
    if (dx * dx + dy * dy < r * r) {
      // Check if near a door (allow passage through doors in all scenes)
      for (const d of scene.doors) {
        if (Math.abs(d.x - closestX) < d.w && Math.abs(d.y - closestY) < d.h + 20) return false;
      }
      return true;
    }
  }
  return false;
}

function render(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  scene: ReturnType<typeof Object.values<typeof SCENES>>[number],
  m: MartinState,
  npcs: NpcRuntime[],
  stats: GameStats,
  eatTimer: number,
  shadowChud: ShadowChud | null,
  ballAnim: { t: number; made: boolean } | null,
  flightAnim: { phase: "idle" | "takeoff" | "flying" | "landing"; timer: number; } | null,
  hellBoss: { hp: number; hpMax: number; x: number; y: number; punchCd: number; barrageCd: number; walkPhase: number; dir: Direction } | null,
  hellProjectiles: { x: number; y: number; vx: number; vy: number; damage: number; active: boolean; emoji: string }[],
  hellPickups: { x: number; y: number; type: "gun" | "food"; active: boolean; timer: number; lifetime: number }[],
  greaseProjectiles: { x: number; y: number; vx: number; vy: number; active: boolean }[],
  hellWelcomeTimer: number,
  car: CarState,
  garageDoorOpen: boolean,
) {
  const w = canvas.clientWidth; const h = canvas.clientHeight;
  const shakeX = (Math.random() - 0.5) * stats.shake;
  const shakeY = (Math.random() - 0.5) * stats.shake;
  ctx.fillStyle = scene.bgColor; ctx.fillRect(0, 0, w, h);
  const camX = clamp(m.x - w / 2, 0, Math.max(0, scene.width - w)) + shakeX;
  const camY = clamp(m.y - h / 2, 0, Math.max(0, scene.height - h)) + shakeY;
  ctx.save(); ctx.translate(-camX, -camY);

  drawBackgroundPattern(ctx, scene);
  if (scene.id === "outside") drawRoads(ctx, scene.width, scene.height);

  for (const wall of scene.walls) {
    const c = wall.color ?? "#4a3020";
    ctx.fillStyle = c; ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 2;
    ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
    ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.fillRect(wall.x, wall.y, wall.w, 22);
    if (wall.label && wall.w > 100 && wall.h > 80) {
      ctx.fillStyle = "rgba(255, 220, 130, 0.55)";
      ctx.fillRect(wall.x + 24, wall.y + 60, 36, 36);
      ctx.fillRect(wall.x + wall.w - 60, wall.y + 60, 36, 36);
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.font = "10px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText(wall.label, wall.x + wall.w / 2, wall.y + wall.h - 14);
    }
  }

  for (const d of scene.doors) {
    if (d.id === "d-garage" && !garageDoorOpen) {
      // Closed garage door — draw as wall
      ctx.fillStyle = "#6a5a40"; ctx.fillRect(d.x, d.y, d.w, d.h);
      ctx.strokeStyle = "#3a2a10"; ctx.lineWidth = 2; ctx.strokeRect(d.x, d.y, d.w, d.h);
      ctx.fillStyle = "#fff"; ctx.font = "7px 'Press Start 2P', monospace"; ctx.textAlign = "center";
      ctx.fillText("CLOSED", d.x + d.w / 2, d.y + d.h / 2 + 3);
      ctx.fillStyle = "#fff"; ctx.font = "9px 'Press Start 2P', monospace";
      ctx.fillText("Garage [G] to open", d.x + d.w / 2, d.y - 6);
    } else {
      ctx.fillStyle = d.color ?? "#f4b860"; ctx.fillRect(d.x, d.y, d.w, d.h);
      ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 2; ctx.strokeRect(d.x, d.y, d.w, d.h);
      ctx.fillStyle = "#fff"; ctx.font = "9px 'Press Start 2P', monospace"; ctx.textAlign = "center";
      ctx.fillText(d.label, d.x + d.w / 2, d.y - 6);
    }
  }

  for (const it of scene.interactables) {
    if (it.id === "basement-hummus" && (stats.buttplugQuestStep < 2 || stats.hasHummus)) continue;
    drawInteractable(ctx, it);
    if (m.x > it.x - 60 && m.x < it.x + it.w + 60 && m.y > it.y - 60 && m.y < it.y + it.h + 60) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      const txt = `[E] ${it.label}`;
      ctx.font = "9px 'Press Start 2P', monospace";
      const tw = ctx.measureText(txt).width;
      ctx.fillRect(it.x + it.w / 2 - tw / 2 - 6, it.y - 28, tw + 12, 18);
      ctx.fillStyle = "#fff"; ctx.textAlign = "center";
      ctx.fillText(txt, it.x + it.w / 2, it.y - 16);
    }
  }

  // Soccer balls (Damian)
  for (const n of npcs) {
    if (n.scene !== scene.id) continue;
    if (n.def.behavior === "soccer" && !n.transformed && n.ballX !== undefined && n.ballY !== undefined) {
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(n.ballX, n.ballY, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#000"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = "#000";
      ctx.beginPath(); ctx.arc(n.ballX - 2, n.ballY - 2, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(n.ballX + 2, n.ballY + 2, 1.5, 0, Math.PI * 2); ctx.fill();
    }
  }

  for (const n of npcs) {
    if (n.scene !== scene.id) continue;
    if (n.def.id === "boss-charle") continue;
    if (n.asleep) {
      ctx.globalAlpha = 0.6;
      drawNpc(ctx, n);
      ctx.globalAlpha = 1;
      ctx.font = "20px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("💤", n.x, n.y - n.def.size - 20);
      ctx.textBaseline = "alphabetic";
    } else {
      drawNpc(ctx, n);
    }
    if (n.speechBubble) drawSpeechBubble(ctx, n.x, n.y - n.def.size - 28, n.speechBubble);
    if (n.reactionEmoji) drawReaction(ctx, n.x + n.def.size, n.y - n.def.size - 8, n.reactionEmoji);
    if (!n.transformed && dist(n.x, n.y, m.x, m.y) < 70 + n.def.size) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      const txt = `[E] talk to ${n.def.name}`;
      ctx.font = "9px 'Press Start 2P', monospace";
      const tw = ctx.measureText(txt).width;
      ctx.fillRect(n.x - tw / 2 - 6, n.y - n.def.size - 56, tw + 12, 18);
      ctx.fillStyle = "#fff"; ctx.textAlign = "center";
      ctx.fillText(txt, n.x, n.y - n.def.size - 44);
    }
  }

  // Draw car only in its current scene
  if (scene.id === car.scene) {
    drawCar(ctx, car);
  }

  // Draw Martin (hidden when in car)
  if (!car.inCar) {
    drawMartin(ctx, m, eatTimer > 0, stats.hunger, stats.chud);
  }

  if (scene.id === "hell") {
    if (hellBoss) {
      const bossDef = NPC_DEFS.find((d) => d.id === "boss-charle");
      if (bossDef) drawBoss(ctx, hellBoss, bossDef);
    }
    ctx.save();
    for (const p of hellPickups) {
      if (!p.active) continue;
      ctx.font = "20px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const emoji = p.type === "gun" ? "🔫" : "🍞";
      ctx.fillText(emoji, p.x, p.y);
    }
    for (const proj of hellProjectiles) {
      if (!proj.active) continue;
      ctx.font = "20px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(proj.emoji, proj.x, proj.y);
    }
    // Grease projectiles
    for (const g of greaseProjectiles) {
      if (!g.active) continue;
      // Glow
      const glow = ctx.createRadialGradient(g.x, g.y, 4, g.x, g.y, 25);
      glow.addColorStop(0, "rgba(255, 200, 50, 0.6)");
      glow.addColorStop(1, "rgba(255, 100, 0, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(g.x, g.y, 25, 0, Math.PI * 2); ctx.fill();
      // Trail
      ctx.strokeStyle = "rgba(255, 180, 40, 0.9)";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y);
      ctx.lineTo(g.x - g.vx * 6, g.y - g.vy * 6);
      ctx.stroke();
      // Body
      ctx.fillStyle = "#ffaa20";
      ctx.beginPath(); ctx.arc(g.x, g.y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#ff6600"; ctx.lineWidth = 2; ctx.stroke();
      // Center highlight
      ctx.fillStyle = "#ffdd80";
      ctx.beginPath(); ctx.arc(g.x, g.y, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // Basketball arc animation
  if (ballAnim && scene.id === "court") {
    const hoop = scene.interactables.find((x) => x.id === "hoop");
    if (hoop) {
      const hoopX = hoop.x + hoop.w / 2;
      const hoopY = hoop.y + hoop.h / 2;
      const startX = m.x; const startY = m.y - 30;
      const t = ballAnim.t;
      // Parabolic arc: x lerp, y = lerp + arc height
      const bx = startX + (hoopX - startX) * t;
      const by = startY + (hoopY - startY) * t - Math.sin(t * Math.PI) * 120;
      // Ball
      ctx.save();
      ctx.fillStyle = "#d97a30";
      ctx.beginPath(); ctx.arc(bx, by, 10, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#000"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.strokeStyle = "#7a3a10"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(bx - 10, by); ctx.lineTo(bx + 10, by); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx, by - 10); ctx.lineTo(bx, by + 10); ctx.stroke();
      // If made and near hoop, draw swish ripple
      if (ballAnim.made && t > 0.85) {
        const alpha = 1 - (t - 0.85) / 0.15;
        ctx.strokeStyle = `rgba(255,200,50,${alpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(hoopX, hoopY, (t - 0.85) / 0.15 * 25, 0, Math.PI * 2); ctx.stroke();
      }
      // If missed, show X
      if (!ballAnim.made && t > 0.7) {
        const alpha = Math.min(1, (t - 0.7) / 0.2);
        ctx.fillStyle = `rgba(255,60,60,${alpha})`;
        ctx.font = "bold 28px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("✗", hoopX, hoopY - 20);
      }
      ctx.restore();
    }
  }

  ctx.restore();

  // Boss HUD bar
  if (scene.id === "hell" && hellBoss) {
    const barW = 220;
    const barH = 14;
    const hpPct = Math.max(0, hellBoss.hp / hellBoss.hpMax);
    const bx = w / 2 - barW / 2;
    const by = 38;
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(bx, by, barW, barH);
    ctx.fillStyle = "#d02020";
    ctx.fillRect(bx, by, barW * hpPct, barH);
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, barW, barH);
    ctx.fillStyle = "#fff"; ctx.font = "bold 9px 'Press Start 2P', monospace"; ctx.textAlign = "center";
    ctx.fillText(`CHARLE THE COLOSSUS ${Math.ceil(hellBoss.hp)}/${hellBoss.hpMax}`, w / 2, by - 4);

    // Welcome text
    if (hellWelcomeTimer > 0) {
      const alpha = Math.min(1, hellWelcomeTimer / 1000);
      ctx.fillStyle = `rgba(255, 180, 40, ${alpha})`;
      ctx.font = "bold 14px 'Press Start 2P', monospace"; ctx.textAlign = "center";
      ctx.fillText("Welcome to Hell!", w / 2, h / 2 - 40);
      ctx.font = "10px 'Press Start 2P', monospace";
      ctx.fillText("Defeat Charle to come back", w / 2, h / 2 - 15);
      ctx.fillText("Use SPACE to use Grease Attack!", w / 2, h / 2 + 10);
    }
  }

  // Night overlay — stars, moon, darkness
  const dayProgress = stats.timeSec / DAY_LENGTH_SECONDS;
  if (dayProgress > 0.65) {
    const t = Math.min(1, (dayProgress - 0.65) / 0.2); // 0→1 as night deepens

    // Dark sky gradient
    const nightAlpha = 0.62 * t;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, `rgba(5, 2, 28, ${nightAlpha})`);
    grad.addColorStop(0.6, `rgba(10, 5, 40, ${nightAlpha * 0.85})`);
    grad.addColorStop(1, `rgba(15, 8, 30, ${nightAlpha * 0.7})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Stars — seeded so they don't flicker on every frame
    if (t > 0.15) {
      const starAlpha = Math.min(1, (t - 0.15) / 0.4);
      ctx.fillStyle = `rgba(255, 255, 255, ${starAlpha * 0.85})`;
      // Use deterministic pseudo-random positions based on day number
      const seed = stats.day * 31337;
      for (let i = 0; i < 80; i++) {
        const sx = ((seed * (i + 1) * 1664525 + 1013904223) >>> 0) % w;
        const sy = ((seed * (i + 1) * 22695477 + 1) >>> 0) % (h * 0.55);
        const sz = (i % 3 === 0) ? 2 : 1;
        // Subtle twinkle
        const twinkle = 0.5 + 0.5 * Math.sin(performance.now() / 600 + i * 1.7);
        ctx.globalAlpha = starAlpha * twinkle * 0.9;
        ctx.beginPath();
        ctx.arc(sx, sy, sz, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Moon — top-right corner
      const moonX = w * 0.82; const moonY = h * 0.12;
      const moonR = 22 * Math.min(1, starAlpha * 2);
      // Moon glow
      const moonGlow = ctx.createRadialGradient(moonX, moonY, moonR * 0.4, moonX, moonY, moonR * 3);
      moonGlow.addColorStop(0, `rgba(220, 230, 180, ${starAlpha * 0.22})`);
      moonGlow.addColorStop(1, `rgba(220, 230, 180, 0)`);
      ctx.fillStyle = moonGlow;
      ctx.beginPath(); ctx.arc(moonX, moonY, moonR * 3, 0, Math.PI * 2); ctx.fill();
      // Moon body
      ctx.fillStyle = `rgba(240, 245, 200, ${starAlpha})`;
      ctx.beginPath(); ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2); ctx.fill();
      // Crescent shadow
      ctx.fillStyle = `rgba(5, 2, 28, ${starAlpha * 0.55})`;
      ctx.beginPath(); ctx.arc(moonX + moonR * 0.35, moonY - moonR * 0.1, moonR * 0.85, 0, Math.PI * 2); ctx.fill();

      // Eerie fog at ground level when very dark
      if (t > 0.7) {
        const fogAlpha = (t - 0.7) / 0.3 * 0.3;
        const fogGrad = ctx.createLinearGradient(0, h * 0.65, 0, h);
        fogGrad.addColorStop(0, `rgba(10, 0, 30, 0)`);
        fogGrad.addColorStop(1, `rgba(30, 5, 60, ${fogAlpha})`);
        ctx.fillStyle = fogGrad;
        ctx.fillRect(0, h * 0.65, w, h * 0.35);
      }
    }
  }

  // Draw Shadow Chud on top of the night overlay, in canvas space (not world space)
  if (shadowChud && scene.id === "outside") {
    const camX = clamp(m.x - w / 2, 0, Math.max(0, scene.width - w));
    const camY = clamp(m.y - h / 2, 0, Math.max(0, scene.height - h));
    const sx = shadowChud.x - camX;
    const sy = shadowChud.y - camY;
    drawShadowChud(ctx, sx, sy, shadowChud.phase);
  }

  // Flight animation overlay
  if (flightAnim) {
    ctx.save();
    const w = canvas.clientWidth; const h = canvas.clientHeight;
    ctx.fillStyle = "#0a2040";
    ctx.fillRect(0, 0, w, h);

    // Stars
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    for (let i = 0; i < 60; i++) {
      const sx = (i * 137.5) % w;
      const sy = (i * 73.3) % h;
      const sz = i % 3 === 0 ? 2 : 1;
      const twinkle = 0.5 + 0.5 * Math.sin(performance.now() / 400 + i * 2.1);
      ctx.globalAlpha = twinkle * 0.9;
      ctx.beginPath(); ctx.arc(sx, sy, sz, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Moon
    const moonX = w * 0.15; const moonY = h * 0.2;
    ctx.fillStyle = "rgba(240, 245, 200, 0.9)";
    ctx.beginPath(); ctx.arc(moonX, moonY, 18, 0, Math.PI * 2); ctx.fill();

    // Clouds (passing by)
    const cloudSpeed = flightAnim.phase === "flying" ? 8 : 2;
    const cloudOffset = (flightAnim.timer / 16) * cloudSpeed;
    for (let i = 0; i < 8; i++) {
      const cx = ((i * 250 + cloudOffset) % (w + 200)) - 100;
      const cy = 80 + (i * 73) % (h * 0.4);
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.beginPath();
      ctx.ellipse(cx, cy, 40, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Plane
    const planeX = flightAnim.phase === "takeoff"
      ? w * 0.3 + (flightAnim.timer / 1500) * w * 0.2
      : flightAnim.phase === "flying"
      ? w * 0.5 + Math.sin(flightAnim.timer / 500) * 30
      : w * 0.7 + (flightAnim.timer / 1500) * w * 0.2;
    const planeY = flightAnim.phase === "takeoff"
      ? h * 0.6 - (flightAnim.timer / 1500) * h * 0.35
      : flightAnim.phase === "flying"
      ? h * 0.25 + Math.sin(flightAnim.timer / 300) * 10
      : h * 0.25 + (flightAnim.timer / 1500) * h * 0.35;
    const scale = flightAnim.phase === "takeoff"
      ? 0.6 + (flightAnim.timer / 1500) * 0.4
      : flightAnim.phase === "flying" ? 1 : 1 - (flightAnim.timer / 1500) * 0.3;

    ctx.save();
    ctx.translate(planeX, planeY);
    ctx.scale(scale, scale);
    // Plane body
    ctx.fillStyle = "#e0e0e0";
    ctx.beginPath();
    ctx.ellipse(0, 0, 40, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    // Wings
    ctx.fillStyle = "#c0c0c0";
    ctx.beginPath();
    ctx.moveTo(-10, 0); ctx.lineTo(-25, 18); ctx.lineTo(5, 18); ctx.lineTo(10, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-5, -5); ctx.lineTo(-15, -18); ctx.lineTo(5, -18); ctx.lineTo(10, -5);
    ctx.fill();
    // Tail
    ctx.fillStyle = "#b0b0b0";
    ctx.beginPath();
    ctx.moveTo(30, -2); ctx.lineTo(40, -12); ctx.lineTo(35, -2);
    ctx.fill();
    // Windows
    ctx.fillStyle = "#4a90d9";
    for (let i = -20; i < 20; i += 10) {
      ctx.beginPath(); ctx.arc(i, -3, 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // "10 hours later" text during flying phase
    if (flightAnim.phase === "flying" && flightAnim.timer > 800) {
      const alpha = Math.min(1, (flightAnim.timer - 800) / 600);
      ctx.fillStyle = `rgba(255, 180, 40, ${alpha})`;
      ctx.font = "bold 24px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText("10 HOURS LATER", w / 2, h / 2);
    }

    ctx.restore();
  }
}

function drawShadowChud(ctx: CanvasRenderingContext2D, x: number, y: number, phase: number) {
  // Pulsing shadowy mass with glowing red eyes
  const wobble = Math.sin(phase) * 4;
  const pulsate = 0.88 + 0.12 * Math.sin(phase * 1.5);
  const r = 32 * pulsate;

  // Shadow tendrils
  ctx.save();
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + phase * 0.3;
    const len = r * (0.8 + 0.5 * Math.sin(phase * 2 + i));
    const tx = x + Math.cos(angle) * len;
    const ty = y + wobble + Math.sin(angle) * len;
    ctx.strokeStyle = "rgba(80, 0, 120, 0.7)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, y + wobble);
    ctx.quadraticCurveTo(
      x + Math.cos(angle) * len * 0.5 + Math.sin(angle + 1) * 10,
      y + wobble + Math.sin(angle) * len * 0.5,
      tx, ty
    );
    ctx.stroke();
  }

  // Glow aura
  const glow = ctx.createRadialGradient(x, y + wobble, r * 0.1, x, y + wobble, r * 2.5);
  glow.addColorStop(0, "rgba(120, 0, 200, 0.45)");
  glow.addColorStop(0.5, "rgba(60, 0, 100, 0.2)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(x, y + wobble, r * 2.5, 0, Math.PI * 2); ctx.fill();

  // Body
  const bodyGrad = ctx.createRadialGradient(x, y + wobble, r * 0.2, x, y + wobble, r);
  bodyGrad.addColorStop(0, "rgba(40, 0, 80, 0.95)");
  bodyGrad.addColorStop(0.7, "rgba(10, 0, 30, 0.9)");
  bodyGrad.addColorStop(1, "rgba(0, 0, 0, 0.7)");
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(x, y + wobble, r, r * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();

  // Glowing red eyes
  const eyeY = y + wobble - r * 0.2;
  const eyeOff = r * 0.3;
  for (let e = -1; e <= 1; e += 2) {
    // Eye glow
    const eyeGlow = ctx.createRadialGradient(x + e * eyeOff, eyeY, 0, x + e * eyeOff, eyeY, 10);
    eyeGlow.addColorStop(0, "rgba(255, 40, 0, 0.9)");
    eyeGlow.addColorStop(1, "rgba(255, 0, 0, 0)");
    ctx.fillStyle = eyeGlow;
    ctx.beginPath(); ctx.arc(x + e * eyeOff, eyeY, 10, 0, Math.PI * 2); ctx.fill();
    // Eye core
    ctx.fillStyle = `rgba(255, ${80 + Math.floor(80 * Math.sin(phase * 3))}, 0, 1)`;
    ctx.beginPath(); ctx.arc(x + e * eyeOff, eyeY, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.arc(x + e * eyeOff + 1, eyeY, 2, 0, Math.PI * 2); ctx.fill();
  }

  // Label
  ctx.font = "8px 'Press Start 2P', monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(200, 0, 255, 0.9)";
  ctx.fillText("THE COUSIN", x, y + wobble + r + 20);
  ctx.restore();
}

function drawSpeechBubble(ctx: CanvasRenderingContext2D, x: number, y: number, text: string) {
  ctx.font = "8px 'Press Start 2P', monospace";
  const t = text.length > 30 ? text.slice(0, 28) + "…" : text;
  const tw = ctx.measureText(t).width;
  const padX = 8, padY = 6, w = tw + padX * 2, h = 16 + padY;
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.strokeStyle = "rgba(0,0,0,0.85)"; ctx.lineWidth = 2;
  ctx.beginPath();
  const rx = x - w / 2, ry = y - h;
  ctx.moveTo(rx + 6, ry);
  ctx.lineTo(rx + w - 6, ry);
  ctx.quadraticCurveTo(rx + w, ry, rx + w, ry + 6);
  ctx.lineTo(rx + w, ry + h - 6);
  ctx.quadraticCurveTo(rx + w, ry + h, rx + w - 6, ry + h);
  ctx.lineTo(x + 4, ry + h);
  ctx.lineTo(x, ry + h + 6);
  ctx.lineTo(x - 4, ry + h);
  ctx.lineTo(rx + 6, ry + h);
  ctx.quadraticCurveTo(rx, ry + h, rx, ry + h - 6);
  ctx.lineTo(rx, ry + 6);
  ctx.quadraticCurveTo(rx, ry, rx + 6, ry);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#000"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(t, x, ry + h / 2);
  ctx.textBaseline = "alphabetic";
}

function drawReaction(ctx: CanvasRenderingContext2D, x: number, y: number, emoji: string) {
  ctx.font = "20px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.7)"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = "#000";
  ctx.fillText(emoji, x, y);
  ctx.textBaseline = "alphabetic";
}

function drawBackgroundPattern(ctx: CanvasRenderingContext2D, scene: ReturnType<typeof Object.values<typeof SCENES>>[number]) {
  const { width, height, bgPattern } = scene;
  if (!bgPattern) return;
  ctx.save();
  if (bgPattern === "grass") {
    ctx.fillStyle = "rgba(0,0,0,0.06)";
    for (let x = 0; x < width; x += 40) for (let y = 0; y < height; y += 40)
      ctx.fillRect(x + ((y / 40) % 2) * 20, y, 4, 4);
  } else if (bgPattern === "wood") {
    ctx.strokeStyle = "rgba(0,0,0,0.18)"; ctx.lineWidth = 1;
    for (let y = 0; y < height; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
  } else if (bgPattern === "tile") {
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    for (let x = 0; x < width; x += 60) for (let y = 0; y < height; y += 60) ctx.strokeRect(x, y, 60, 60);
  } else if (bgPattern === "carpet") {
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    for (let x = 0; x < width; x += 20) for (let y = 0; y < height; y += 20) ctx.fillRect(x, y, 10, 10);
  } else if (bgPattern === "ring") {
    ctx.strokeStyle = "#f4d020"; ctx.lineWidth = 6;
    ctx.strokeRect(80, 60, width - 160, height - 120);
    ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 2;
    for (let x = 0; x < width; x += 30) for (let y = 0; y < height; y += 30) ctx.strokeRect(x, y, 30, 30);
  } else if (bgPattern === "concrete") {
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    for (let i = 0; i < 200; i++) ctx.fillRect((i * 71) % width, (i * 53) % height, 3, 3);
  } else if (bgPattern === "club") {
    ctx.fillStyle = "rgba(255,80,180,0.06)";
    for (let x = 0; x < width; x += 60) for (let y = 0; y < height; y += 60) {
      ctx.fillStyle = `rgba(${(x * y) % 255}, 80, 180, 0.07)`;
      ctx.fillRect(x, y, 30, 30);
    }
  } else if (bgPattern === "water") {
    ctx.strokeStyle = "rgba(180,220,255,0.2)"; ctx.lineWidth = 2;
    for (let y = 50; y < height; y += 30) {
      ctx.beginPath();
      for (let x = 0; x < width; x += 20) {
        const yy = y + Math.sin((x + (Date.now() / 60)) / 30) * 4;
        if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
  } else if (bgPattern === "hell") {
    // Glowing cracks in the ground
    ctx.strokeStyle = "rgba(220, 40, 20, 0.35)"; ctx.lineWidth = 2;
    for (let i = 0; i < 15; i++) {
      const sx = (i * 137) % width;
      const sy = (i * 89) % height;
      ctx.beginPath(); ctx.moveTo(sx, sy);
      for (let j = 0; j < 4; j++) {
        ctx.lineTo(sx + (Math.random() - 0.5) * 80, sy + (Math.random() - 0.5) * 80);
      }
      ctx.stroke();
    }
    // Floating embers
    ctx.fillStyle = "rgba(255, 80, 20, 0.6)";
    const emberTime = Date.now() / 1000;
    for (let i = 0; i < 40; i++) {
      const ex = (i * 67) % width;
      const ey = (i * 43 + emberTime * 30) % height;
      const es = 1 + (i % 3);
      const glow = 0.3 + 0.7 * Math.sin(emberTime * 2 + i * 1.7);
      ctx.globalAlpha = glow;
      ctx.beginPath(); ctx.arc(ex, ey, es, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Distant fire glow at bottom
    const fireGrad = ctx.createLinearGradient(0, height * 0.7, 0, height);
    fireGrad.addColorStop(0, "rgba(180, 30, 10, 0)");
    fireGrad.addColorStop(1, "rgba(180, 30, 10, 0.25)");
    ctx.fillStyle = fireGrad;
    ctx.fillRect(0, height * 0.7, width, height * 0.3);
  }
  ctx.restore();
}

function drawRoads(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#3a3a3a";
  ctx.fillRect(0, 600, w, 120);
  ctx.fillRect(0, 1380, w, 120);
  ctx.fillRect(0, 1620, w, 60);
  ctx.fillRect(820, 0, 80, h);
  ctx.fillRect(2240, 0, 80, h);
  ctx.fillStyle = "#7a7a78";
  ctx.fillRect(0, 590, w, 12); ctx.fillRect(0, 720, w, 12);
  ctx.fillRect(0, 1370, w, 12); ctx.fillRect(0, 1500, w, 12);
  ctx.fillRect(810, 0, 12, h); ctx.fillRect(900, 0, 12, h);
  ctx.fillRect(2230, 0, 12, h); ctx.fillRect(2320, 0, 12, h);
  ctx.strokeStyle = "#f4d020"; ctx.lineWidth = 4; ctx.setLineDash([24, 18]);
  ctx.beginPath(); ctx.moveTo(0, 660); ctx.lineTo(w, 660); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 1440); ctx.lineTo(w, 1440); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(860, 0); ctx.lineTo(860, h); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(2280, 0); ctx.lineTo(2280, h); ctx.stroke();
  ctx.setLineDash([]);
}

function drawInteractable(ctx: CanvasRenderingContext2D, it: Interactable) {
  ctx.fillStyle = it.color ?? "rgba(255, 230, 120, 0.7)";
  ctx.fillRect(it.x, it.y, it.w, it.h);
  ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = 2;
  ctx.strokeRect(it.x, it.y, it.w, it.h);
  if (it.emoji) {
    ctx.font = `${Math.min(it.w, it.h) * 0.7}px serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(it.emoji, it.x + it.w / 2, it.y + it.h / 2);
    ctx.textBaseline = "alphabetic";
  }
}

function drawNpc(ctx: CanvasRenderingContext2D, n: NpcRuntime) {
  const { def, x, y, transformed, walkPhase } = n;
  if (transformed) { drawTransformed(ctx, n); return; }
  const moving = n.activity !== "chat" && !def.staticSpot;
  const bounce = moving ? Math.sin(walkPhase) * 2 : 0;
  const r = def.size;
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.95, r * 0.9, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = def.color;
  ctx.beginPath(); ctx.ellipse(x, y - bounce, r * 1.05, r, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.2 - bounce, r * 0.7, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
  const headR = Math.max(10, r * 0.55);
  ctx.fillStyle = lighten(def.color, 0.15);
  ctx.beginPath(); ctx.arc(x, y - r - headR * 0.2 - bounce, headR, 0, Math.PI * 2); ctx.fill();
  if (def.hairColor) {
    ctx.fillStyle = def.hairColor;
    ctx.beginPath(); ctx.arc(x, y - r - headR * 0.5 - bounce, headR * 0.95, Math.PI, Math.PI * 2); ctx.fill();
  }
  // Eyes (direction-aware for facing)
  let exo = 0, eyo = 0;
  if (n.facingDir === "left") exo = -2; if (n.facingDir === "right") exo = 2;
  if (n.facingDir === "up") eyo = -1;
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(x - headR * 0.3 + exo, y - r - headR * 0.2 - bounce + eyo, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + headR * 0.3 + exo, y - r - headR * 0.2 - bounce + eyo, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#000";
  ctx.beginPath(); ctx.arc(x - headR * 0.3 + exo * 1.4, y - r - headR * 0.2 - bounce + eyo, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + headR * 0.3 + exo * 1.4, y - r - headR * 0.2 - bounce + eyo, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#000"; ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (n.mood === "angry") ctx.arc(x, y - r - headR * 0.0 - bounce, headR * 0.25, 1.1 * Math.PI, 1.9 * Math.PI);
  else ctx.arc(x, y - r - headR * 0.05 - bounce, headR * 0.25, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();

  // Emotion overlay — eyebrows + expression based on current emotion
  const emo = n.emotion;
  const eyY = y - r - headR * 0.2 - bounce;
  if (emo === "angry" || emo === "scared") {
    // Furrowed brows
    ctx.strokeStyle = emo === "angry" ? "#c00" : "#888";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - headR * 0.5, eyY - 5); ctx.lineTo(x - headR * 0.1, eyY - 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + headR * 0.5, eyY - 5); ctx.lineTo(x + headR * 0.1, eyY - 2); ctx.stroke();
  } else if (emo === "happy") {
    // Arched brows up
    ctx.strokeStyle = "#885500";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x - headR * 0.3, eyY - 6, 4, 0.9 * Math.PI, 0.1 * Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + headR * 0.3, eyY - 6, 4, 0.9 * Math.PI, 0.1 * Math.PI); ctx.stroke();
  } else if (emo === "shocked") {
    // Wide-open eyes (already drawn as white circles — add extra ring)
    ctx.strokeStyle = "#ff0"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x - headR * 0.3 + exo, eyY + eyo, 4, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + headR * 0.3 + exo, eyY + eyo, 4, 0, Math.PI * 2); ctx.stroke();
  } else if (emo === "sad") {
    // Drooping brows
    ctx.strokeStyle = "#557";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - headR * 0.5, eyY - 2); ctx.lineTo(x - headR * 0.1, eyY - 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + headR * 0.5, eyY - 2); ctx.lineTo(x + headR * 0.1, eyY - 5); ctx.stroke();
  } else if (emo === "smug") {
    // One raised brow
    ctx.strokeStyle = "#885500"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - headR * 0.5, eyY - 5); ctx.lineTo(x - headR * 0.1, eyY - 3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + headR * 0.1, eyY - 1); ctx.lineTo(x + headR * 0.5, eyY - 5); ctx.stroke();
  } else if (emo === "horny") {
    // Heart eyes
    ctx.fillStyle = "#ff3366"; ctx.font = "9px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("♥", x - headR * 0.3 + exo, eyY + eyo);
    ctx.fillText("♥", x + headR * 0.3 + exo, eyY + eyo);
    ctx.textBaseline = "alphabetic";
  }
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "9px 'Press Start 2P', monospace"; ctx.textAlign = "center";
  ctx.fillText(def.name, x, y + r + 24);
}

function drawTransformed(ctx: CanvasRenderingContext2D, n: NpcRuntime) {
  const { def, x, y } = n;
  const r = Math.max(20, def.size * 0.8);
  switch (def.transformForm) {
    case "basketball":
      ctx.fillStyle = "#d97a30";
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#000"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y - r, r, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y + r, r, 1.2 * Math.PI, 1.8 * Math.PI); ctx.stroke(); break;
    case "vegetable-wheelchair":
      ctx.fillStyle = "#888"; ctx.fillRect(x - r, y - 10, r * 2, 14);
      ctx.fillStyle = "#222";
      ctx.beginPath(); ctx.arc(x - r, y + 12, 12, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + r, y + 12, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#e0772a";
      ctx.beginPath(); ctx.ellipse(x, y - 18, 14, 22, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#3a8030"; ctx.fillRect(x - 6, y - 50, 12, 16); break;
    case "cartier-watch":
      ctx.fillStyle = "#222"; ctx.fillRect(x - r * 0.9, y - 6, r * 1.8, 12);
      ctx.fillStyle = "#e8d070"; ctx.fillRect(x - r * 0.5, y - r * 0.5, r, r);
      ctx.fillStyle = "#fff"; ctx.fillRect(x - r * 0.4, y - r * 0.4, r * 0.8, r * 0.8);
      ctx.strokeStyle = "#000"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - r * 0.3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + r * 0.2, y); ctx.stroke();
      ctx.fillStyle = "#000"; ctx.font = "8px monospace"; ctx.textAlign = "center";
      ctx.fillText("CARTIER", x, y + r * 0.55); break;
    case "bulgarian-flag":
      ctx.fillStyle = "#fff"; ctx.fillRect(x - r, y - r * 0.6, r * 2, r * 0.4);
      ctx.fillStyle = "#0a8a3a"; ctx.fillRect(x - r, y - r * 0.2, r * 2, r * 0.4);
      ctx.fillStyle = "#cc1a1a"; ctx.fillRect(x - r, y + r * 0.2, r * 2, r * 0.4);
      ctx.strokeStyle = "#000"; ctx.lineWidth = 1.5; ctx.strokeRect(x - r, y - r * 0.6, r * 2, r * 1.2); break;
    case "israeli-flag":
      ctx.fillStyle = "#fff"; ctx.fillRect(x - r, y - r * 0.6, r * 2, r * 1.2);
      ctx.fillStyle = "#1a3a8a";
      ctx.fillRect(x - r, y - r * 0.55, r * 2, r * 0.18);
      ctx.fillRect(x - r, y + r * 0.4, r * 2, r * 0.18);
      ctx.strokeStyle = "#1a3a8a"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, y - r * 0.35); ctx.lineTo(x + r * 0.3, y + r * 0.18); ctx.lineTo(x - r * 0.3, y + r * 0.18); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y + r * 0.25); ctx.lineTo(x + r * 0.3, y - r * 0.28); ctx.lineTo(x - r * 0.3, y - r * 0.28); ctx.closePath(); ctx.stroke();
      ctx.strokeStyle = "#000"; ctx.lineWidth = 1.5; ctx.strokeRect(x - r, y - r * 0.6, r * 2, r * 1.2); break;
    case "bouboule":
      ctx.fillStyle = "#0a0a0a";
      ctx.beginPath(); ctx.arc(x, y, r * 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "10px 'Press Start 2P', monospace";
      ctx.textAlign = "center"; ctx.fillText("BOUBOULE", x, y + 4); break;
    case "trash-can":
      ctx.fillStyle = "#444"; ctx.fillRect(x - r * 0.7, y - r, r * 1.4, r * 1.8);
      ctx.fillStyle = "#666"; ctx.fillRect(x - r * 0.8, y - r * 1.1, r * 1.6, r * 0.2);
      ctx.fillStyle = "#222"; ctx.font = "9px monospace"; ctx.textAlign = "center";
      ctx.fillText("ANISH", x, y); break;
    case "rock":
      ctx.fillStyle = "#7a7a7a";
      ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#000"; ctx.lineWidth = 2; ctx.stroke(); break;
  }
}

function drawCar(ctx: CanvasRenderingContext2D, car: CarState) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle + Math.PI / 2);

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(0, 4, 24, 10, 0, 0, Math.PI * 2); ctx.fill();

  // Body - old Zastava/Yugo shape (boxy)
  ctx.fillStyle = "#c8a858"; // old beige/brown
  ctx.beginPath();
  ctx.roundRect(-20, -32, 40, 64, 4);
  ctx.fill();
  ctx.strokeStyle = "#6a5a30"; ctx.lineWidth = 2; ctx.stroke();

  // Roof / top
  ctx.fillStyle = "#a89040";
  ctx.beginPath();
  ctx.roundRect(-16, -24, 32, 30, 3);
  ctx.fill();

  // Windows
  ctx.fillStyle = "rgba(100,140,180,0.6)";
  ctx.fillRect(-14, -22, 12, 18);
  ctx.fillRect(2, -22, 12, 18);
  ctx.strokeStyle = "#4a3a20"; ctx.lineWidth = 1;
  ctx.strokeRect(-14, -22, 12, 18);
  ctx.strokeRect(2, -22, 12, 18);

  // Windshield
  ctx.fillStyle = "rgba(120,160,200,0.5)";
  ctx.fillRect(-14, -30, 28, 10);
  ctx.strokeRect(-14, -30, 28, 10);

  // Rear window
  ctx.fillStyle = "rgba(120,160,200,0.5)";
  ctx.fillRect(-14, 6, 28, 8);
  ctx.strokeRect(-14, 6, 28, 8);

  // Wheels
  ctx.fillStyle = "#222";
  ctx.beginPath(); ctx.ellipse(-18, -18, 5, 8, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(18, -18, 5, 8, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-18, 16, 5, 8, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(18, 16, 5, 8, 0.2, 0, Math.PI * 2); ctx.fill();

  // Headlights
  if (car.headlights) {
    ctx.fillStyle = "#ffee88";
    ctx.beginPath(); ctx.arc(-10, -30, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(10, -30, 4, 0, Math.PI * 2); ctx.fill();
    // Light beams
    ctx.fillStyle = "rgba(255,238,136,0.15)";
    ctx.beginPath();
    ctx.moveTo(-14, -34); ctx.lineTo(-30, -120); ctx.lineTo(30, -120); ctx.lineTo(14, -34);
    ctx.fill();
  } else {
    ctx.fillStyle = "#888";
    ctx.beginPath(); ctx.arc(-10, -30, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(10, -30, 3, 0, Math.PI * 2); ctx.fill();
  }

  // Taillights
  ctx.fillStyle = "#cc3333";
  ctx.beginPath(); ctx.arc(-12, 30, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(12, 30, 3, 0, Math.PI * 2); ctx.fill();

  // Trunk line
  ctx.strokeStyle = "#5a4a20"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-16, 10); ctx.lineTo(16, 10); ctx.stroke();

  // "ZASTAVA" badge
  ctx.fillStyle = "#4a3a20"; ctx.font = "bold 5px monospace"; ctx.textAlign = "center";
  ctx.fillText("ZASTAVA", 0, -6);

  ctx.restore();
}

function drawMartin(ctx: CanvasRenderingContext2D, m: MartinState, eating: boolean, hunger: number, chud: number) {
  const x = m.x, y = m.y;
  const bounce = m.walking ? Math.abs(Math.sin(m.walkPhase * 2)) * 3 : 0;

  // Scale body up with hunger (starving = bigger belly craving food) and chud
  const fatMult = 1 + (hunger / 100) * 0.35 + (chud / 100) * 0.25;
  const R = PLAYER_RADIUS * fatMult;
  // Chud tint — greenish at high chud
  const chudTint = chud > 50 ? Math.floor(((chud - 50) / 50) * 80) : 0;
  const bodyColor = `rgb(${200 - chudTint}, ${120 + chudTint * 0.3}, ${80 - chudTint * 0.5})`;
  const bellyColor = `rgb(${220 - chudTint}, ${160 + chudTint * 0.2}, ${112 - chudTint * 0.4})`;

  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath(); ctx.ellipse(x, y + R * 0.95, R * 1.15, R * 0.42, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = bodyColor;
  ctx.beginPath(); ctx.ellipse(x, y - bounce, R * 1.1, R, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = bellyColor;
  ctx.beginPath(); ctx.ellipse(x, y + R * 0.2 - bounce, R * 0.78, R * 0.65, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath(); ctx.arc(x, y + R * 0.32 - bounce, 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = bodyColor;
  const armSwing = m.walking ? Math.sin(m.walkPhase * 2) * 6 : 0;
  ctx.beginPath(); ctx.ellipse(x - R * 1.1, y - bounce + armSwing, 8 * fatMult, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + R * 1.1, y - bounce - armSwing, 8 * fatMult, 14, 0, 0, Math.PI * 2); ctx.fill();
  const headR = 18;
  ctx.fillStyle = "#f4c8a8";
  ctx.beginPath(); ctx.arc(x, y - R * 1.05 - bounce, headR, 0, Math.PI * 2); ctx.fill();
  // Sweat drops at high chud
  if (chud > 70) {
    ctx.fillStyle = `rgba(120, 200, 255, ${(chud - 70) / 30 * 0.8})`;
    ctx.beginPath(); ctx.ellipse(x + headR * 0.9, y - R * 1.15 - bounce, 3, 5, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x - headR * 0.8, y - R * 1.05 - bounce, 2, 4, -0.3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = "#3a2010";
  ctx.beginPath(); ctx.arc(x, y - R * 1.25 - bounce, headR * 0.95, Math.PI, Math.PI * 2); ctx.fill();
  const eyeOffsetY = m.dir === "up" ? -2 : 0;
  let eyeOffsetX = 0;
  if (m.dir === "left") eyeOffsetX = -2; if (m.dir === "right") eyeOffsetX = 2;
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(x - 6 + eyeOffsetX, y - R * 1.05 - bounce + eyeOffsetY, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 6 + eyeOffsetX, y - R * 1.05 - bounce + eyeOffsetY, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#000";
  ctx.beginPath(); ctx.arc(x - 6 + eyeOffsetX * 1.4, y - R * 1.05 - bounce + eyeOffsetY, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 6 + eyeOffsetX * 1.4, y - R * 1.05 - bounce + eyeOffsetY, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#7a2020";
  if (eating) {
    ctx.beginPath();
    ctx.ellipse(x, y - R * 0.95 - bounce + 4, 6, 4 + Math.abs(Math.sin(performance.now() / 80)) * 3, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = "#7a2020"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y - R * 0.95 - bounce, 5, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
  }
  ctx.fillStyle = "rgba(220,80,80,0.3)";
  ctx.beginPath(); ctx.arc(x - 9, y - R * 1.0 - bounce + 2, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 9, y - R * 1.0 - bounce + 2, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "9px 'Press Start 2P', monospace"; ctx.textAlign = "center";
  ctx.fillText("MARTIN", x, y + R + 22);
}

function drawBoss(ctx: CanvasRenderingContext2D, boss: { hp: number; hpMax: number; x: number; y: number; punchCd: number; barrageCd: number; walkPhase: number; dir: Direction }, def: NpcDef) {
  const { x, y, walkPhase, dir } = boss;
  const bounce = Math.sin(walkPhase) * 2;
  const r = def.size;
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.95, r * 0.9, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = def.color;
  ctx.beginPath(); ctx.ellipse(x, y - bounce, r * 1.05, r, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.2 - bounce, r * 0.7, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
  const headR = Math.max(10, r * 0.55);
  ctx.fillStyle = lighten(def.color, 0.15);
  ctx.beginPath(); ctx.arc(x, y - r - headR * 0.2 - bounce, headR, 0, Math.PI * 2); ctx.fill();
  if (def.hairColor) {
    ctx.fillStyle = def.hairColor;
    ctx.beginPath(); ctx.arc(x, y - r - headR * 0.5 - bounce, headR * 0.95, Math.PI, Math.PI * 2); ctx.fill();
  }
  let exo = 0, eyo = 0;
  if (dir === "left") exo = -2; if (dir === "right") exo = 2;
  if (dir === "up") eyo = -1;
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(x - headR * 0.3 + exo, y - r - headR * 0.2 - bounce + eyo, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + headR * 0.3 + exo, y - r - headR * 0.2 - bounce + eyo, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#000";
  ctx.beginPath(); ctx.arc(x - headR * 0.3 + exo * 1.4, y - r - headR * 0.2 - bounce + eyo, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + headR * 0.3 + exo * 1.4, y - r - headR * 0.2 - bounce + eyo, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#000"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x, y - r - headR * 0.0 - bounce, headR * 0.25, 1.1 * Math.PI, 1.9 * Math.PI); ctx.stroke();
  ctx.strokeStyle = "#c00"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x - headR * 0.5, y - r - headR * 0.2 - bounce - 5); ctx.lineTo(x - headR * 0.1, y - r - headR * 0.2 - bounce - 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + headR * 0.5, y - r - headR * 0.2 - bounce - 5); ctx.lineTo(x + headR * 0.1, y - r - headR * 0.2 - bounce - 2); ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "9px 'Press Start 2P', monospace"; ctx.textAlign = "center";
  ctx.fillText(def.name, x, y + r + 24);
  const barW = 140;
  const barH = 10;
  const hpPct = Math.max(0, boss.hp / boss.hpMax);
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(x - barW / 2, y - r - headR - 18 - bounce, barW, barH);
  ctx.fillStyle = "#e02020";
  ctx.fillRect(x - barW / 2, y - r - headR - 18 - bounce, barW * hpPct, barH);
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 1;
  ctx.strokeRect(x - barW / 2, y - r - headR - 18 - bounce, barW, barH);
  ctx.fillStyle = "#fff"; ctx.font = "7px 'Press Start 2P', monospace"; ctx.textAlign = "center";
  ctx.fillText(`${Math.ceil(boss.hp)}/${boss.hpMax}`, x, y - r - headR - 22 - bounce);
}

function lighten(hex: string, amt: number) {
  const c = hex.replace("#", "");
  const r = Math.min(255, Math.round(parseInt(c.slice(0, 2), 16) + 255 * amt));
  const g = Math.min(255, Math.round(parseInt(c.slice(2, 4), 16) + 255 * amt));
  const b = Math.min(255, Math.round(parseInt(c.slice(4, 6), 16) + 255 * amt));
  return `rgb(${r},${g},${b})`;
}

function StartScreen({ hasSave, onContinue, onNewGame }: { hasSave: boolean; onContinue: () => void; onNewGame: () => void }) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#2a1810] to-[#0a0500] p-8 gap-6 text-center">
      <h1 className="pixel-text text-3xl md:text-5xl text-primary drop-shadow-[0_0_10px_rgba(255,180,40,0.5)]">MARTIN</h1>
      <h2 className="pixel-text text-sm md:text-lg text-accent">Chud Chronicles</h2>
      <p className="pixel-text text-[10px] md:text-xs max-w-2xl text-foreground/85 leading-relaxed">
        Live the cringe life of Martin. Wake up. Eat moldy shit. Tutor Caillo. Fight McCrackeylla.
        Avoid Cousin in the basement. Visit Mom. Fish. Max chud slows you down — but won't kill you.
      </p>
      <div className="pixel-text text-[9px] md:text-[10px] text-muted-foreground">
        Move: WASD/Arrows • Interact: E/Space • Phone: P • Mute: M
      </div>
      {hasSave ? (
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <button onClick={onContinue} className="pixel-text bg-primary text-primary-foreground px-6 py-3 rounded hover:brightness-110 transition">
            Continue
          </button>
          <button onClick={onNewGame} className="pixel-text bg-secondary text-secondary-foreground px-6 py-3 rounded hover:brightness-110 transition">
            New Game
          </button>
        </div>
      ) : (
        <button onClick={onNewGame} className="pixel-text bg-primary text-primary-foreground px-6 py-3 rounded mt-2 hover:brightness-110 transition">
          Wake Up Martin
        </button>
      )}
      <div className="pixel-text text-[8px] text-muted-foreground mt-4 max-w-md">
        Tip: your progress auto-saves. Close the tab and come back anytime.
      </div>
    </div>
  );
}

function FightOverlay({ state, onAttack, onBlock, onClose }: {
  state: FightState; onAttack: () => void; onBlock: () => void; onClose: () => void;
}) {
  const opp = FIGHTERS.find((x) => x.id === state.opponentId)!;
  const oppSize = 80 + (opp.size - 50);
  return (
    <div className="absolute inset-0 z-40 bg-black/90 flex items-center justify-center p-4 fade-in">
      <div className="bg-card border-2 border-accent rounded-lg p-5 max-w-3xl w-full pixel-text">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base text-accent">FIGHT CLUB</h3>
          <span className="text-[9px] text-muted-foreground">vs {opp.name}</span>
        </div>
        <div className="relative h-56 bg-gradient-to-b from-amber-900/80 via-rose-900/40 to-stone-900/80 border-2 border-yellow-500 rounded mb-4 overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-14 bg-black/70 flex items-end justify-around px-2">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="w-3 h-6 bg-black rounded-t-full crowd-cheer" style={{ animationDelay: `${i * 0.07}s` }} />
            ))}
          </div>
          <div className="absolute left-0 right-0 top-14 h-1 bg-yellow-300/90" />
          <div className="absolute left-0 right-0 bottom-2 h-1 bg-yellow-300/90" />

          <div key={`m-${state.martinAnimKey}`} className={`absolute bottom-3 left-12 w-28 h-28 fighter-anim-${state.martinAnim}`}>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-16 rounded-full bg-amber-700 border-2 border-amber-900" />
            <div className="absolute bottom-7 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-900" />
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-amber-200 border-2 border-amber-900">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-9 h-3 rounded-t bg-stone-800" />
              <div className="absolute top-4 left-2.5 w-1.5 h-1.5 bg-black rounded-full" />
              <div className="absolute top-4 right-2.5 w-1.5 h-1.5 bg-black rounded-full" />
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-3 h-1.5 bg-rose-900 rounded-full" />
            </div>
          </div>

          <div key={`o-${state.oppAnimKey}`}
               className={`absolute bottom-3 right-12 fighter-anim-${state.oppAnim} is-opp`}
               style={{ width: oppSize, height: oppSize }}>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-12 rounded-full border-2"
                 style={{ background: opp.color, borderColor: "rgba(0,0,0,0.6)" }} />
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full border-2"
                 style={{ background: opp.color, borderColor: "rgba(0,0,0,0.6)", filter: "brightness(1.2)" }}>
              <div className="absolute top-3 left-2 w-1.5 h-1.5 bg-black rounded-full" />
              <div className="absolute top-3 right-2 w-1.5 h-1.5 bg-black rounded-full" />
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-3 h-1 bg-black rounded-full" />
            </div>
          </div>

          {state.kapowText && (
            <div key={state.kapowKey} className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="kapow-anim text-3xl md:text-5xl pixel-text font-black text-yellow-400 drop-shadow-[0_4px_0_rgba(0,0,0,0.85)]">
                {state.kapowText}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <div className="text-[10px] mb-1">Martin</div>
            <div className="h-4 bg-secondary rounded overflow-hidden border border-border">
              <div className="h-full bg-accent transition-all duration-300" style={{ width: `${(state.martinHp / 100) * 100}%` }} />
            </div>
            <div className="text-[8px] mt-1">{state.martinHp} / 100</div>
          </div>
          <div>
            <div className="text-[10px] mb-1">{opp.name}</div>
            <div className="h-4 bg-secondary rounded overflow-hidden border border-border">
              <div className="h-full bg-destructive transition-all duration-300" style={{ width: `${(state.opponentHp / state.opponentMaxHp) * 100}%` }} />
            </div>
            <div className="text-[8px] mt-1">{state.opponentHp} / {state.opponentMaxHp}</div>
          </div>
        </div>
        <div className="bg-background/60 border border-border rounded p-3 h-24 overflow-y-auto mb-4 text-[9px] leading-relaxed space-y-1">
          {state.log.map((l, i) => <div key={i}>› {l}</div>)}
        </div>
        {!state.ended ? (
          <div className="flex gap-3">
            <button onClick={onAttack} disabled={state.turn !== "player"}
                    className="flex-1 bg-accent text-accent-foreground py-3 rounded text-[10px] hover:brightness-110 disabled:opacity-50">
              BELLY FLOP
            </button>
            <button onClick={onBlock} disabled={state.turn !== "player"}
                    className="flex-1 bg-secondary text-secondary-foreground py-3 rounded text-[10px] hover:brightness-110 disabled:opacity-50">
              BLOCK
            </button>
          </div>
        ) : (
          <button onClick={onClose} className="w-full bg-primary text-primary-foreground py-3 rounded text-[10px] hover:brightness-110">
            {state.victory ? "Walk away rich" : "Limp away"}
          </button>
        )}
      </div>
    </div>
  );
}
