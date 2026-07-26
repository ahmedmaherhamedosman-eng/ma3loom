import { useState } from "react";
import { GameShell, GameChoice } from "../GameShell";
import type { QuizContent, GameResult } from "@/lib/gameTypes";
import { computeStars } from "@/lib/gameTypes";

export function QuizGame({
  title,
  content,
  onComplete,
}: {
  title: string;
  content: QuizContent;
  onComplete: (r: GameResult) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [start] = useState(Date.now());
  const q = content.questions[idx];

  if (!q) return null;

  const answer = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const isCorrect = i === q.answer;
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
    }, 900);
  };

  return (
    <GameShell title={title} progress={{ current: idx + 1, total: content.questions.length }}>
      {q.image && (
        <img src={q.image} alt="" className="w-full max-h-64 object-contain rounded-xl mb-4" />
      )}
      <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-border rounded-2xl p-6 mb-5">
        <p className="text-xl font-bold text-foreground text-center">{q.q}</p>
      </div>
      <div className="space-y-3">
        {q.options.map((opt, i) => {
          let state: "idle" | "correct" | "wrong" | "disabled" = "idle";
          if (picked !== null) {
            if (i === q.answer) state = "correct";
            else if (i === picked) state = "wrong";
            else state = "disabled";
          }
          return <GameChoice key={i} label={opt} state={state} onClick={() => answer(i)} />;
        })}
      </div>
    </GameShell>
  );
}
