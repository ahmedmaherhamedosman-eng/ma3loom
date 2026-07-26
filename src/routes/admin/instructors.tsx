import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/instructors")({
  head: () => ({ meta: [{ title: "المدرسون — معلوم" }] }),
  component: AdminInstructors,
});

interface InstructorRow {
  user_id: string;
  full_name: string;
  phone: string | null;
}

function AdminInstructors() {
  const [instructors, setInstructors] = useState<InstructorRow[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = async () => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "instructor" as any);
    const ids = (roles || []).map((r: any) => r.user_id);
    if (ids.length === 0) { setInstructors([]); setLoading(false); return; }
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, phone")
      .in("user_id", ids);
    setInstructors((profiles as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!email.trim()) { toast.error("أدخل بريد المدرس"); return; }
    setAdding(true);
    // البحث عن المستخدم بالبريد عبر profiles+full_name غير ممكن مباشرة (لا يوجد جدول email عام).
    // نستخدم RPC أو ندوّر بمطابقة عبر auth (يحتاج edge). نعرض رسالة مؤقتة.
    toast.info("لإضافة مدرس: انسخ user_id من قسم الطلاب وأضفه عبر قاعدة البيانات.", {
      description: "نظام الدعوة بالبريد قيد التطوير.",
    });
    setAdding(false);
    setEmail("");
  };

  const handleRemove = async (uid: string) => {
    if (!confirm("إزالة دور المدرس من هذا المستخدم؟")) return;
    const { error } = await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", "instructor" as any);
    if (error) { toast.error("تعذّر الإزالة", { description: error.message }); return; }
    toast.success("تمت الإزالة");
    load();
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">المدرسون</h1>
        <p className="text-sm text-muted-foreground mt-1">إدارة المدرسين الذين يستطيعون إنشاء حصص مباشرة</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-3">إضافة مدرس جديد</h2>
        <p className="text-xs text-muted-foreground mb-3">
          💡 لإضافة مدرس: اذهب إلى <strong>الطلاب</strong>، انسخ معرّف المستخدم، وارجع لتعيينه كمدرس.
        </p>
        <div className="flex gap-2">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="بريد المدرس" dir="ltr" />
          <Button variant="hero" onClick={handleAdd} disabled={adding}>إضافة</Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>
        ) : instructors.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-5xl mb-3">👨‍🏫</div>
            <h3 className="text-lg font-bold text-foreground mb-2">لا يوجد مدرسون</h3>
            <p className="text-muted-foreground">عيّن المستخدمين كمدرسين ليتمكنوا من إنشاء الحصص.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {instructors.map((i) => (
              <div key={i.user_id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">{i.full_name || "بدون اسم"}</p>
                  {i.phone && <p className="text-xs text-muted-foreground" dir="ltr">{i.phone}</p>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleRemove(i.user_id)} className="text-destructive">
                  إزالة
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
