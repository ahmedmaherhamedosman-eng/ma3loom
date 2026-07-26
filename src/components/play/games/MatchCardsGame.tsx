import { useState } from "react";
import { GameShell } from "../GameShell";
import type { MatchCardsContent, GameResult } from "@/lib/gameTypes";
import { computeStars } from "@/lib/gameTypes";

export function MatchCardsGame({
  title,
  content,
  onComplete,
}: {
  title: string;
  content: MatchCardsContent;
  onComplete: (r: GameResult) => void;
}) {
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [matches, setMatches] = useState<Record<number, number>>({});
  const [wrongPair, setWrongPair] = useState<[number, number] | null>(null);
  const [start] = useState(Date.now());
  const [rightOrder] = useState(() => {
    const arr = content.pairs.map((_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  });

  const total = content.pairs.length;
  const matchedCount = Object.keys(matches).length;

  const pickRight = (rightIdx: number) => {
    if (selectedLeft === null) return;
    if (Object.values(matches).includes(rightIdx)) return;
    if (selectedLeft === rightIdx) {
      setMatches((m) => ({ ...m, [selectedLeft]: rightIdx }));
      setSelectedLeft(null);
      if (matchedCount + 1 >= total) {
        setTimeout(() => {
          onComplete({
            score: 100,
            stars: computeStars(100),
            timeSeconds: Math.round((Date.now() - start) / 1000),
            correct: total,
            total,
          });
        }, 500);
      }
    } else {
      setWrongPair([selectedLeft, rightIdx]);
      setTimeout(() => {
        setWrongPair(null);
        setSelectedLeft(null);
      }, 700);
    }
  };

  return (
    <GameShell title={title} progress={{ current: matchedCount, total }}>
      <p className="text-center text-muted-foreground text-sm mb-5">اختر من العمود الأيمن ثم ما يقابله في الأيسر</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2.5">
          {content.pairs.map((p, i) => {
            const matched = i in matches;
            const selected = selectedLeft === i;
            const wrong = wrongPair?.[0] === i;
            return (
              <button
                key={i}
                onClick={() => !matched && setSelectedLeft(i)}
                disabled={matched}
                className={`w-full p-3 rounded-xl border-2 font-medium transition-all ${
                  matched
                    ? "bg-green-500/20 border-green-500 text-green-700 dark:text-green-300"
                    : wrong
                      ? "bg-red-500/20 border-red-500"
                      : selected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border hover:border-primary"
                }`}
              >
                {p.left}
              </button>
            );
          })}
        </div>
        <div className="space-y-2.5">
          {rightOrder.map((rIdx) => {
            const matched = Object.values(matches).includes(rIdx);
            const wrong = wrongPair?.[1] === rIdx;
            return (
              <button
                key={rIdx}
                onClick={() => pickRight(rIdx)}
                disabled={matched || selectedLeft === null}
                className={`w-full p-3 rounded-xl border-2 font-medium transition-all ${
                  matched
                    ? "bg-green-500/20 border-green-500 text-green-700 dark:text-green-300"
                    : wrong
                      ? "bg-red-500/20 border-red-500"
                      : selectedLeft !== null
                        ? "bg-card border-border hover:border-accent hover:bg-accent/10"
                        : "bg-muted border-border text-muted-foreground"
                }`}
              >
                {content.pairs[rIdx].right}
              </button>
            );
          })}
        </div>
      </div>
    </GameShell>
  );
}
