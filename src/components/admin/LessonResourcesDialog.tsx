import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Resource {
  id: string;
  title: string;
  file_url: string;
  file_type: string | null;
  sort_order: number;
}

interface Props {
  lessonId: string | null;
  lessonTitle: string;
  open: boolean;
  onClose: () => void;
}

export function LessonResourcesDialog({ lessonId, lessonTitle, open, onClose }: Props) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: "", file_url: "", file_type: "pdf" });

  const load = useCallback(async () => {
    if (!lessonId) return;
    setLoading(true);
    const { data } = await supabase
      .from("lesson_resources")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("sort_order");
    setResources(data || []);
    setLoading(false);
  }, [lessonId]);

  useEffect(() => {
    if (open && lessonId) load();
  }, [open, lessonId, load]);

  const handleAdd = async () => {
    if (!lessonId || !form.title.trim() || !form.file_url.trim()) return;
    await supabase.from("lesson_resources").insert({
      lesson_id: lessonId,
      title: form.title,
      file_url: form.file_url,
      file_type: form.file_type,
      sort_order: resources.length + 1,
    });
    setForm({ title: "", file_url: "", file_type: "pdf" });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("حذف هذا الملف؟")) return;
    await supabase.from("lesson_resources").delete().eq("id", id);
    load();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ملفات الدرس: {lessonTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">إضافة ملف جديد</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">عنوان الملف</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="مثال: ملخص الدرس"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">رابط الملف</Label>
                <Input
                  value={form.file_url}
                  onChange={(e) => setForm({ ...form, file_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">نوع الملف</Label>
                <select
                  value={form.file_type}
                  onChange={(e) => setForm({ ...form, file_type: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="pdf">PDF</option>
                  <option value="doc">Word</option>
                  <option value="zip">ZIP</option>
                  <option value="image">صورة</option>
                  <option value="other">آخر</option>
                </select>
              </div>
            </div>
            <Button variant="hero" size="sm" onClick={handleAdd}>+ إضافة الملف</Button>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            {loading ? (
              <div className="p-6 text-center text-muted-foreground text-sm">جاري التحميل...</div>
            ) : resources.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">لا توجد ملفات بعد</div>
            ) : (
              <ul className="divide-y divide-border">
                {resources.map((r) => (
                  <li key={r.id} className="flex items-center justify-between p-3 hover:bg-muted/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl">📎</span>
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{r.title}</div>
                        <a
                          href={r.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-primary truncate block"
                        >
                          {r.file_url}
                        </a>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(r.id)}
                      className="text-destructive shrink-0"
                    >
                      🗑️
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
