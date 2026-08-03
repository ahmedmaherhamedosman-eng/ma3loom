import type { DragDropContent, FillBlankContent, GameResult, MatchCardsContent, MemoryContent, PlayGame, QuizContent, TrueFalseContent } from "@/lib/gameTypes";
import { QuizGame } from "./games/QuizGame";
import { TrueFalseGame } from "./games/TrueFalseGame";
import { FillBlankGame } from "./games/FillBlankGame";
import { MatchCardsGame } from "./games/MatchCardsGame";
import { MemoryGame } from "./games/MemoryGame";
import { DragDropGame } from "./games/DragDropGame";

export function GamePlayer({ game, onComplete }: { game: PlayGame; onComplete: (r: GameResult) => void }) {
  const c = (game.content as Record<string, unknown>) || {};
  switch (game.type) {
    case "quiz":
    case "multiple_choice":
      return <QuizGame title={game.title} content={c as unknown as QuizContent} onComplete={onComplete} />;
    case "true_false":
      return <TrueFalseGame title={game.title} content={c as unknown as TrueFalseContent} onComplete={onComplete} />;
    case "fill_blank":
      return <FillBlankGame title={game.title} content={c as unknown as FillBlankContent} onComplete={onComplete} />;
    case "match_cards":
      return <MatchCardsGame title={game.title} content={c as unknown as MatchCardsContent} onComplete={onComplete} />;
    case "memory":
      return <MemoryGame title={game.title} content={c as unknown as MemoryContent} onComplete={onComplete} />;
    case "drag_drop":
      return <DragDropGame title={game.title} content={c as unknown as DragDropContent} onComplete={onComplete} />;
    default:
      return (
        <div className="text-center py-12 text-muted-foreground">
          نوع اللعبة "{game.type}" غير مدعوم بعد
        </div>
      );
  }
}
