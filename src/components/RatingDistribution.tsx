import { StarRating } from "@/components/StarRating";

interface Props {
  ratings: number[]; // array of rating values 1..5
}

export function RatingDistribution({ ratings }: Props) {
  const total = ratings.length;
  const avg = total > 0 ? ratings.reduce((a, b) => a + b, 0) / total : 0;
  const buckets = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: ratings.filter((r) => r === star).length,
  }));

  return (
    <div className="grid sm:grid-cols-[auto_1fr] gap-6 items-start">
      <div className="text-center">
        <div className="text-5xl font-extrabold text-foreground">{avg.toFixed(1)}</div>
        <div className="mt-1 flex justify-center">
          <StarRating value={avg} readOnly />
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{total} تقييم</div>
      </div>
      <div className="space-y-1.5 min-w-0">
        {buckets.map((b) => {
          const pct = total > 0 ? (b.count / total) * 100 : 0;
          return (
            <div key={b.star} className="flex items-center gap-2 text-xs">
              <span className="w-4 text-muted-foreground">{b.star}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-accent shrink-0">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-accent transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-8 text-end text-muted-foreground">{b.count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
