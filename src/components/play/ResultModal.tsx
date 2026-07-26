import { Link } from "@tanstack/react-router";
import type { GameResult } from "@/lib/gameTypes";

export function ResultModal({
  result,
  xp,
  coins,
  promptSignup,
  onReplay,
  onExit,
}: {
  result: GameResult;
  xp: number;
  coins: number;
  promptSignup: boolean;
  onReplay: () => void;
  onExit: () => void;
}) {
  const passed = result.score >= 60;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-card rounded-3xl border border-border p-6 sm:p-8 max-w-md w-full text-center shadow-2xl animate-in zoom-in-95">
        <div className="text-7xl mb-3 animate-bounce">
          {passed ? (result.stars === 3 ? "🏆" : "🎉") : "💪"}
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-1">
          {passed ? "أحسنت!" : "حاول مرة أخرى!"}
        </h2>
        <p className="text-muted-foreground text-sm mb-5">
          حصلت على {result.correct} من {result.total} إجابة صحيحة
        </p>

        <div className="flex justify-center gap-1 mb-5 text-4xl">
          {[1, 2, 3].map((s) => (
            <span key={s} className={s <= result.stars ? "" : "opacity-20 grayscale"}>⭐</span>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="bg-primary/10 rounded-2xl p-3">
            <div className="text-2xl font-bold text-primary">+{xp}</div>
            <div className="text-xs text-muted-foreground">XP</div>
          </div>
          <div className="bg-accent/10 rounded-2xl p-3">
            <div className="text-2xl font-bold text-accent">+{coins}</div>
            <div className="text-xs text-muted-foreground">عملة</div>
          </div>
          <div className="bg-muted rounded-2xl p-3">
            <div className="text-2xl font-bold text-foreground">{result.score}%</div>
            <div className="text-xs text-muted-foreground">النتيجة</div>
          </div>
        </div>

        {promptSignup && (
          <div className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-2xl p-4 mb-5">
            <p className="text-sm font-bold text-foreground mb-2">🔒 سجّل حسابك لحفظ تقدّمك!</p>
            <p className="text-xs text-muted-foreground mb-3">
              اجمع نقاطك، اربح شارات، واحصل على شهادات رسمية
            </p>
            <Link
              to="/signup"
              className="block w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-bold text-sm"
            >
              إنشاء حساب مجاني
            </Link>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onReplay}
            className="flex-1 bg-muted text-foreground py-3 rounded-2xl font-bold hover:bg-muted/80"
          >
            🔁 إعادة
          </button>
          <button
            onClick={onExit}
            className="flex-1 bg-primary text-primary-foreground py-3 rounded-2xl font-bold hover:bg-primary/90"
          >
            التالي
          </button>
        </div>
      </div>
    </div>
  );
}
