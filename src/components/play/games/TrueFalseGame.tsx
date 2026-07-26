import { useState } from "react";
import { GameShell, GameChoice } from "../GameShell";
import type { TrueFalseContent, GameResult } from "@/lib/gameTypes";
import { computeStars } from "@/lib/gameTypes";

export function TrueFalseGame({
  title,
  content,
  onComplete,
}: {
  title: string;
  content: TrueFalseContent;
  onComplete: (r: GameResult) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<boolean | null>(null);
  const [start] = useState(Date.now());
  const q = content.questions[idx];
  if (!q) return null;

  const answer = (val: boolean) => {
    if (picked !== null) return;
    setPicked(val);
    const isCorrect = val === q.answer;
    if (isCorrect) setCorrect((c) => c + 1);
    setTimeout(() => {
      if (idx + 1 >= content.questions.length) {
        const total = content.questions.length;
        const final = correct + (isCorrect ? 1 : 0);
        const score = Math.round((final / total) * 100);
        onComplete({
          score,
          stars: computeStars(score),
          timeSeconds: Math.round((Date.now() - start) / 1000),
          correct: final,
          total,
        });
      } else {
        setIdx((i) => i + 1);
        setPicked(null);
      }
    }, 800);
  };

  const stateFor = (val: boolean): "idle" | "correct" | "wrong" | "disabled" => {
    if (picked === null) return "idle";
    if (val === q.answer) return "correct";
    if (val === picked) return "wrong";
    return "disabled";
  };

  return (
    <GameShell title={title} progress={{ current: idx + 1, total: content.questions.length }}>
      <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-border rounded-2xl p-8 mb-6">
        <p className="text-2xl font-bold text-foreground text-center">{q.q}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <GameChoice label="صح" emoji="✅" state={stateFor(true)} onClick={() => answer(true)} />
        <GameChoice label="خطأ" emoji="❌" state={stateFor(false)} onClick={() => answer(false)} />
      </div>
    </GameShell>
  );
}
