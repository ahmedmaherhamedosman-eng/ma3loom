import { StarRating } from "@/components/StarRating";

export interface ReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  author_name?: string;
}

interface Props {
  reviews: ReviewItem[];
}

export function ReviewsList({ reviews }: Props) {
  if (reviews.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground text-sm">
        لا توجد تقييمات بعد. كن أول من يقيّم هذا الكورس بعد إكمال 50% منه.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((r) => (
        <div key={r.id} className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <div className="font-semibold text-foreground text-sm">{r.author_name || "طالب"}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(r.created_at).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" })}
              </div>
            </div>
            <StarRating value={r.rating} size="sm" readOnly />
          </div>
          {r.comment && <p className="text-sm text-foreground/90 leading-relaxed">{r.comment}</p>}
        </div>
      ))}
    </div>
  );
}
