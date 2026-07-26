import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { StarRating } from "@/components/StarRating";

export interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

export interface FiltersState {
  type: "all" | "free" | "paid";
  maxPrice: number;
  minRating: number;
  categoryIds: string[];
}

interface Props {
  state: FiltersState;
  categories: CategoryOption[];
  onChange: (next: Partial<FiltersState>) => void;
  onReset: () => void;
}

export function CourseFilters({ state, categories, onChange, onReset }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-foreground">الفلاتر</h3>
        <Button variant="ghost" size="sm" onClick={onReset} className="text-xs h-7">
          إعادة تعيين
        </Button>
      </div>

      {/* Type */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground">النوع</label>
        <div className="grid grid-cols-3 gap-1">
          {[
            { value: "all", label: "الكل" },
            { value: "free", label: "مجاني" },
            { value: "paid", label: "مدفوع" },
          ].map((o) => (
            <button
              key={o.value}
              onClick={() => onChange({ type: o.value as FiltersState["type"] })}
              className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                state.type === o.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Max price */}
      {state.type !== "free" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-foreground">السعر الأقصى</label>
            <span className="text-xs text-muted-foreground">
              {state.maxPrice === 0 ? "بلا حد" : `$${state.maxPrice}`}
            </span>
          </div>
          <Slider
            value={[state.maxPrice]}
            onValueChange={(v) => onChange({ maxPrice: v[0] })}
            min={0}
            max={500}
            step={5}
          />
        </div>
      )}

      {/* Min rating */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground">الحد الأدنى للتقييم</label>
        <div className="space-y-1">
          {[0, 3, 4, 4.5].map((r) => (
            <button
              key={r}
              onClick={() => onChange({ minRating: r })}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${
                state.minRating === r ? "bg-accent/15" : "hover:bg-muted/50"
              }`}
            >
              {r === 0 ? (
                <span className="text-muted-foreground">أي تقييم</span>
              ) : (
                <>
                  <StarRating value={r} size="sm" readOnly />
                  <span className="text-muted-foreground">فأعلى</span>
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground">التصنيفات</label>
        <div className="space-y-1 max-h-64 overflow-y-auto pe-1">
          {categories.length === 0 ? (
            <p className="text-xs text-muted-foreground">لا توجد تصنيفات</p>
          ) : (
            categories.map((c) => {
              const checked = state.categoryIds.includes(c.id);
              return (
                <label
                  key={c.id}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors ${
                    checked ? "bg-primary/10 text-primary" : "hover:bg-muted/50 text-foreground"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = checked
                        ? state.categoryIds.filter((x) => x !== c.id)
                        : [...state.categoryIds, c.id];
                      onChange({ categoryIds: next });
                    }}
                    className="rounded"
                  />
                  {c.name}
                </label>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
