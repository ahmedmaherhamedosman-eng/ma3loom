import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/StarRating";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  courseId: string;
  userId: string;
  existingReview?: { id: string; rating: number; comment: string | null } | null;
  onSaved?: () => void;
}

export function ReviewForm({ courseId, userId, existingReview, onSaved }: Props) {
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [comment, setComment] = useState(existingReview?.comment ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (rating < 1) {
      toast.error("اختر عدد النجوم أولاً");
      return;
    }
    setSaving(true);
    const payload = { course_id: courseId, user_id: userId, rating, comment: comment.trim() || null };
    const { error } = existingReview
      ? await supabase.from("course_reviews").update(payload).eq("id", existingReview.id)
      : await supabase.from("course_reviews").insert(payload);

    setSaving(false);
    if (error) {
      toast.error("تعذر حفظ التقييم", { description: error.message });
      return;
    }
    toast.success("تم حفظ تقييمك. شكراً لك!");
    onSaved?.();
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <h3 className="font-bold text-foreground">{existingReview ? "تعديل تقييمك" : "أضف تقييمك"}</h3>
      <div>
        <p className="text-sm text-muted-foreground mb-2">اختر عدد النجوم</p>
        <StarRating value={rating} onChange={setRating} size="lg" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground mb-2">تعليقك (اختياري)</p>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="شارك رأيك في الكورس..."
          maxLength={500}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[90px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <div className="text-xs text-muted-foreground mt-1 text-end">{comment.length}/500</div>
      </div>
      <Button variant="hero" onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "جاري الحفظ..." : existingReview ? "حفظ التعديلات" : "نشر التقييم"}
      </Button>
    </div>
  );
}
