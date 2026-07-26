import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/admin/coupons")({
  head: () => ({ meta: [{ title: "الكوبونات — معلوم" }] }),
  component: AdminCoupons,
});

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
}

function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: "",
    discount_type: "percentage",
    discount_value: 10,
    max_uses: 100,
    expires_at: "",
  });

  const load = async () => {
    const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
    setCoupons(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.code.trim()) return;
    await supabase.from("coupons").insert({
      code: form.code.toUpperCase(),
      discount_type: form.discount_type,
      discount_value: form.discount_value,
      max_uses: form.max_uses || null,
      expires_at: form.expires_at || null,
    });
    setShowForm(false);
    setForm({ code: "", discount_type: "percentage", discount_value: 10, max_uses: 100, expires_at: "" });
    load();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("coupons").update({ is_active: !current }).eq("id", id);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">كوبونات الخصم</h1>
        <Button variant="hero" onClick={() => setShowForm(!showForm)}>+ كوبون جديد</Button>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>كود الكوبون *</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="WELCOME20" dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>نوع الخصم</Label>
              <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">نسبة مئوية (%)</SelectItem>
                  <SelectItem value="fixed">مبلغ ثابت (ج.م)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>قيمة الخصم</Label>
              <Input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })} min={1} />
            </div>
            <div className="space-y-2">
              <Label>الحد الأقصى للاستخدام</Label>
              <Input type="number" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: Number(e.target.value) })} min={1} />
            </div>
            <div className="space-y-2">
              <Label>تاريخ الانتهاء</Label>
              <Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} dir="ltr" />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Button variant="hero" onClick={handleSave}>إضافة الكوبون</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-right p-3 font-medium text-muted-foreground">الكود</th>
              <th className="text-right p-3 font-medium text-muted-foreground">الخصم</th>
              <th className="text-right p-3 font-medium text-muted-foreground hidden sm:table-cell">الاستخدام</th>
              <th className="text-right p-3 font-medium text-muted-foreground">الحالة</th>
              <th className="text-right p-3 font-medium text-muted-foreground">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">جاري التحميل...</td></tr>
            ) : coupons.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">لا توجد كوبونات</td></tr>
            ) : (
              coupons.map((c) => (
                <tr key={c.id} className="border-b border-border hover:bg-muted/30">
                  <td className="p-3 font-mono font-bold text-foreground">{c.code}</td>
                  <td className="p-3">
                    {c.discount_type === "percentage" ? `${c.discount_value}%` : `${c.discount_value} ج.م`}
                  </td>
                  <td className="p-3 hidden sm:table-cell text-muted-foreground">
                    {c.current_uses}/{c.max_uses || "∞"}
                  </td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${c.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                      {c.is_active ? "فعّال" : "معطّل"}
                    </span>
                  </td>
                  <td className="p-3">
                    <Button variant="ghost" size="sm" onClick={() => toggleActive(c.id, c.is_active)}>
                      {c.is_active ? "تعطيل" : "تفعيل"}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
