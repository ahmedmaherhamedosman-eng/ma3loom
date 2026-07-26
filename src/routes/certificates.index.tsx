import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { downloadCertificatePDF } from "@/lib/certificate";
import { toast } from "sonner";

export const Route = createFileRoute("/certificates/")({
  head: () => ({
    meta: [
      { title: "شهاداتي — معلوم" },
      {
        name: "description",
        content: "عرض وتحميل جميع شهادات الكورسات التي أكملتها على منصة معلوم",
      },
    ],
  }),
  component: CertificatesIndex,
});

interface CertRow {
  id: string;
  verification_code: string;
  issued_at: string;
  quiz_score: number | null;
  course_id: string;
  courses?: {
    title: string;
    instructor: string;
    image_url: string | null;
    level: string;
  } | null;
}

function CertificatesIndex() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [certs, setCerts] = useState<CertRow[]>([]);
  const [studentName, setStudentName] = useState("طالب");
  const [search, setSearch] = useState("");
  const [verifyCode, setVerifyCode] = useState("");

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate({ to: "/login" });
        return;
      }

      const [{ data: certsData }, { data: profile }] = await Promise.all([
        supabase
          .from("certificates")
          .select(
            "id, verification_code, issued_at, quiz_score, course_id, courses(title, instructor, image_url, level)"
          )
          .eq("user_id", user.id)
          .order("issued_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      setCerts((certsData as CertRow[]) || []);
      if (profile?.full_name) setStudentName(profile.full_name);
      setLoading(false);
    };
    load();
  }, [navigate]);

  const handleDownload = async (cert: CertRow) => {
    try {
      await downloadCertificatePDF({
        studentName,
        courseTitle: cert.courses?.title || "كورس",
        instructor: cert.courses?.instructor || "—",
        issuedAt: cert.issued_at,
        verificationCode: cert.verification_code,
        quizScore: cert.quiz_score,
        level: cert.courses?.level || null,
      });
    } catch {
      toast.error("تعذّر إنشاء ملف PDF");
    }
  };

  const handleShare = async (cert: CertRow) => {
    const url = `${window.location.origin}/certificates/${cert.verification_code}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `شهادة: ${cert.courses?.title}`,
          text: `لقد أكملت كورس "${cert.courses?.title}" على منصة معلوم 🎓`,
          url,
        });
        return;
      } catch {
        /* user cancelled */
      }
    }
    await navigator.clipboard.writeText(url);
    toast.success("تم نسخ رابط الشهادة");
  };

  const handleVerifyJump = (e: React.FormEvent) => {
    e.preventDefault();
    const code = verifyCode.trim();
    if (!code) return;
    navigate({ to: "/certificates/$code", params: { code } });
  };

  const filtered = certs.filter((c) =>
    (c.courses?.title || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container max-w-6xl py-8 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link to="/dashboard" className="hover:text-primary">
            لوحتي
          </Link>
          <span>/</span>
          <span className="text-foreground">شهاداتي</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold mb-2">
              🏅 شهاداتي
            </h1>
            <p className="text-muted-foreground">
              {loading
                ? "جارٍ التحميل…"
                : certs.length > 0
                ? `لديك ${certs.length} شهادة معتمدة`
                : "لم تحصل على شهادة بعد"}
            </p>
          </div>

          {/* Verify form */}
          <form
            onSubmit={handleVerifyJump}
            className="flex gap-2 w-full md:w-auto"
          >
            <Input
              placeholder="ادخل كود التحقق"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
              className="md:w-64 font-mono text-sm"
            />
            <Button type="submit" variant="outline">
              تحقّق
            </Button>
          </form>
        </div>
      </div>

      {/* Search */}
      {certs.length > 3 && (
        <div className="mb-6">
          <Input
            placeholder="🔎 ابحث في شهاداتك بعنوان الكورس..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : certs.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-2xl">
          <div className="text-4xl mb-2">🔍</div>
          <p className="text-muted-foreground">
            لا توجد شهادات مطابقة لبحثك
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((cert) => (
            <CertCard
              key={cert.id}
              cert={cert}
              onDownload={() => handleDownload(cert)}
              onShare={() => handleShare(cert)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CertCard({
  cert,
  onDownload,
  onShare,
}: {
  cert: CertRow;
  onDownload: () => void;
  onShare: () => void;
}) {
  return (
    <div className="group rounded-2xl border-2 border-warm/20 bg-gradient-to-br from-warm/5 via-card to-primary/5 overflow-hidden card-hover flex flex-col">
      {/* Top decoration */}
      <div className="relative bg-gradient-to-br from-primary to-primary/70 p-6 text-center">
        <div className="absolute top-3 left-3 text-xs font-bold bg-warm text-warm-foreground px-2 py-1 rounded-full">
          معتمدة ✓
        </div>
        <div className="text-6xl mb-2 drop-shadow">🏅</div>
        <p className="text-xs text-primary-foreground/80 uppercase tracking-wide font-semibold">
          Certificate of Completion
        </p>
      </div>

      {/* Body */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-extrabold text-foreground text-lg line-clamp-2 mb-2 min-h-[3.5rem]">
          {cert.courses?.title || "كورس"}
        </h3>
        <div className="space-y-1.5 text-sm text-muted-foreground mb-4 flex-1">
          <div className="flex justify-between">
            <span>المدرّب</span>
            <span className="text-foreground font-medium">
              {cert.courses?.instructor || "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>تاريخ الإصدار</span>
            <span className="text-foreground font-medium">
              {new Date(cert.issued_at).toLocaleDateString("ar-EG", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
          {cert.quiz_score !== null && (
            <div className="flex justify-between">
              <span>الدرجة</span>
              <span className="text-success font-bold">
                {cert.quiz_score}%
              </span>
            </div>
          )}
          <div className="flex justify-between pt-1 border-t border-border">
            <span>الكود</span>
            <span className="font-mono text-xs text-foreground">
              {cert.verification_code.slice(0, 12)}…
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="hero"
            size="sm"
            onClick={onDownload}
            className="text-xs"
          >
            📄 تحميل PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onShare}
            className="text-xs"
          >
            🔗 مشاركة
          </Button>
        </div>
        <Link
          to="/certificates/$code"
          params={{ code: cert.verification_code }}
          className="text-xs text-primary font-semibold text-center mt-3 hover:underline"
        >
          عرض صفحة التحقق العامة ←
        </Link>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 bg-gradient-to-br from-muted/30 to-card rounded-3xl border border-border">
      <div className="text-7xl mb-4">🎓</div>
      <h2 className="text-2xl font-bold mb-2">لا توجد شهادات بعد</h2>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        أكمل أحد الكورسات بنسبة 100% أو اجتز اختباره النهائي للحصول على شهادتك
        المعتمدة الأولى!
      </p>
      <div className="flex gap-3 justify-center flex-wrap">
        <Button asChild variant="hero">
          <Link to="/courses">تصفّح الكورسات</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/my-courses">كورساتي الحالية</Link>
        </Button>
      </div>
    </div>
  );
}
