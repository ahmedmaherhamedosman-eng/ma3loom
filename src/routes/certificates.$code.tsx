import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { downloadCertificatePDF, generateQRDataUrl } from "@/lib/certificate";
import { toast } from "sonner";

export const Route = createFileRoute("/certificates/$code")({
  head: ({ params }) => ({
    meta: [
      { title: "التحقق من الشهادة — معلوم" },
      {
        name: "description",
        content: `تحقق من صحة الشهادة برقم ${params.code} الصادرة عن منصة معلوم التعليمية`,
      },
      { property: "og:title", content: "شهادة معتمدة — منصة معلوم" },
      {
        property: "og:description",
        content: "شهادة إتمام كورس معتمدة من منصة معلوم التعليمية",
      },
    ],
  }),
  component: VerifyCertificate,
});

interface CertInfo {
  id: string;
  user_id: string;
  course_id: string;
  issued_at: string;
  verification_code: string;
  quiz_score: number | null;
  studentName: string;
  courseTitle: string;
  instructor: string;
  level: string;
}

function VerifyCertificate() {
  const { code } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<CertInfo | null>(null);
  const [qrUrl, setQrUrl] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      const { data: cert } = await supabase
        .from("certificates")
        .select("*")
        .eq("verification_code", code)
        .maybeSingle();
      if (!cert) {
        setLoading(false);
        return;
      }
      const [{ data: profile }, { data: course }, qr] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", cert.user_id)
          .maybeSingle(),
        supabase
          .from("courses")
          .select("title, instructor, level")
          .eq("id", cert.course_id)
          .maybeSingle(),
        generateQRDataUrl(code).catch(() => ""),
      ]);
      setInfo({
        ...cert,
        studentName: profile?.full_name || "طالب",
        courseTitle: course?.title || "كورس",
        instructor: course?.instructor || "—",
        level: course?.level || "",
      });
      setQrUrl(qr);
      setLoading(false);
    };
    load();
  }, [code]);

  const handleDownload = async () => {
    if (!info) return;
    try {
      await downloadCertificatePDF({
        studentName: info.studentName,
        courseTitle: info.courseTitle,
        instructor: info.instructor,
        issuedAt: info.issued_at,
        verificationCode: info.verification_code,
        quizScore: info.quiz_score,
        level: info.level,
      });
    } catch {
      toast.error("تعذّر إنشاء ملف PDF");
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(window.location.href);
    toast.success("تم نسخ رابط الشهادة");
  };

  if (loading) {
    return (
      <div className="container py-12 max-w-2xl">
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (!info) {
    return (
      <div className="container py-20 text-center max-w-xl">
        <div className="text-6xl mb-4">❌</div>
        <h1 className="text-3xl font-bold mb-3">شهادة غير صالحة</h1>
        <p className="text-muted-foreground mb-2">
          الكود <code className="bg-muted px-2 py-1 rounded font-mono text-sm">{code}</code>
        </p>
        <p className="text-muted-foreground mb-6">
          غير موجود في سجلاتنا. تأكد من نسخ الكود بالكامل.
        </p>
        <Button asChild variant="hero">
          <Link to="/">العودة للرئيسية</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-8 md:py-12 max-w-3xl">
      {/* Verified banner */}
      <div className="rounded-2xl border-2 border-success bg-gradient-to-r from-success/10 to-success/5 p-5 md:p-6 mb-6 text-center">
        <div className="text-5xl mb-2">✅</div>
        <h1 className="text-2xl font-bold text-success mb-1">
          شهادة صالحة ومُعتمَدة
        </h1>
        <p className="text-sm text-success/80">
          تم إصدارها من قِبل منصة معلوم التعليمية
        </p>
      </div>

      {/* Certificate preview card */}
      <div className="rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-card via-primary/5 to-warm/5 overflow-hidden shadow-xl">
        {/* Header strip */}
        <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-4 text-center">
          <p className="text-xs uppercase tracking-widest text-primary-foreground/80 font-bold">
            Certificate of Completion
          </p>
          <p className="text-primary-foreground font-extrabold text-lg">
            شهادة إتمام كورس
          </p>
        </div>

        <div className="p-6 md:p-8">
          {/* Student name */}
          <div className="text-center mb-6">
            <p className="text-sm text-muted-foreground mb-2">يُمنَح هذه الشهادة إلى</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-primary mb-1">
              {info.studentName}
            </h2>
            <div className="h-0.5 w-32 bg-warm mx-auto mt-2" />
          </div>

          {/* Course */}
          <div className="text-center mb-6">
            <p className="text-sm text-muted-foreground mb-2">
              لإتمامه بنجاح كورس
            </p>
            <h3 className="text-xl md:text-2xl font-bold text-foreground">
              "{info.courseTitle}"
            </h3>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            <MetaCell label="المدرّب" value={info.instructor} icon="👨‍🏫" />
            <MetaCell
              label="تاريخ الإصدار"
              value={new Date(info.issued_at).toLocaleDateString("ar-EG", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              icon="📅"
            />
            {info.level && (
              <MetaCell label="المستوى" value={info.level} icon="🎯" />
            )}
            {info.quiz_score !== null && (
              <MetaCell
                label="درجة الاختبار"
                value={`${info.quiz_score}%`}
                icon="📊"
                highlight
              />
            )}
          </div>

          {/* QR + verification */}
          <div className="flex flex-col md:flex-row gap-4 items-center bg-muted/30 rounded-xl p-4">
            {qrUrl && (
              <img
                src={qrUrl}
                alt="QR Code للتحقق"
                className="w-24 h-24 rounded-lg border border-border bg-white p-1"
              />
            )}
            <div className="flex-1 text-center md:text-start">
              <p className="text-xs text-muted-foreground mb-1">كود التحقق</p>
              <p className="font-mono text-sm font-bold text-foreground break-all mb-2">
                {info.verification_code}
              </p>
              <p className="text-xs text-muted-foreground">
                امسح رمز QR أو شارك رابط هذه الصفحة للتحقق من صحة الشهادة
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
        <Button variant="hero" size="lg" onClick={handleDownload}>
          📄 تحميل الشهادة PDF
        </Button>
        <Button variant="outline" size="lg" onClick={handleCopy}>
          🔗 نسخ رابط التحقق
        </Button>
      </div>

      <div className="text-center mt-6">
        <Link
          to="/"
          className="text-sm text-muted-foreground hover:text-primary"
        >
          ← العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}

function MetaCell({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  icon: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-3 border ${
        highlight
          ? "border-success/30 bg-success/10"
          : "border-border bg-muted/30"
      }`}
    >
      <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <p
        className={`font-bold text-sm ${
          highlight ? "text-success" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
