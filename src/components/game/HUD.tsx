interface HUDProps {
  money: number;
  hunger: number;
  chud: number;
  day: number;
  timeStr: string;
  hp: number;
  hpMax: number;
  sceneName: string;
  muted: boolean;
  onTogglePhone: () => void;
  onToggleMute: () => void;
  questsDone: number;
  questsTotal: number;
  dailyEvent: string | null;
  tutorialStep: number;
  mainQuestStep: number;
  hasHummus: boolean;
  hasButtplug: boolean;
}

const MAIN_QUEST_HINTS: Record<number, string> = {
  1: "Talk to David about the buttplug",
  2: "Grab hummus in your basement",
  3: "Bring hummus to David",
  4: "Ask Wolf about the buttplug",
  5: "Defeat Kai at the Fight Club",
  6: "Collect the buttplug from Wolf",
  7: "Return the buttplug to MoGgayla",
};

export default function HUD(props: HUDProps) {
  const {
    money, hunger, chud, day, timeStr, hp, hpMax, sceneName, muted,
    onTogglePhone, onToggleMute, questsDone, questsTotal, dailyEvent,
    tutorialStep, mainQuestStep, hasHummus, hasButtplug,
  } = props;
  const chudColor = chud < 40 ? "bg-emerald-500" : chud < 70 ? "bg-yellow-400" : chud < 90 ? "bg-orange-500" : "bg-destructive";
  const hungerColor = hunger < 40 ? "bg-emerald-500" : hunger < 70 ? "bg-yellow-400" : "bg-destructive";
  const hpColor = "bg-rose-400";
  const chudCaption = chud >= 100 ? "MAX CHUD — CRAWLING" : chud >= 90 ? "DANGER" : "";

  const tutorialMessages: Record<number, string> = {
    1: "🧊 Open the fridge (ice block)",
    2: "👩 Talk to your mom upstairs",
    3: "🚽 Take a shit in the toilet",
    4: "🚪 Go outside & talk to someone (E)",
  };

  let mainQuestHint = "";
  if (mainQuestStep >= 1 && mainQuestStep < 8) {
    mainQuestHint = MAIN_QUEST_HINTS[mainQuestStep] ?? "";
    if (mainQuestStep === 3 && hasHummus) mainQuestHint = "Bring hummus to David";
    if (mainQuestStep === 7 && hasButtplug) mainQuestHint = "Give the buttplug to MoGgayla at the boutique";
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-3 pixel-text text-[10px]">
        <div className="bg-black/70 border border-primary/40 rounded px-3 py-2 flex gap-3">
          <span className="text-primary">Day {day}</span>
          <span className="text-foreground">{timeStr}</span>
          <span className="text-muted-foreground">{sceneName}</span>
        </div>
        <div className="flex gap-2 flex-wrap justify-end max-w-[60%]">
          {tutorialStep > 0 && tutorialStep < 5 && (
            <div className="bg-purple-900/80 border border-purple-500/60 rounded px-3 py-2 animate-pulse">
              <span className="text-purple-200 text-[8px] block">📚 Tutorial: {tutorialMessages[tutorialStep]}</span>
            </div>
          )}
          {mainQuestHint && (
            <div className="bg-pink-900/80 border border-pink-500/60 rounded px-3 py-2 animate-pulse">
              <span className="text-pink-200 text-[8px] block">📜 Main Quest: {mainQuestHint}</span>
            </div>
          )}
          {dailyEvent && (
            <div className="bg-amber-900/80 border border-amber-500/60 rounded px-2 py-2 max-w-[140px]">
              <span className="text-amber-200 text-[7px] truncate block">📰 {dailyEvent.replace(/-/g," ").toUpperCase()}</span>
            </div>
          )}
          <div className="bg-black/70 border border-primary/40 rounded px-3 py-2">
            <span className="text-primary">$ {money}</span>
          </div>
          <div className="bg-black/70 border border-accent/40 rounded px-3 py-2">
            <span className="text-accent">📋 {questsDone}/{questsTotal}</span>
          </div>
        </div>
      </div>

      <div className="absolute top-20 left-3 flex flex-col gap-3 w-44">
        <Bar label="Hunger" value={hunger} max={100} color={hungerColor} caption={hunger >= 100 ? "STARVING" : ""} />
        <Bar label="Chud" value={chud} max={100} color={chudColor} caption={chudCaption} />
        <Bar label="HP" value={hp} max={hpMax} color={hpColor} caption={hp <= 25 ? "WOUNDED" : ""} />
      </div>

      <div className="absolute bottom-3 right-3 flex flex-col gap-2 pointer-events-auto">
        <button onClick={onTogglePhone} className="pixel-text text-[8px] bg-primary/90 text-primary-foreground border border-primary rounded px-3 py-2 hover:brightness-110">
          📱 [P] Phone
        </button>
        <button onClick={onToggleMute} className="pixel-text text-[8px] bg-secondary text-secondary-foreground border border-border rounded px-3 py-2 hover:brightness-110">
          {muted ? "🔇 [M] Unmute" : "🔊 [M] Mute"}
        </button>
      </div>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 border border-border rounded px-4 py-2 pixel-text text-[8px] md:text-[9px] text-muted-foreground text-center">
        WASD/ARROWS move • E/SPACE interact • G garage door • P phone • M mute
      </div>
    </div>
  );
}

function Bar({ label, value, max, color, caption }: { label: string; value: number; max: number; color: string; caption?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="flex items-center justify-between pixel-text text-[9px] mb-1">
        <span className="text-foreground">{label}</span>
        <span className="text-muted-foreground">{Math.round(value)}/{max}</span>
      </div>
      <div className="h-3 bg-black/60 border border-border rounded overflow-hidden">
        <div className={`h-full ${color} transition-all duration-200`} style={{ width: `${pct}%` }} />
      </div>
      {caption && <div className="pixel-text text-[8px] text-destructive mt-1 animate-pulse">{caption}</div>}
    </div>
  );
}
