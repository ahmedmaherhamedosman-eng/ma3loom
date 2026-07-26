import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/games/$gameId")({
  component: GamePlayer,
});

type Game = Tables<"educational_games">;

function GamePlayer() {
  const { gameId } = Route.useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setAuthed(false); setLoading(false); return; }
      setAuthed(true);

      const { data } = await supabase
        .from("educational_games")
        .select("*")
        .eq("id", gameId)
        .eq("is_published", true)
        .maybeSingle();

      if (!data) { setLoading(false); return; }
      setGame(data);

      if (data.game_type === "url" && data.game_url) {
        setIframeSrc(data.game_url);
      } else if (data.game_type === "file" && data.html_file_path) {
        const { data: signed } = await supabase.storage
          .from("educational-games")
          .createSignedUrl(data.html_file_path, 60 * 60);
        if (signed?.signedUrl) setIframeSrc(signed.signedUrl);
      }

      // increment plays_count (best-effort)
      await supabase.from("educational_games")
        .update({ plays_count: (data.plays_count || 0) + 1 })
        .eq("id", gameId);

      setLoading(false);
    })();
  }, [gameId]);

  if (authed === false) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="text-center bg-card rounded-2xl border border-border p-8 max-w-md">
          <h1 className="text-xl font-bold mb-2">سجّل دخولك للعب</h1>
          <button
            onClick={() => navigate({ to: "/login" })}
            className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium"
          >
            تسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">جارٍ تحميل اللعبة...</div>;
  }

  if (!game || !iframeSrc) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-5xl mb-3">😕</div>
          <p className="text-muted-foreground mb-4">اللعبة غير متاحة</p>
          <Link to="/games" className="text-primary hover:underline">العودة لقائمة الألعاب</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={fullscreen ? "fixed inset-0 z-50 bg-background" : "min-h-[80vh] bg-background"}>
      <div className={fullscreen ? "h-full flex flex-col" : "mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6"}>
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/games" className="text-sm text-muted-foreground hover:text-foreground shrink-0">← الألعاب</Link>
            <h1 className="font-bold text-foreground truncate">{game.title}</h1>
          </div>
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="text-sm px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80"
          >
            {fullscreen ? "✕ خروج من الشاشة الكاملة" : "⛶ شاشة كاملة"}
          </button>
        </div>

        <div className={`bg-black rounded-xl overflow-hidden border border-border ${fullscreen ? "flex-1" : "aspect-video"}`}>
          <iframe
            src={iframeSrc}
            title={game.title}
            className="w-full h-full"
            allow="autoplay; fullscreen; gamepad; microphone; camera"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock"
          />
        </div>

        {!fullscreen && game.description && (
          <p className="text-sm text-muted-foreground mt-4">{game.description}</p>
        )}
      </div>
    </div>
  );
}
