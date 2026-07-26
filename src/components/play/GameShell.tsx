import { ReactNode } from "react";

export function GameShell({
  title,
  progress,
  children,
}: {
  title: string;
  progress: { current: number; total: number };
  children: ReactNode;
}) {
  const pct = Math.round((progress.current / Math.max(progress.total, 1)) * 100);
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-3 gap-3">
        <h2 className="font-bold text-lg text-foreground truncate">{title}</h2>
        <span className="text-sm text-muted-foreground shrink-0">
          {progress.current} / {progress.total}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      {children}
    </div>
  );
}

export function GameChoice({
  label,
  onClick,
  state = "idle",
  emoji,
}: {
  label: string;
  onClick?: () => void;
  state?: "idle" | "correct" | "wrong" | "disabled";
  emoji?: string;
}) {
  const styles: Record<string, string> = {
    idle: "bg-card hover:bg-primary/10 hover:border-primary border-border text-foreground",
    correct: "bg-green-500/20 border-green-500 text-green-700 dark:text-green-300",
    wrong: "bg-red-500/20 border-red-500 text-red-700 dark:text-red-300",
    disabled: "bg-muted border-border text-muted-foreground cursor-not-allowed",
  };
  return (
    <button
      onClick={onClick}
      disabled={state === "disabled"}
      className={`w-full text-right p-4 rounded-2xl border-2 font-medium text-base transition-all active:scale-[0.98] ${styles[state]}`}
    >
      {emoji && <span className="ml-2 text-xl">{emoji}</span>}
      {label}
    </button>
  );
}
