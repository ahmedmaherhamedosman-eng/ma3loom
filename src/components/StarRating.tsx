import { useState } from "react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
  readOnly?: boolean;
  showValue?: boolean;
  count?: number;
  className?: string;
}

export function StarRating({
  value,
  onChange,
  size = "md",
  readOnly = false,
  showValue = false,
  count,
  className,
}: StarRatingProps) {
  const [hover, setHover] = useState<number | null>(null);
  const sizeMap = { sm: 14, md: 18, lg: 24 };
  const px = sizeMap[size];
  const display = hover ?? value;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = i <= Math.floor(display);
          const half = !filled && i - 0.5 <= display;
          return (
            <button
              key={i}
              type="button"
              disabled={readOnly}
              onMouseEnter={() => !readOnly && setHover(i)}
              onMouseLeave={() => !readOnly && setHover(null)}
              onClick={() => !readOnly && onChange?.(i)}
              className={cn(
                "transition-transform",
                !readOnly && "cursor-pointer hover:scale-110",
                readOnly && "cursor-default"
              )}
              aria-label={`${i} نجوم`}
            >
              <svg
                width={px}
                height={px}
                viewBox="0 0 24 24"
                fill={filled ? "currentColor" : half ? "url(#half)" : "none"}
                stroke="currentColor"
                strokeWidth="1.5"
                className={filled || half ? "text-accent" : "text-muted-foreground/40"}
              >
                <defs>
                  <linearGradient id="half">
                    <stop offset="50%" stopColor="currentColor" />
                    <stop offset="50%" stopColor="transparent" />
                  </linearGradient>
                </defs>
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
          );
        })}
      </div>
      {showValue && (
        <span className="text-sm font-medium text-foreground ms-1">
          {value > 0 ? value.toFixed(1) : "—"}
          {typeof count === "number" && (
            <span className="text-muted-foreground font-normal"> ({count})</span>
          )}
        </span>
      )}
    </div>
  );
}
