interface DialogChoice {
  label: string;
  onSelect: () => void;
  danger?: boolean;
  primary?: boolean;
}

interface DialogPanelProps {
  title: string;
  body: string;
  emoji?: string;
  choices: DialogChoice[];
}

export default function DialogPanel({ title, body, emoji, choices }: DialogPanelProps) {
  return (
    <div className="absolute inset-0 z-30 flex items-end md:items-center justify-center pointer-events-auto">
      <div className="absolute inset-0 bg-black/55" />
      <div className="relative bg-card border-2 border-primary rounded-lg p-5 max-w-xl w-[92%] m-4 pixel-text fade-in shadow-[0_0_30px_rgba(255,180,40,0.25)]">
        <div className="flex items-center gap-3 mb-3">
          {emoji && <span className="text-3xl">{emoji}</span>}
          <h3 className="text-sm md:text-base text-primary">{title}</h3>
        </div>
        <p className="text-[10px] md:text-[11px] leading-relaxed text-foreground whitespace-pre-line mb-4">
          {body}
        </p>
        <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto">
          {choices.map((c, i) => (
            <button
              key={i}
              onClick={c.onSelect}
              className={`text-left text-[10px] md:text-[11px] px-3 py-2 rounded border transition hover:brightness-110 ${
                c.primary
                  ? "bg-primary text-primary-foreground border-primary"
                  : c.danger
                  ? "bg-destructive text-destructive-foreground border-destructive"
                  : "bg-secondary text-secondary-foreground border-border"
              }`}
            >
              › {c.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
