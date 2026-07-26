import { useState } from "react";
import { GameShell } from "../GameShell";
import type { FillBlankContent, GameResult } from "@/lib/gameTypes";
import { computeStars } from "@/lib/gameTypes";

export function FillBlankGame({
  title,
  content,
  onComplete,
}: {
  title: string;
  content: FillBlankContent;
  onComplete: (r: GameResult) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [val, setVal] = useState("");
  const [correct, setCorrect] = useState(0);
  const [checked, setChecked] = useState<null | boolean>(null);
  const [start] = useState(Date.now());
  const q = content.questions[idx];
  if (!q) return null;

  const submit = () => {
    if (checked !== null) return;
    const isCorrect =
      val.trim().toLowerCase() === q.answer.trim().toLowerCase();
    setChecked(isCorrect);
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
        setVal("");
        setChecked(null);
      }
    }, 1100);
  };

  return (
    <GameShell title={title} progress={{ current: idx + 1, total: content.questions.length }}>
      <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-border rounded-2xl p-6 mb-5">
        <p className="text-xl font-bold text-foreground text-center whitespace-pre-line">
          {q.text}
        </p>
        {q.hint && (
          <p className="text-xs text-muted-foreground text-center mt-2">💡 {q.hint}</p>
        )}
      </div>
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        disabled={checked !== null}
        placeholder="اكتب إجابتك هنا"
        className={`w-full p-4 rounded-2xl border-2 text-center text-lg font-medium mb-4 bg-card ${
          checked === true
            ? "border-green-500 text-green-700"
            : checked === false
              ? "border-red-500 text-red-700"
              : "border-border focus:border-primary"
        } outline-none transition-colors`}
      />
      {checked === false && (
        <p className="text-center text-sm text-muted-foreground mb-3">
          الإجابة الصحيحة: <span className="font-bold text-foreground">{q.answer}</span>
        </p>
      )}
      <button
        onClick={submit}
        disabled={!val.trim() || checked !== null}
        className="w-full bg-primary text-primary-foreground py-3 rounded-2xl font-bold disabled:opacity-50"
      >
        تحقق
      </button>
    </GameShell>
  );
}
