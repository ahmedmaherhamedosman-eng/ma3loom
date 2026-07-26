import { useMemo, useState } from "react";
import { GameShell } from "../GameShell";
import type { MemoryContent, GameResult } from "@/lib/gameTypes";
import { computeStars } from "@/lib/gameTypes";

export function MemoryGame({
  title,
  content,
  onComplete,
}: {
  title: string;
  content: MemoryContent;
  onComplete: (r: GameResult) => void;
}) {
  const deck = useMemo(() => {
    const doubled = [...content.cards, ...content.cards].map((v, i) => ({ v, i }));
    for (let i = doubled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [doubled[i], doubled[j]] = [doubled[j], doubled[i]];
    }
    return doubled;
  }, [content]);

  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [start] = useState(Date.now());

  const flip = (i: number) => {
    if (flipped.length === 2 || flipped.includes(i) || matched.has(i)) return;
    const next = [...flipped, i];
    setFlipped(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next;
      if (deck[a].v === deck[b].v) {
        setTimeout(() => {
          const newMatched = new Set(matched);
          newMatched.add(a);
          newMatched.add(b);
          setMatched(newMatched);
          setFlipped([]);
          if (newMatched.size === deck.length) {
            const optimal = content.cards.length;
            const efficiency = Math.min(1, optimal / Math.max(moves + 1, 1));
            const score = Math.round(60 + efficiency * 40);
            onComplete({
              score,
              stars: computeStars(score),
              timeSeconds: Math.round((Date.now() - start) / 1000),
              correct: content.cards.length,
              total: content.cards.length,
            });
          }
        }, 400);
      } else {
        setTimeout(() => setFlipped([]), 800);
      }
    }
  };

  return (
    <GameShell title={title} progress={{ current: matched.size, total: deck.length }}>
      <p className="text-center text-muted-foreground text-sm mb-4">حركات: {moves}</p>
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 sm:gap-3">
        {deck.map((c, i) => {
          const isOpen = flipped.includes(i) || matched.has(i);
          return (
            <button
              key={i}
              onClick={() => flip(i)}
              className={`aspect-square rounded-xl text-3xl sm:text-4xl font-bold border-2 transition-all ${
                isOpen
                  ? matched.has(i)
                    ? "bg-green-500/20 border-green-500 scale-95"
                    : "bg-primary/10 border-primary"
                  : "bg-gradient-to-br from-primary to-accent border-transparent text-primary-foreground hover:scale-105"
              }`}
            >
              {isOpen ? c.v : "?"}
            </button>
          );
        })}
      </div>
    </GameShell>
  );
}
