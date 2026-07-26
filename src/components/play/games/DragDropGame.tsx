import { useMemo, useState } from "react";
import { GameShell } from "../GameShell";
import type { DragDropContent, GameResult } from "@/lib/gameTypes";
import { computeStars } from "@/lib/gameTypes";

interface Item { id: string; label: string; correctBucket: number; }

export function DragDropGame({
  title,
  content,
  onComplete,
}: {
  title: string;
  content: DragDropContent;
  onComplete: (r: GameResult) => void;
}) {
  const items = useMemo<Item[]>(() => {
    const arr: Item[] = [];
    content.buckets.forEach((b, bi) => {
      b.items.forEach((label, ii) => arr.push({ id: `${bi}-${ii}`, label, correctBucket: bi }));
    });
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [content]);

  const [placed, setPlaced] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [start] = useState(Date.now());

  const place = (bucketIdx: number) => {
    if (!selected) return;
    setPlaced((p) => ({ ...p, [selected]: bucketIdx }));
    setSelected(null);
  };

  const remaining = items.filter((it) => !(it.id in placed));

  const finish = () => {
    const correct = items.filter((it) => placed[it.id] === it.correctBucket).length;
    const score = Math.round((correct / items.length) * 100);
    onComplete({
      score,
      stars: computeStars(score),
      timeSeconds: Math.round((Date.now() - start) / 1000),
      correct,
      total: items.length,
    });
  };

  return (
    <GameShell title={title} progress={{ current: items.length - remaining.length, total: items.length }}>
      <p className="text-center text-muted-foreground text-sm mb-4">اختر عنصراً ثم ضعه في السلة المناسبة</p>

      {remaining.length > 0 && (
        <div className="bg-muted/50 rounded-2xl p-4 mb-5 flex flex-wrap gap-2 min-h-[80px]">
          {remaining.map((it) => (
            <button
              key={it.id}
              onClick={() => setSelected(it.id)}
              className={`px-4 py-2 rounded-xl border-2 font-medium transition-all ${
                selected === it.id
                  ? "bg-primary text-primary-foreground border-primary scale-105"
                  : "bg-card border-border hover:border-primary"
              }`}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}

      <div className={`grid grid-cols-1 sm:grid-cols-${Math.min(content.buckets.length, 3)} gap-3`}>
        {content.buckets.map((b, bi) => {
          const inside = items.filter((it) => placed[it.id] === bi);
          return (
            <button
              key={bi}
              onClick={() => place(bi)}
              disabled={!selected}
              className={`min-h-[140px] rounded-2xl border-2 border-dashed p-3 text-right transition-all ${
                selected ? "border-accent bg-accent/5 hover:bg-accent/10" : "border-border bg-card"
              }`}
            >
              <div className="font-bold mb-2 text-foreground">{b.label}</div>
              <div className="flex flex-wrap gap-1.5">
                {inside.map((it) => (
                  <span
                    key={it.id}
                    className={`text-xs px-2 py-1 rounded-lg ${
                      it.correctBucket === bi ? "bg-green-500/20 text-green-700 dark:text-green-300" : "bg-red-500/20 text-red-700 dark:text-red-300"
                    }`}
                  >
                    {it.label}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {remaining.length === 0 && (
        <button
          onClick={finish}
          className="w-full mt-5 bg-primary text-primary-foreground py-3 rounded-2xl font-bold"
        >
          إنهاء اللعبة 🎉
        </button>
      )}
    </GameShell>
  );
}
