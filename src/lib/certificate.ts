import jsPDF from "jspdf";
import QRCode from "qrcode";

export interface CertificateData {
  studentName: string;
  courseTitle: string;
  instructor: string;
  issuedAt: string; // ISO
  verificationCode: string;
  quizScore?: number | null;
  durationMinutes?: number | null;
  level?: string | null;
}

const formatArabicDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
};

const getBaseUrl = () => {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return import.meta.env.VITE_PUBLIC_SITE_URL || "http://localhost:5173";
};

const verifyUrl = (code: string) => `${getBaseUrl()}/certificates/${code}`;

export async function generateCertificatePDF(
  data: CertificateData
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // ============ Background — clean white ============
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, H, "F");

  // ============ Subtle accent bars ============
  // Top thin accent (deep blue)
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, W, 3, "F");
  // Bottom thin accent (gold)
  doc.setFillColor(202, 138, 4);
  doc.rect(0, H - 3, W, 3, "F");

  // ============ Inner thin border ============
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.rect(12, 12, W - 24, H - 24);

  // ============ Brand mark (top-left) ============
  doc.setFillColor(30, 58, 138);
  doc.circle(28, 28, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("M", 28, 30.5, { align: "center" });

  doc.setTextColor(30, 58, 138);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("MA3LOOM", 38, 26);
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Educational Platform", 38, 31);

  // ============ Title ============
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(34);
  doc.text("Certificate of Completion", W / 2, 58, { align: "center" });

  // Decorative line under title
  doc.setDrawColor(202, 138, 4);
  doc.setLineWidth(0.8);
  doc.line(W / 2 - 30, 64, W / 2 + 30, 64);

  // ============ Body ============
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("This certificate is proudly presented to", W / 2, 78, {
    align: "center",
  });

  // ============ Student name ============
  doc.setTextColor(30, 58, 138);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(34);
  doc.text(data.studentName || "Student", W / 2, 96, { align: "center" });

  // Underline under name
  doc.setDrawColor(202, 138, 4);
  doc.setLineWidth(0.3);
  const nameWidth = Math.min(140, W - 80);
  doc.line((W - nameWidth) / 2, 100, (W + nameWidth) / 2, 100);

  // ============ Course title ============
  doc.setTextColor(71, 85, 105);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("for successfully completing the course", W / 2, 112, {
    align: "center",
  });

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  const courseLines = doc.splitTextToSize(`"${data.courseTitle}"`, W - 100);
  doc.text(courseLines, W / 2, 124, { align: "center" });

  // ============ Meta row (level / duration / score) ============
  const metaItems: string[] = [];
  if (data.level) metaItems.push(`Level: ${data.level}`);
  if (data.durationMinutes && data.durationMinutes > 0) {
    const hrs = Math.round((data.durationMinutes / 60) * 10) / 10;
    metaItems.push(`Duration: ${hrs}h`);
  }
  if (typeof data.quizScore === "number") {
    metaItems.push(`Score: ${data.quizScore}%`);
  }
  if (metaItems.length > 0) {
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(metaItems.join("    •    "), W / 2, 144, { align: "center" });
  }

  // ============ QR Code (bottom-left) ============
  try {
    const qrDataUrl = await QRCode.toDataURL(verifyUrl(data.verificationCode), {
      width: 200,
      margin: 0,
      color: { dark: "#1e3a8a", light: "#ffffff" },
    });
    doc.addImage(qrDataUrl, "PNG", 22, H - 48, 28, 28);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("Scan to verify", 36, H - 16, { align: "center" });
  } catch {
    // QR generation failed — silent fallback
  }

  // ============ Footer: instructor + date ============
  const footerY = H - 32;

  // Instructor (center)
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(W / 2 - 30, footerY, W / 2 + 30, footerY);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(data.instructor || "Instructor", W / 2, footerY + 6, {
    align: "center",
  });
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Instructor", W / 2, footerY + 11, { align: "center" });

  // Date (right)
  doc.setDrawColor(148, 163, 184);
  doc.line(W - 70, footerY, W - 22, footerY);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(formatArabicDate(data.issuedAt), W - 46, footerY + 6, {
    align: "center",
  });
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Issue Date", W - 46, footerY + 11, { align: "center" });

  // ============ Verification code (bottom center) ============
  doc.setTextColor(148, 163, 184);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(
    `Verification Code: ${data.verificationCode}`,
    W / 2,
    H - 8,
    { align: "center" }
  );

  return doc;
}

export async function downloadCertificatePDF(data: CertificateData) {
  const doc = await generateCertificatePDF(data);
  const safeTitle = data.courseTitle
    .replace(/[^a-zA-Z0-9\u0600-\u06FF]+/g, "_")
    .slice(0, 40);
  doc.save(`Certificate_${safeTitle}_${data.verificationCode.slice(0, 8)}.pdf`);
}

export async function generateQRDataUrl(code: string): Promise<string> {
  return QRCode.toDataURL(verifyUrl(code), {
    width: 220,
    margin: 1,
    color: { dark: "#1e3a8a", light: "#ffffff" },
  });
}

export const getVerifyUrl = verifyUrl;
