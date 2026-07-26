import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PlayGame, GameResult } from "@/lib/gameTypes";
import { GamePlayer } from "@/components/play/GamePlayer";
import { ResultModal } from "@/components/play/ResultModal";
import { useSubmitGameResult } from "@/hooks/useGameSession";

export const Route = createFileRoute("/play/$gameId")({
  component: PlayGamePage,
});

function PlayGamePage() {
  const { gameId } = Route.useParams();
  const navigate = useNavigate();
  const submit = useSubmitGameResult();
  const [game, setGame] = useState<PlayGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<GameResult | null>(null);
  const [rewards, setRewards] = useState<{ xp: number; coins: number; promptSignup: boolean } | null>(null);
  const [replayKey, setReplayKey] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("play_games")
        .select("*")
        .eq("id", gameId)
        .eq("is_published", true)
        .maybeSingle();
      setGame(data);
      setLoading(false);
    })();
  }, [gameId, replayKey]);

  const onComplete = async (r: GameResult) => {
    if (!game) return;
    const res = await submit(game, r);
    setResult(r);
    setRewards({ xp: res.xp, coins: res.coins, promptSignup: res.promptSignup });
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">جارٍ تحميل اللعبة...</div>;
  if (!game) return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 text-center">
      <div>
        <div className="text-6xl mb-3">😕</div>
        <p className="text-muted-foreground mb-4">اللعبة غير متاحة</p>
        <Link to="/play" className="text-primary hover:underline">العودة لصفحة الألعاب</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-[80vh] bg-background">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6">
        <Link to="/play" className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block">← الألعاب</Link>
        <div key={replayKey}>
          <GamePlayer game={game} onComplete={onComplete} />
        </div>
      </div>
      {result && rewards && (
        <ResultModal
          result={result}
          xp={rewards.xp}
          coins={rewards.coins}
          promptSignup={rewards.promptSignup}
          onReplay={() => { setResult(null); setRewards(null); setReplayKey((k) => k + 1); }}
          onExit={() => navigate({ to: "/play" })}
        />
      )}
    </div>
  );
}
