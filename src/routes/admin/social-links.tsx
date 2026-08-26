import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { defaultSocialLinks } from "@/lib/social-links";

export const Route = createFileRoute("/admin/social-links")({
  head: () => ({ meta: [{ title: "منصات التواصل الاجتماعي — معلوم" }] }),
  component: AdminSocialLinks,
});

function AdminSocialLinks() {
  const [urls, setUrls] = useState<Record<string, string>>(
    Object.fromEntries(defaultSocialLinks.map((link) => [link.platform, link.href])),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.from("social_links").select("platform, url").then(({ data }) => {
      if (data) setUrls((current) => ({ ...current, ...Object.fromEntries(data.map((item) => [item.platform, item.url])) }));
      setLoading(false);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage("");
    const invalid = Object.values(urls).some((url) => {
      try { return !url.trim() || !new URL(url).protocol.startsWith("http"); } catch { return true; }
    });
    if (invalid) {
      setMessage("يرجى إدخال روابط صحيحة تبدأ بـ https:// أو http://");
      setSaving(false);
      return;
    }
    const { error } = await Promise.all(
      Object.entries(urls).map(([platform, url]) => supabase.from("social_links").update({ url, updated_at: new Date().toISOString() }).eq("platform", platform)),
    ).then((results) => ({ error: results.find((result) => result.error)?.error ?? null }));
    setMessage(error ? "تعذر حفظ الروابط. حاول مرة أخرى." : "تم حفظ الروابط بنجاح.");
    setSaving(false);
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">منصات التواصل الاجتماعي</h1>
        <p className="mt-2 text-sm text-muted-foreground">تحكم في الروابط الظاهرة في الهيدر والفوتر.</p>
      </div>
      <div className="space-y-5 rounded-xl border border-border bg-card p-6">
        {defaultSocialLinks.map((link) => (
          <div key={link.platform} className="space-y-2">
            <Label htmlFor={`social-${link.platform}`}>{link.label}</Label>
            <Input
              id={`social-${link.platform}`}
              value={urls[link.platform] ?? ""}
              onChange={(event) => setUrls({ ...urls, [link.platform]: event.target.value })}
              dir="ltr"
              disabled={loading || saving}
              placeholder="https://..."
            />
          </div>
        ))}
        <div className="flex items-center gap-4 pt-2">
          <Button variant="hero" onClick={save} disabled={loading || saving}>
            {saving ? "جارٍ الحفظ..." : "حفظ الروابط"}
          </Button>
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </div>
      </div>
    </div>
  );
}