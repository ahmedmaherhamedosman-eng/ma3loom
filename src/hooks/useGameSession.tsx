import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PlayGame, UserGameProgress, GameResult } from "@/lib/gameTypes";

const GUEST_KEY = "ma3loom_guest_progress";
const GUEST_THRESHOLD_XP = 50;

interface GuestProgress {
  xp: number;
  coins: number;
  stars: number;
  attempts: number;
}

function readGuest(): GuestProgress {
  if (typeof window === "undefined") return { xp: 0, coins: 0, stars: 0, attempts: 0 };
  try {
    return JSON.parse(sessionStorage.getItem(GUEST_KEY) || "") as GuestProgress;
  } catch {
    return { xp: 0, coins: 0, stars: 0, attempts: 0 };
  }
}
function writeGuest(p: GuestProgress) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(GUEST_KEY, JSON.stringify(p));
}

export function useGameProgress() {
  const [progress, setProgress] = useState<UserGameProgress | null>(null);
  const [guest, setGuest] = useState<GuestProgress>({ xp: 0, coins: 0, stars: 0, attempts: 0 });
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setIsAuthed(false);
      setGuest(readGuest());
      setLoading(false);
      return;
    }
    setIsAuthed(true);
    const { data } = await supabase
      .from("user_game_progress")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (data) setProgress(data);
    else {
      const { data: created } = await supabase
        .from("user_game_progress")
        .insert({ user_id: session.user.id })
        .select("*")
        .maybeSingle();
      setProgress(created);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange(() => refresh());
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  return { progress, guest, isAuthed, loading, refresh };
}

export function useSubmitGameResult() {
  return useCallback(async (game: PlayGame, result: GameResult) => {
    const xp = Math.round(game.xp_reward * (result.score / 100));
    const coins = Math.round(game.coins_reward * (result.score / 100));

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const cur = readGuest();
      const next = {
        xp: cur.xp + xp,
        coins: cur.coins + coins,
        stars: cur.stars + result.stars,
        attempts: cur.attempts + 1,
      };
      writeGuest(next);
      return { savedRemote: false, promptSignup: next.xp >= GUEST_THRESHOLD_XP, xp, coins };
    }

    // insert attempt
    await supabase.from("game_attempts").insert({
      user_id: session.user.id,
      game_id: game.id,
      score: result.score,
      stars: result.stars,
      xp_earned: xp,
      coins_earned: coins,
      time_seconds: result.timeSeconds,
      completed: result.score >= 60,
    });

    // update progress
    const { data: cur } = await supabase
      .from("user_game_progress")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();
    const newXp = (cur?.xp || 0) + xp;
    const newCoins = (cur?.coins || 0) + coins;
    const newStars = (cur?.stars || 0) + result.stars;
    const newTrophies = (cur?.trophies || 0) + (result.stars === 3 ? 1 : 0);

    // compute level
    const { data: levels } = await supabase
      .from("game_levels")
      .select("level_number, min_xp")
      .lte("min_xp", newXp)
      .order("level_number", { ascending: false })
      .limit(1);
    const newLevel = levels?.[0]?.level_number || 1;

    // streak
    const today = new Date().toISOString().slice(0, 10);
    const last = cur?.last_played_at ? new Date(cur.last_played_at).toISOString().slice(0, 10) : null;
    let streak = cur?.streak_days || 0;
    if (last === today) {
      // same day, keep
    } else if (last) {
      const dayDiff = Math.round(
        (new Date(today).getTime() - new Date(last).getTime()) / 86400000
      );
      streak = dayDiff === 1 ? streak + 1 : 1;
    } else {
      streak = 1;
    }

    await supabase
      .from("user_game_progress")
      .update({
        xp: newXp,
        coins: newCoins,
        stars: newStars,
        trophies: newTrophies,
        current_level: newLevel,
        streak_days: streak,
        last_played_at: new Date().toISOString(),
      })
      .eq("user_id", session.user.id);

    // bump plays_count best-effort
    await supabase
      .from("play_games")
      .update({ plays_count: (game.plays_count || 0) + 1 })
      .eq("id", game.id);

    return { savedRemote: true, promptSignup: false, xp, coins };
  }, []);
}
