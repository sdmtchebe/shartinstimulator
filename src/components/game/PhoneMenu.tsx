import { useState } from "react";
import type { GameStats, NpcRuntime, Quest, SceneId } from "@/game/types";
import { SCENES, CALL_SCRIPTS } from "@/game/world";
import { sound } from "@/game/sound";

interface PhoneMenuProps {
  open: boolean;
  onClose: () => void;
  stats: GameStats;
  npcs: NpcRuntime[];
  quests: Quest[];
  martinScene: SceneId;
  martinPos: { x: number; y: number };
  muted: boolean;
  onToggleMute: () => void;
  onCallNpc: (npcId: string) => void;
}

const TABS = [
  { id: "stats", label: "STATS", emoji: "📊" },
  { id: "contacts", label: "CALL", emoji: "📞" },
  { id: "friends", label: "FRIENDS", emoji: "👥" },
  { id: "quests", label: "QUESTS", emoji: "📋" },
  { id: "map", label: "MAP", emoji: "🗺️" },
] as const;

type TabId = typeof TABS[number]["id"];

const ACTIVITY_EMOJI: Record<string, string> = {
  wander: "🚶", static: "🪑", soccer: "⚽", watchTV: "📺",
  guard: "🛡️", chat: "💬", stare: "👀", dance: "💃",
};

export default function PhoneMenu(props: PhoneMenuProps) {
  const { open, onClose, stats, npcs, quests, martinScene, martinPos, muted, onToggleMute, onCallNpc } = props;
  const [tab, setTab] = useState<TabId>("stats");

  if (!open) return null;

  const switchTab = (id: TabId) => { sound.play("phoneTab"); setTab(id); };

  return (
    <div className="absolute inset-0 z-50 bg-black/85 flex items-center justify-center p-4 fade-in">
      <div className="phone-shake bg-zinc-900 border-4 border-zinc-700 rounded-3xl p-3 max-w-[360px] w-full shadow-[0_0_40px_rgba(255,180,40,0.35)]">
        <div className="flex justify-center mb-2">
          <div className="w-24 h-2 bg-black rounded-b-2xl" />
        </div>
        <div className="px-3 pt-1 pb-2 flex justify-between items-center pixel-text text-[8px] text-foreground/85">
          <span>Day {stats.day}</span>
          <span>5G CHUD</span>
          <span>3% 🔋</span>
        </div>
        <div className="bg-black border border-primary/40 rounded-xl p-3 min-h-[420px] flex flex-col">
          <div className="pixel-text text-[10px] text-primary mb-3 text-center border-b border-primary/30 pb-2">
            Martin's Phone (cracked screen)
          </div>
          <div className="flex-1 overflow-y-auto pixel-text">
            {tab === "stats"    && <StatsTab stats={stats} />}
            {tab === "contacts" && <ContactsTab npcs={npcs} stats={stats} onCallNpc={(id) => { onCallNpc(id); onClose(); }} />}
            {tab === "friends"  && <FriendsTab npcs={npcs} />}
            {tab === "quests"   && <QuestsTab quests={quests} done={stats.questsCompleted} />}
            {tab === "map"      && <MapTab npcs={npcs} martinScene={martinScene} martinPos={martinPos} />}
          </div>
          <div className="flex border-t border-primary/30 pt-2 mt-2 gap-1 flex-wrap">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => switchTab(t.id)}
                className={`flex-1 pixel-text text-[7px] py-2 rounded transition ${
                  tab === t.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:brightness-110"
                }`}
              >
                <div className="text-sm">{t.emoji}</div>
                <div>{t.label}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={onToggleMute} className="flex-1 pixel-text text-[9px] py-2 bg-secondary rounded hover:brightness-110">
            {muted ? "🔇 Unmute" : "🔊 Mute"}
          </button>
          <button onClick={onClose} className="flex-1 pixel-text text-[9px] py-2 bg-primary text-primary-foreground rounded hover:brightness-110">
            [P] Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── CONTACTS / CALL TAB ────────────────────────────────────────────────────

interface CallState {
  npcId: string;
  npcName: string;
  exchangeIdx: number;
  martinLine: string | null;
  npcLine: string | null;
  phase: "greeting" | "martin" | "npc" | "done";
}

function ContactsTab({ npcs, stats, onCallNpc }: { npcs: NpcRuntime[]; stats: GameStats; onCallNpc: (id: string) => void }) {
  const [call, setCall] = useState<CallState | null>(null);

  const startCall = (npc: NpcRuntime) => {
    const script = CALL_SCRIPTS[npc.def.id];
    if (!script) return;
    sound.play("phoneOpen");
    setCall({
      npcId: npc.def.id,
      npcName: npc.def.name,
      exchangeIdx: 0,
      martinLine: null,
      npcLine: script.greeting,
      phase: "greeting",
    });
    // trigger call-everyone quest tracking
    onCallNpc(npc.def.id);
  };

  const advance = () => {
    if (!call) return;
    const script = CALL_SCRIPTS[call.npcId];
    if (!script) return;

    if (call.phase === "greeting" || call.phase === "npc") {
      // Show Martin's next line
      const ex = script.exchanges[call.exchangeIdx];
      if (!ex) { setCall({ ...call, phase: "done", martinLine: null, npcLine: null }); return; }
      sound.play("select");
      setCall({ ...call, phase: "martin", martinLine: ex[0], npcLine: null });
    } else if (call.phase === "martin") {
      // Show NPC response
      const ex = script.exchanges[call.exchangeIdx];
      sound.play("phoneTab");
      setCall({ ...call, phase: "npc", martinLine: null, npcLine: ex[1], exchangeIdx: call.exchangeIdx + 1 });
    }
  };

  const hangUp = () => { sound.play("door"); setCall(null); };

  if (call) {
    const isDone = call.phase === "done";
    return (
      <div className="flex flex-col gap-3 text-[9px]">
        <div className="flex items-center gap-2 border-b border-primary/30 pb-2">
          <span className="text-xl">📞</span>
          <div>
            <div className="text-primary text-[10px]">{call.npcName}</div>
            <div className="text-muted-foreground text-[8px] animate-pulse">{isDone ? "Call ended" : "● Connected"}</div>
          </div>
        </div>

        <div className="min-h-[160px] flex flex-col gap-2">
          {call.npcLine && (
            <div className="flex gap-2 items-start">
              <div className="shrink-0 w-6 h-6 rounded-full bg-primary/30 flex items-center justify-center text-[10px]">👤</div>
              <div className="bg-secondary rounded-lg px-2 py-1.5 text-foreground max-w-[80%]">{call.npcLine}</div>
            </div>
          )}
          {call.martinLine && (
            <div className="flex gap-2 items-start flex-row-reverse">
              <div className="shrink-0 w-6 h-6 rounded-full bg-amber-700/60 flex items-center justify-center text-[10px]">🤵</div>
              <div className="bg-amber-900/60 rounded-lg px-2 py-1.5 text-amber-100 max-w-[80%]">{call.martinLine}</div>
            </div>
          )}
          {isDone && <div className="text-center text-muted-foreground mt-4">📵 Call ended</div>}
        </div>

        <div className="flex gap-2 mt-auto">
          {!isDone && (
            <button onClick={advance} className="flex-1 bg-primary text-primary-foreground py-2 rounded pixel-text text-[8px] hover:brightness-110">
              {call.phase === "greeting" || call.phase === "npc" ? "› Reply" : "› Send"}
            </button>
          )}
          <button onClick={hangUp} className="flex-1 bg-destructive text-destructive-foreground py-2 rounded pixel-text text-[8px] hover:brightness-110">
            📵 Hang up
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1 text-[9px]">
      <div className="text-primary text-[10px] mb-2">Contacts — {stats.calledNpcs.length} called</div>
      {npcs.map((n) => {
        const hasScript = !!CALL_SCRIPTS[n.def.id];
        const called = stats.calledNpcs.includes(n.def.id);
        if (!hasScript) return null;
        return (
          <div key={n.def.id} className="flex items-center justify-between border-b border-border/40 pb-1">
            <div>
              <span className={called ? "text-emerald-400" : "text-foreground"}>{n.def.name}</span>
              {called && <span className="text-[7px] text-muted-foreground ml-1">✓ called</span>}
            </div>
            <button
              onClick={() => startCall(n)}
              className="bg-emerald-700 text-white px-2 py-1 rounded text-[7px] hover:brightness-110 pixel-text"
            >
              📞 Call
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── OTHER TABS (unchanged) ─────────────────────────────────────────────────

function StatsTab({ stats }: { stats: GameStats }) {
  const rows: [string, string | number][] = [
    ["Day", stats.day],
    ["Money", `$${stats.money}`],
    ["Total Earned", `$${stats.totalMoneyEarned}`],
    ["Fights Won", stats.fightsWon],
    ["Fights Lost", stats.fightsLost],
    ["Foods Eaten", stats.foodsEaten],
    ["Transformed", stats.npcsTransformed],
    ["Quests Done", `${stats.questsCompleted.length}`],
    ["Scenes Visited", stats.scenesVisited.length],
    ["Secrets Found", stats.secretsFound.length],
    ["Hunger", `${Math.round(stats.hunger)}%`],
    ["Chud", `${Math.round(stats.chud)}%`],
    ["Shits Today", stats.shitsToday],
    ["Tutorat Streak", stats.tutoratStreak],
  ];
  return (
    <div className="space-y-1.5 text-[9px]">
      {stats.dailyEvent && (
        <div className="bg-amber-900/40 border border-amber-500/50 rounded px-2 py-1.5 mb-2 text-amber-200 text-[8px]">
          📰 Today: {stats.dailyEvent.replace(/-/g, " ").toUpperCase()}
        </div>
      )}
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between border-b border-border/50 pb-1">
          <span className="text-muted-foreground">{k}</span>
          <span className="text-foreground">{v}</span>
        </div>
      ))}
    </div>
  );
}

function FriendsTab({ npcs }: { npcs: NpcRuntime[] }) {
  return (
    <div className="space-y-1.5 text-[9px]">
      {npcs.map((n) => {
        const sceneName = SCENES[n.scene]?.name ?? n.scene;
        const status = n.transformed
          ? `as ${n.def.transformForm}`
          : `${ACTIVITY_EMOJI[n.activity] || "🚶"} ${n.activity}`;
        const EMOTION_EMOJI: Record<string, string> = {
          happy: "😄", angry: "😠", sad: "😢", shocked: "😱",
          scared: "😨", smug: "😏", horny: "😍", neutral: "😐",
        };
        const friendColor = n.friendship >= 70 ? "text-emerald-400" : n.friendship >= 40 ? "text-yellow-400" : "text-red-400";
        const friendBar = Math.round(n.friendship / 10);
        return (
          <div key={n.def.id} className="border-b border-border/50 pb-1">
            <div className="flex justify-between items-center">
              <span className="text-foreground">{n.def.name} {EMOTION_EMOJI[n.emotion] ?? ""}</span>
              <span className="text-[8px] text-primary">{status}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="text-muted-foreground text-[8px]">@ {sceneName}</div>
              <span className={`text-[7px] ${friendColor}`}>{"♥".repeat(friendBar)}{"♡".repeat(10 - friendBar)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function QuestsTab({ quests, done }: { quests: Quest[]; done: string[] }) {
  const hard = ["win-3-fights","transform-all","survive-night","broke","call-everyone","fish-wolf","full-hunger","toilet-5","fight-all","chud-80","tutorat-3days"];
  const regular = quests.filter(q => !hard.includes(q.id));
  const hardQuests = quests.filter(q => hard.includes(q.id));
  return (
    <div className="space-y-1 text-[9px]">
      <div className="text-primary text-[10px] mb-1">Regular Quests</div>
      {regular.map((q) => {
        const isDone = done.includes(q.id);
        return (
          <div key={q.id} className={`flex items-center gap-2 border-b border-border/50 pb-1 ${isDone ? "text-emerald-400" : "text-foreground"}`}>
            <span>{isDone ? "[X]" : "[ ]"}</span>
            <span className={isDone ? "line-through" : ""}>{q.label}</span>
          </div>
        );
      })}
      <div className="text-destructive text-[10px] mt-3 mb-1">💀 Hard Quests (+$50)</div>
      {hardQuests.map((q) => {
        const isDone = done.includes(q.id);
        return (
          <div key={q.id} className={`flex items-center gap-2 border-b border-border/40 pb-1 ${isDone ? "text-emerald-400" : "text-orange-300"}`}>
            <span>{isDone ? "[X]" : "[ ]"}</span>
            <span className={isDone ? "line-through" : ""}>{q.label}</span>
          </div>
        );
      })}
      <div className="pt-2 text-muted-foreground text-[8px] text-center">
        Regular: +$20 • Hard: +$50
      </div>
    </div>
  );
}

function MapTab({ npcs, martinScene, martinPos }: { npcs: NpcRuntime[]; martinScene: SceneId; martinPos: { x: number; y: number } }) {
  const outside = SCENES.outside;
  if (!outside) return null;
  const W = 280, H = 200;
  const sx = W / outside.width;
  const sy = H / outside.height;
  return (
    <div>
      <div className="text-primary text-[10px] mb-2">Town Map</div>
      <div className="relative bg-emerald-900/50 border border-emerald-700 rounded" style={{ width: W, height: H }}>
        {outside.walls.filter((w) => w.label).map((wall, i) => (
          <div
            key={i}
            className="absolute bg-amber-700/70 border border-amber-900"
            style={{ left: wall.x * sx, top: wall.y * sy, width: Math.max(2, wall.w * sx), height: Math.max(2, wall.h * sy) }}
            title={wall.label}
          />
        ))}
        {npcs.filter((n) => n.scene === "outside" && !n.transformed).map((n) => (
          <div key={n.def.id} className="absolute w-1.5 h-1.5 rounded-full bg-blue-300"
            style={{ left: n.x * sx - 3, top: n.y * sy - 3 }} title={n.def.name} />
        ))}
        {martinScene === "outside" && (
          <div className="absolute w-2 h-2 rounded-full bg-red-500 border border-white animate-pulse"
            style={{ left: martinPos.x * sx - 4, top: martinPos.y * sy - 4 }} />
        )}
        {martinScene !== "outside" && (
          <div className="absolute inset-x-0 bottom-2 text-center text-[8px] pixel-text text-yellow-400">
            Martin in: {SCENES[martinScene]?.name ?? martinScene}
          </div>
        )}
      </div>
      <div className="mt-2 text-muted-foreground text-[8px]">Red = Martin. Blue = NPCs. Brown = buildings.</div>
    </div>
  );
}
