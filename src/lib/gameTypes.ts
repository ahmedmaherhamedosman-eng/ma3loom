import type { Tables } from "@/integrations/supabase/types";

export type PlayGame = Tables<"play_games">;
export type GameCategory = Tables<"game_categories">;
export type GameLevel = Tables<"game_levels">;
export type GameBadge = Tables<"game_badges">;
export type UserGameProgress = Tables<"user_game_progress">;

export type GameType =
  | "quiz"
  | "true_false"
  | "multiple_choice"
  | "fill_blank"
  | "match_cards"
  | "memory"
  | "drag_drop";

export interface GameResult {
  score: number; // 0-100
  stars: 1 | 2 | 3;
  timeSeconds: number;
  correct: number;
  total: number;
}

// Content shapes per game type
export interface QuizContent {
  questions: {
    q: string;
    options: string[];
    answer: number; // index
    image?: string;
  }[];
}
export interface TrueFalseContent {
  questions: { q: string; answer: boolean }[];
}
export interface FillBlankContent {
  questions: { text: string; answer: string; hint?: string }[];
}
export interface MatchCardsContent {
  pairs: { left: string; right: string }[];
}
export interface MemoryContent {
  cards: string[]; // emojis or words, will be duplicated
}
export interface DragDropContent {
  buckets: { label: string; items: string[] }[];
}

export function computeStars(pct: number): 1 | 2 | 3 {
  if (pct >= 90) return 3;
  if (pct >= 60) return 2;
  return 1;
}
