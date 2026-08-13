import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Eye, CheckCircle2, XCircle, MessageSquareWarning, Trash2, Save, Sparkles, FileText, UserRound, Clock3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { statusLabel, type TeacherProfileRow } from "@/lib/teachers";
import { ImageUpload } from "@/components/ImageUpload";

export const Route = createFileRoute("/admin/teachers")({
  head: () => ({ meta: [{ title: "المعلمون — لوحة التحكم" }] }),
  component: AdminTeachersPage,
});

// Types
interface TeacherAdminRow extends TeacherProfileRow {
  email: string;
  phone: string;
  created_at: string;
  review_notes: string | null;
  decision_reason: string | null;
}

interface TeacherRequestRow extends TeacherProfileRow {
  email: string;
  phone: string;
  review_notes: string | null;
  decision_reason: string | null;
  created_at: string;
  terms_accepted: boolean;
  resume_url: string | null;
  certificates_urls: string[];
}

interface TeacherFormState {
  full_name: string;
  specialization: string;
  teaching_subject: string;
  years_experience: string;
  city: string;
  country: string;
  profile_image_url: string;
  bio_short: string;
  bio_full: string;
  badge: string;
  students_count: string;
  courses_count: string;
  rating_avg: string;
  rating_count: string;
  display_order: string;
  is_home_visible: boolean;
  email: string;
  phone: string;
}

interface EditableFields {
  full_name: string;
  specialization: string;
  teaching_subject: string;
  years_experience: string;
  city: string;
  country: string;
  profile_image_url: string;
  bio_full: string;
  is_home_visible: boolean;
  display_order: string;
  badge: string;
  students_count: string;
  courses_count: string;
  rating_avg: string;
  rating_count: string;
  bio_short: string;
}

type ActionKind = "approve" | "reject" | "request_changes";
type TabType = "requests" | "approved";
const STATUS_FILTERS = ["all", "pending", "under_review", "accepted", "needs_changes", "rejected"] as const;

const statusStyles: Record<string, string> = {
  pending: "border-amber-500/20 bg-amber-500/10 text-amber-700",
  under_review: "border-sky-500/20 bg-sky-500/10 text-sky-700",
  accepted: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
  rejected: "border-rose-500/20 bg-rose-500/10 text-rose-700",
  needs_changes: "border-orange-500/20 bg-orange-500/10 text-orange-700",
};

const emptyForm = (): TeacherFormState => ({
  full_name: "",
  specialization: "",
  teaching_subject: "",
  years_experience: "0",
  city: "الرياض",
  country: "السعودية",
  profile_image_url: "",
  bio_short: "",
  bio_full: "",
  badge: "",
  students_count: "0",
  courses_count: "0",
  rating_avg: "0",
  rating_count: "0",
  display_order: "1000",
  is_home_visible: true,
  email: "",
  phone: "",
});

function AdminTeachersPage() {
  const [activeTab, setActiveTab] = useState<TabType>("requests");
  const [requestRows, setRequestRows] = useState<TeacherRequestRow[]>([]);
  const [approvedTeachers, setApprovedTeachers] = useState<TeacherAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Requests tab state
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [editableRequest, setEditableRequest] = useState<EditableFields>({
    full_name: "",
    specialization: "",
    teaching_subject: "",
    years_experience: "0",
    city: "",
    country: "",
    profile_image_url: "",
    bio_full: "",
    is_home_visible: false,
    display_order: "1000",
    badge: "",
    students_count: "0",
    courses_count: "0",
    rating_avg: "0",
    rating_count: "0",
    bio_short: "",
  });

  // Approved teachers tab state
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [approvedForm, setApprovedForm] = useState<TeacherFormState>(emptyForm());

  const loadRequests = useCallback(async () => {
    const { data, error } = await supabase
      .from("teacher_applications")
      .select("id,full_name,specialization,teaching_subject,years_experience,bio_short,profile_image_url,badge,students_count,courses_count,rating_avg,rating_count,is_home_visible,display_order,status,city,country,availability,teaching_type,linkedin_url,youtube_url,intro_video_url,bio_full,email,phone,review_notes,decision_reason,created_at,terms_accepted,resume_url,certificates_urls")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("تعذّر تحميل الطلبات", { description: error.message });
      setRequestRows([]);
    } else {
      const mapped = (data as TeacherRequestRow[] | null) || [];
      setRequestRows(mapped);
      setSelectedRequestId((current) => {
        if (current && mapped.some((row) => row.id === current)) return current;
        return mapped[0]?.id || null;
      });
    }
  }, []);

  const loadApprovedTeachers = useCallback(async () => {
    const { data, error } = await supabase
      .from("teacher_applications")
      .select("id,full_name,specialization,teaching_subject,years_experience,bio_short,profile_image_url,badge,students_count,courses_count,rating_avg,rating_count,is_home_visible,display_order,status,city,country,availability,teaching_type,linkedin_url,youtube_url,intro_video_url,bio_full,email,phone,review_notes,decision_reason,created_at,terms_accepted,resume_url,certificates_urls")
      .eq("status", "accepted")
      .order("is_home_visible", { ascending: false })
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("تعذّر تحميل المدرسين", { description: error.message });
      setApprovedTeachers([]);
    } else {
      const mapped = (data as TeacherAdminRow[] | null) || [];
      setApprovedTeachers(mapped);
      setSelectedTeacherId((current) => {
        if (current && mapped.some((row) => row.id === current)) return current;
        return mapped[0]?.id || null;
      });
      if (mapped[0]) {
        setApprovedForm((prev) => ({ ...prev, display_order: String(mapped[0].display_order || 1000) }));
      }
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadRequests(), loadApprovedTeachers()]);
    setLoading(false);
  }, [loadRequests, loadApprovedTeachers]);

  useEffect(() => {
    void load();
  }, [load]);

  // ========== REQUESTS TAB FUNCTIONS ==========
  const filteredRows = useMemo(() => {
    if (statusFilter === "all") return requestRows;
    return requestRows.filter((r) => r.status === statusFilter);
  }, [requestRows, statusFilter]);

  const selectedRequest = useMemo(() => requestRows.find((r) => r.id === selectedRequestId) || null, [requestRows, selectedRequestId]);

  const statusStats = useMemo(() => {
    const counts = STATUS_FILTERS.filter((status) => status !== "all").reduce<Record<string, number>>((acc, status) => {
      acc[status] = requestRows.filter((row) => row.status === status).length;
      return acc;
    }, {});

    return [
      { label: "إجمالي الطلبات", value: requestRows.length, tone: "bg-primary/10 text-primary" },
      { label: "قيد الانتظار", value: counts.pending || 0, tone: "bg-amber-500/10 text-amber-700" },
      { label: "تحت المراجعة", value: counts.under_review || 0, tone: "bg-sky-500/10 text-sky-700" },
      { label: "بحاجة لتعديلات", value: counts.needs_changes || 0, tone: "bg-orange-500/10 text-orange-700" },
    ];
  }, [requestRows]);

  useEffect(() => {
    if (!selectedRequest) return;
    setDecisionReason(selectedRequest.decision_reason || "");
    setReviewNotes(selectedRequest.review_notes || "");
    setEditableRequest({
      full_name: selectedRequest.full_name || "",
      specialization: selectedRequest.specialization || "",
      teaching_subject: selectedRequest.teaching_subject || "",
      years_experience: String(selectedRequest.years_experience || 0),
      city: selectedRequest.city || "",
      country: selectedRequest.country || "",
      profile_image_url: selectedRequest.profile_image_url || "",
      bio_full: selectedRequest.bio_full || "",
      is_home_visible: selectedRequest.is_home_visible,
      display_order: String(selectedRequest.display_order || 1000),
      badge: selectedRequest.badge || "",
      students_count: String(selectedRequest.students_count || 0),
      courses_count: String(selectedRequest.courses_count || 0),
      rating_avg: String(selectedRequest.rating_avg || 0),
      rating_count: String(selectedRequest.rating_count || 0),
      bio_short: selectedRequest.bio_short || "",
    });
  }, [selectedRequest]);

  const runAction = async (action: ActionKind, targetId?: string) => {
    const requestId = targetId || selectedRequest?.id;
    if (!requestId) return;

    setSaving(true);
    const { error } = await supabase.functions.invoke("admin-process-teacher-application", {
      body: {
        applicationId: requestId,
        action,
        decisionReason,
        reviewNotes,
      },
    });

    if (error) {
      toast.error("تعذّرت العملية", { description: error.message });
    } else {
      toast.success("تم تنفيذ العملية بنجاح");
      await load();
    }
    setSaving(false);
  };

  const saveTeacherCardSettings = async () => {
    if (!selectedRequest) return;

    setSaving(true);
    const { error } = await supabase
      .from("teacher_applications")
      .update({
        full_name: editableRequest.full_name || null,
        specialization: editableRequest.specialization || null,
        teaching_subject: editableRequest.teaching_subject || null,
        years_experience: Number(editableRequest.years_experience) || 0,
        city: editableRequest.city || null,
        country: editableRequest.country || null,
        profile_image_url: editableRequest.profile_image_url || null,
        bio_full: editableRequest.bio_full || null,
        is_home_visible: editableRequest.is_home_visible,
        display_order: Number(editableRequest.display_order) || 1000,
        badge: editableRequest.badge || null,
        students_count: Number(editableRequest.students_count) || 0,
        courses_count: Number(editableRequest.courses_count) || 0,
        rating_avg: Number(editableRequest.rating_avg) || 0,
        rating_count: Number(editableRequest.rating_count) || 0,
        bio_short: editableRequest.bio_short || null,
        review_notes: reviewNotes || null,
        decision_reason: decisionReason || null,
      })
      .eq("id", selectedRequest.id);

    if (error) {
      toast.error("تعذّر حفظ إعدادات الظهور", { description: error.message });
    } else {
      toast.success("تم حفظ إعدادات الملف");
      await load();
    }

    setSaving(false);
  };

  const deleteRequest = async () => {
    if (!selectedRequest) return;
    if (!confirm("هل تريد حذف هذا الطلب نهائياً؟")) return;

    setSaving(true);
    const { error } = await supabase.from("teacher_applications").delete().eq("id", selectedRequest.id);
    if (error) {
      toast.error("تعذر حذف الطلب", { description: error.message });
    } else {
      toast.success("تم حذف الطلب");
      setSelectedRequestId(null);
      await load();
    }
    setSaving(false);
  };

  // ========== APPROVED TEACHERS TAB FUNCTIONS ==========
  const applySelection = (id: string | null) => {
    if (!id) {
      setSelectedTeacherId(null);
      setIsEditing(false);
      setApprovedForm(emptyForm());
      return;
    }

    const teacher = approvedTeachers.find((item) => item.id === id);
    if (!teacher) return;

    setSelectedTeacherId(id);
    setIsEditing(true);
    setApprovedForm({
      full_name: teacher.full_name || "",
      specialization: teacher.specialization || "",
      teaching_subject: teacher.teaching_subject || "",
      years_experience: String(teacher.years_experience || 0),
      city: teacher.city || "الرياض",
      country: teacher.country || "السعودية",
      profile_image_url: teacher.profile_image_url || "",
      bio_short: teacher.bio_short || "",
      bio_full: teacher.bio_full || "",
      badge: teacher.badge || "",
      students_count: String(teacher.students_count || 0),
      courses_count: String(teacher.courses_count || 0),
      rating_avg: String(teacher.rating_avg || 0),
      rating_count: String(teacher.rating_count || 0),
      display_order: String(teacher.display_order || 1000),
      is_home_visible: teacher.is_home_visible,
      email: teacher.email || "",
      phone: teacher.phone || "",
    });
  };

  useEffect(() => {
    if (!selectedTeacherId && approvedTeachers.length > 0) {
      applySelection(approvedTeachers[0].id);
    }
  }, [selectedTeacherId, approvedTeachers]);

  const resetApprovedForm = () => {
    setSelectedTeacherId(null);
    setIsEditing(false);
    setApprovedForm(emptyForm());
  };

  const handleSaveApproved = async () => {
    if (!approvedForm.full_name.trim() || !approvedForm.specialization.trim() || !approvedForm.teaching_subject.trim()) {
      toast.error("أدخل اسم المعلم والتخصص والمادة قبل الحفظ");
      return;
    }

    setSaving(true);

    const payload = {
      full_name: approvedForm.full_name || null,
      specialization: approvedForm.specialization || null,
      teaching_subject: approvedForm.teaching_subject || null,
      years_experience: Number(approvedForm.years_experience) || 0,
      city: approvedForm.city || "الرياض",
      country: approvedForm.country || "السعودية",
      profile_image_url: approvedForm.profile_image_url || null,
      bio_short: approvedForm.bio_short || null,
      bio_full: approvedForm.bio_full || null,
      badge: approvedForm.badge || null,
      students_count: Number(approvedForm.students_count) || 0,
      courses_count: Number(approvedForm.courses_count) || 0,
      rating_avg: Number(approvedForm.rating_avg) || 0,
      rating_count: Number(approvedForm.rating_count) || 0,
      display_order: Number(approvedForm.display_order) || 1000,
      is_home_visible: approvedForm.is_home_visible,
      email: approvedForm.email || null,
      phone: approvedForm.phone || null,
      status: "accepted",
      terms_accepted: true,
      education_level: "بكالوريوس",
      university: "غير محدد",
      teaching_type: "both",
      availability: "متاحة",
      certificates_urls: [],
    };

    const request = isEditing && selectedTeacherId
      ? supabase.from("teacher_applications").update(payload).eq("id", selectedTeacherId).select().single()
      : supabase.from("teacher_applications").insert(payload).select().single();

    const { data, error } = await request;

    if (error) {
      toast.error("تعذّر حفظ المعلم", { description: error.message });
      setSaving(false);
      return;
    }

    toast.success(isEditing ? "تم تحديث المعلم بنجاح" : "تمت إضافة المعلم إلى قسم النخبة");
    setSelectedTeacherId(data?.id || null);
    setIsEditing(Boolean(data?.id));
    await load();
    setSaving(false);
  };

  const handleDeleteApproved = async () => {
    if (!selectedTeacherId) return;
    if (!confirm("هل تريد حذف هذا المعلم من قسم النخبة؟")) return;

    setSaving(true);
    const { error } = await supabase.from("teacher_applications").delete().eq("id", selectedTeacherId);

    if (error) {
      toast.error("تعذّر حذف المعلم", { description: error.message });
      setSaving(false);
      return;
    }

    toast.success("تم حذف المعلم من القسم");
    resetApprovedForm();
    await load();
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-background to-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/15 p-2">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">المعلمون</h1>
            <p className="text-sm text-muted-foreground">إدارة موحدة لطلبات المعلمين والمدرسين المقبولين في منصة واحدة منظمة</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab("requests")}
          className={`px-4 py-3 font-semibold text-sm transition ${
            activeTab === "requests"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          📨 طلبات المعلمين ({requestRows.length})
        </button>
        <button
          onClick={() => setActiveTab("approved")}
          className={`px-4 py-3 font-semibold text-sm transition ${
            activeTab === "approved"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          ✅ المدرسون المقبولون ({approvedTeachers.length})
        </button>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">جاري تحميل البيانات...</div>
      ) : (
        <>
          {/* Requests Tab */}
          {activeTab === "requests" && (
            <RequestsTabContent
              statusStats={statusStats}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              filteredRows={filteredRows}
              selectedRequestId={selectedRequestId}
              setSelectedRequestId={setSelectedRequestId}
              selectedRequest={selectedRequest}
              decisionReason={decisionReason}
              setDecisionReason={setDecisionReason}
              reviewNotes={reviewNotes}
              setReviewNotes={setReviewNotes}
              editableRequest={editableRequest}
              setEditableRequest={setEditableRequest}
              saving={saving}
              onAction={runAction}
              onSave={saveTeacherCardSettings}
              onDelete={deleteRequest}
            />
          )}

          {/* Approved Teachers Tab */}
          {activeTab === "approved" && (
            <ApprovedTabContent
              approvedTeachers={approvedTeachers}
              selectedTeacherId={selectedTeacherId}
              isEditing={isEditing}
              approvedForm={approvedForm}
              setApprovedForm={setApprovedForm}
              saving={saving}
              onSelectTeacher={applySelection}
              onReset={resetApprovedForm}
              onSave={handleSaveApproved}
              onDelete={handleDeleteApproved}
            />
          )}
        </>
      )}
    </div>
  );
}

// ========== REQUESTS TAB COMPONENT ==========
interface RequestsTabContentProps {
  statusStats: Array<{ label: string; value: number; tone: string }>;
  statusFilter: (typeof STATUS_FILTERS)[number];
  setStatusFilter: (filter: (typeof STATUS_FILTERS)[number]) => void;
  filteredRows: TeacherRequestRow[];
  selectedRequestId: string | null;
  setSelectedRequestId: (id: string | null) => void;
  selectedRequest: TeacherRequestRow | null;
  decisionReason: string;
  setDecisionReason: (value: string) => void;
  reviewNotes: string;
  setReviewNotes: (value: string) => void;
  editableRequest: EditableFields;
  setEditableRequest: (value: EditableFields) => void;
  saving: boolean;
  onAction: (action: ActionKind, targetId?: string) => Promise<void>;
  onSave: () => Promise<void>;
  onDelete: () => Promise<void>;
}

function RequestsTabContent({
  statusStats,
  statusFilter,
  setStatusFilter,
  filteredRows,
  selectedRequestId,
  setSelectedRequestId,
  selectedRequest,
  decisionReason,
  setDecisionReason,
  reviewNotes,
  setReviewNotes,
  editableRequest,
  setEditableRequest,
  saving,
  onAction,
  onSave,
  onDelete,
}: RequestsTabContentProps) {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {statusStats.map((stat) => (
          <div key={stat.label} className={`rounded-2xl border border-border px-3 py-3 ${stat.tone}`}>
            <p className="text-xs font-medium opacity-80">{stat.label}</p>
            <p className="text-xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((status) => {
          const count = status === "all"
            ? filteredRows.length
            : filteredRows.filter((row) => row.status === status).length;
          return (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                statusFilter === status
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {status === "all" ? `الكل (${count})` : `${statusLabel[status] || status} (${count})`}
            </button>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid xl:grid-cols-[1.05fr_0.95fr] gap-6">
        {/* Left: Requests List */}
        <section className="rounded-2xl border border-border bg-card p-3">
          <div className="mb-3 flex items-center justify-between px-2">
            <div>
              <p className="font-semibold text-foreground">قائمة الطلبات</p>
              <p className="text-xs text-muted-foreground">اختر طلبًا لعرض التفاصيل وإجراء القرار المناسب.</p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
              {filteredRows.length} طلب
            </span>
          </div>

          {filteredRows.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">لا توجد طلبات في هذا التصنيف.</div>
          ) : (
            <div className="space-y-2">
              {filteredRows.map((row) => {
                const initials = `${row.full_name?.[0] || "م"}${row.full_name?.split(" ")[1]?.[0] || ""}`;
                return (
                  <div
                    key={row.id}
                    className={`rounded-xl border p-3 transition ${
                      selectedRequestId === row.id ? "border-primary/40 bg-primary/5" : "border-border bg-background/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button type="button" onClick={() => setSelectedRequestId(row.id)} className="flex-1 text-right">
                        <div className="flex items-center gap-2">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                            {initials}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{row.full_name}</p>
                            <p className="text-xs text-muted-foreground" dir="ltr">{row.email}</p>
                          </div>
                        </div>
                      </button>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                          statusStyles[row.status] || "border-border bg-muted text-muted-foreground"
                        }`}
                      >
                        {statusLabel[row.status] || row.status}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full bg-muted/70 px-2 py-1">{row.specialization || "غير محدد"}</span>
                      <span className="rounded-full bg-muted/70 px-2 py-1">{row.city || "غير محدد"}</span>
                      <span className="rounded-full bg-muted/70 px-2 py-1">{new Date(row.created_at).toLocaleDateString("ar-EG")}</span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedRequestId(row.id)} title="عرض">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedRequestId(row.id);
                          void onAction("approve", row.id);
                        }}
                        title="قبول"
                        disabled={saving}
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedRequestId(row.id);
                          void onAction("request_changes", row.id);
                        }}
                        title="طلب تعديلات"
                        disabled={saving}
                      >
                        <MessageSquareWarning className="h-4 w-4 text-sky-600" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedRequestId(row.id);
                          void onAction("reject", row.id);
                        }}
                        title="رفض"
                        disabled={saving}
                      >
                        <XCircle className="h-4 w-4 text-rose-600" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Right: Request Details */}
        <section className="rounded-2xl border border-border bg-card p-5">
          {!selectedRequest ? (
            <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-background/40 p-6 text-center text-sm text-muted-foreground">
              <UserRound className="mb-3 h-8 w-8 text-primary" />
              <p className="font-semibold text-foreground">اختر طلبًا لعرض التفاصيل</p>
              <p className="mt-1">ستظهر هنا معلومات الطلب والملاحظات والإعدادات المرتبطة بالمعلم.</p>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {/* Header */}
              <div className="rounded-2xl border border-border bg-background/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                        {selectedRequest.full_name?.[0] || "م"}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-foreground">{selectedRequest.full_name}</h2>
                        <p className="text-sm text-muted-foreground">
                          {selectedRequest.specialization || "غير محدد"} • {selectedRequest.teaching_subject || "غير محدد"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      statusStyles[selectedRequest.status] || "border-border bg-muted text-muted-foreground"
                    }`}
                  >
                    {statusLabel[selectedRequest.status] || selectedRequest.status}
                  </span>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid gap-3 sm:grid-cols-2">
                <Info label="البريد" value={selectedRequest.email} ltr />
                <Info label="الهاتف" value={selectedRequest.phone} ltr />
                <Info label="المدينة" value={`${selectedRequest.city || "غير محدد"}، ${selectedRequest.country || "غير محدد"}`} />
                <Info label="الخبرة" value={`${selectedRequest.years_experience} سنوات`} />
                <Info label="حالة الطلب" value={statusLabel[selectedRequest.status] || selectedRequest.status} />
                <Info label="وافق على الشروط" value={selectedRequest.terms_accepted ? "نعم" : "لا"} />
              </div>

              {/* Documents */}
              <div className="rounded-2xl border border-border bg-background/60 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-foreground">المستندات والملفات</h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedRequest.resume_url ? (
                    <a
                      href={selectedRequest.resume_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary hover:bg-primary/15"
                    >
                      عرض السيرة الذاتية
                    </a>
                  ) : (
                    <span className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">لا توجد سيرة ذاتية</span>
                  )}
                  {selectedRequest.certificates_urls?.length > 0 ? (
                    selectedRequest.certificates_urls.map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full bg-muted px-3 py-1 text-sm hover:bg-muted/80"
                      >
                        شهادة مرفقة
                      </a>
                    ))
                  ) : (
                    <span className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">لا توجد شهادات</span>
                  )}
                </div>
              </div>

              {/* Decision Fields */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 rounded-2xl border border-border bg-background/60 p-4">
                  <Label>ملاحظات الإدارة</Label>
                  <Textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} rows={3} />
                </div>

                <div className="space-y-2 rounded-2xl border border-border bg-background/60 p-4">
                  <Label>سبب القرار</Label>
                  <Input value={decisionReason} onChange={(e) => setDecisionReason(e.target.value)} />
                </div>
              </div>

              {/* Teacher Settings */}
              <div className="rounded-2xl border border-border p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">بيانات المعلم والظهور في الرئيسية</h3>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="اسم المعلم">
                    <Input
                      value={editableRequest.full_name}
                      onChange={(e) => setEditableRequest((p) => ({ ...p, full_name: e.target.value }))}
                    />
                  </Field>
                  <Field label="التخصص">
                    <Input
                      value={editableRequest.specialization}
                      onChange={(e) => setEditableRequest((p) => ({ ...p, specialization: e.target.value }))}
                    />
                  </Field>
                  <Field label="المادة/الموضوع">
                    <Input
                      value={editableRequest.teaching_subject}
                      onChange={(e) => setEditableRequest((p) => ({ ...p, teaching_subject: e.target.value }))}
                    />
                  </Field>
                  <NumberField
                    label="سنوات الخبرة"
                    value={editableRequest.years_experience}
                    onChange={(v) => setEditableRequest((p) => ({ ...p, years_experience: v }))}
                  />
                  <Field label="المدينة">
                    <Input
                      value={editableRequest.city}
                      onChange={(e) => setEditableRequest((p) => ({ ...p, city: e.target.value }))}
                    />
                  </Field>
                  <Field label="الدولة">
                    <Input
                      value={editableRequest.country}
                      onChange={(e) => setEditableRequest((p) => ({ ...p, country: e.target.value }))}
                    />
                  </Field>
                </div>

                <Field label="رابط الصورة الشخصية">
                  <Input
                    value={editableRequest.profile_image_url}
                    onChange={(e) => setEditableRequest((p) => ({ ...p, profile_image_url: e.target.value }))}
                    dir="ltr"
                    placeholder="https://..."
                  />
                </Field>

                <Field label="نبذة كاملة عن المعلم">
                  <Textarea
                    value={editableRequest.bio_full}
                    onChange={(e) => setEditableRequest((p) => ({ ...p, bio_full: e.target.value }))}
                    rows={3}
                  />
                </Field>

                <div className="flex items-start gap-2">
                  <Checkbox
                    id="is_home_visible"
                    checked={editableRequest.is_home_visible}
                    onCheckedChange={(checked) =>
                      setEditableRequest((prev) => ({ ...prev, is_home_visible: Boolean(checked) }))
                    }
                  />
                  <Label htmlFor="is_home_visible">إظهار المعلم في قسم نخبة المعلمين</Label>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <NumberField
                    label="ترتيب الظهور"
                    value={editableRequest.display_order}
                    onChange={(v) => setEditableRequest((p) => ({ ...p, display_order: v }))}
                  />
                  <Field label="شارة">
                    <select
                      value={editableRequest.badge}
                      onChange={(e) => setEditableRequest((p) => ({ ...p, badge: e.target.value }))}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">بدون شارة</option>
                      <option value="معلم متميز">معلم متميز</option>
                      <option value="الأكثر طلباً">الأكثر طلباً</option>
                      <option value="خبير معتمد">خبير معتمد</option>
                    </select>
                  </Field>
                  <NumberField
                    label="عدد الطلاب"
                    value={editableRequest.students_count}
                    onChange={(v) => setEditableRequest((p) => ({ ...p, students_count: v }))}
                  />
                  <NumberField
                    label="عدد الدورات"
                    value={editableRequest.courses_count}
                    onChange={(v) => setEditableRequest((p) => ({ ...p, courses_count: v }))}
                  />
                  <NumberField
                    label="متوسط التقييم"
                    value={editableRequest.rating_avg}
                    onChange={(v) => setEditableRequest((p) => ({ ...p, rating_avg: v }))}
                  />
                  <NumberField
                    label="عدد التقييمات"
                    value={editableRequest.rating_count}
                    onChange={(v) => setEditableRequest((p) => ({ ...p, rating_count: v }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>نبذة مختصرة للبطاقة</Label>
                  <Textarea
                    value={editableRequest.bio_short}
                    onChange={(e) => setEditableRequest((p) => ({ ...p, bio_short: e.target.value }))}
                    rows={2}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="hero" size="sm" onClick={onSave} disabled={saving}>
                    <Save className="h-4 w-4 ms-1" /> حفظ إعدادات الظهور
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => void onAction("approve")} disabled={saving}>
                    قبول + إنشاء حساب مدرس
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => void onAction("request_changes")} disabled={saving}>
                    طلب تعديلات
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void onAction("reject")}
                    disabled={saving}
                    className="text-destructive"
                  >
                    رفض
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={onDelete} disabled={saving} className="text-destructive">
                    <Trash2 className="h-4 w-4 ms-1" /> حذف
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </section>
      </div>
    </div>
  );
}

// ========== APPROVED TEACHERS TAB COMPONENT ==========
interface ApprovedTabContentProps {
  approvedTeachers: TeacherAdminRow[];
  selectedTeacherId: string | null;
  isEditing: boolean;
  approvedForm: TeacherFormState;
  setApprovedForm: (value: TeacherFormState) => void;
  saving: boolean;
  onSelectTeacher: (id: string | null) => void;
  onReset: () => void;
  onSave: () => Promise<void>;
  onDelete: () => Promise<void>;
}

function ApprovedTabContent({
  approvedTeachers,
  selectedTeacherId,
  isEditing,
  approvedForm,
  setApprovedForm,
  saving,
  onSelectTeacher,
  onReset,
  onSave,
  onDelete,
}: ApprovedTabContentProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        {/* Left: Teachers List */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-foreground">قائمة المعلمين النخبة</h2>
              <p className="text-xs text-muted-foreground">اختر معلمًا لتعديل بياناته أو تغيير ظهوره على الصفحة الرئيسية</p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{approvedTeachers.length} معلم</span>
          </div>

          {approvedTeachers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              لا توجد معلمين بعد. أضف أول معلم لظهر في الصفحة الرئيسية.
            </div>
          ) : (
            <div className="space-y-2">
              {approvedTeachers.map((teacher) => (
                <button
                  key={teacher.id}
                  type="button"
                  onClick={() => onSelectTeacher(teacher.id)}
                  className={`w-full rounded-xl border p-3 text-right transition ${
                    selectedTeacherId === teacher.id ? "border-primary/40 bg-primary/5" : "border-border bg-background/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{teacher.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {teacher.specialization || "غير محدد"} • {teacher.teaching_subject || "غير محدد"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        teacher.is_home_visible ? "bg-emerald-500/10 text-emerald-700" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {teacher.is_home_visible ? "ظاهر" : "مخفي"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Right: Edit Form */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-foreground">{isEditing ? "تعديل المعلم" : "إضافة معلم جديد"}</h2>
              <p className="text-xs text-muted-foreground">تظهر هذه البيانات في بطاقة المعلم على الصفحة الرئيسية</p>
            </div>
            {isEditing && (
              <Button variant="ghost" size="sm" onClick={onDelete} disabled={saving} className="text-destructive">
                حذف
              </Button>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="اسم المعلم">
              <Input value={approvedForm.full_name} onChange={(e) => setApprovedForm((prev) => ({ ...prev, full_name: e.target.value }))} />
            </Field>
            <Field label="البريد الإلكتروني">
              <Input
                value={approvedForm.email}
                onChange={(e) => setApprovedForm((prev) => ({ ...prev, email: e.target.value }))}
                dir="ltr"
                placeholder="name@example.com"
              />
            </Field>
            <Field label="التخصص">
              <Input
                value={approvedForm.specialization}
                onChange={(e) => setApprovedForm((prev) => ({ ...prev, specialization: e.target.value }))}
              />
            </Field>
            <Field label="المادة أو الموضوع">
              <Input
                value={approvedForm.teaching_subject}
                onChange={(e) => setApprovedForm((prev) => ({ ...prev, teaching_subject: e.target.value }))}
              />
            </Field>
            <Field label="الهاتف">
              <Input
                value={approvedForm.phone}
                onChange={(e) => setApprovedForm((prev) => ({ ...prev, phone: e.target.value }))}
                dir="ltr"
              />
            </Field>
            <NumberField
              label="سنوات الخبرة"
              value={approvedForm.years_experience}
              onChange={(value) => setApprovedForm((prev) => ({ ...prev, years_experience: value }))}
            />
            <Field label="المدينة">
              <Input value={approvedForm.city} onChange={(e) => setApprovedForm((prev) => ({ ...prev, city: e.target.value }))} />
            </Field>
            <Field label="الدولة">
              <Input value={approvedForm.country} onChange={(e) => setApprovedForm((prev) => ({ ...prev, country: e.target.value }))} />
            </Field>
            <Field label="صورة المعلم">
              <ImageUpload
                value={approvedForm.profile_image_url}
                onChange={(url) => setApprovedForm((prev) => ({ ...prev, profile_image_url: url }))}
                folder={`teacher-profiles/${selectedTeacherId || "new"}`}
              />
            </Field>
            <Field label="الشارة">
              <select
                value={approvedForm.badge}
                onChange={(e) => setApprovedForm((prev) => ({ ...prev, badge: e.target.value }))}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">بدون شارة</option>
                <option value="معلم متميز">معلم متميز</option>
                <option value="الأكثر طلباً">الأكثر طلباً</option>
                <option value="خبير معتمد">خبير معتمد</option>
              </select>
            </Field>
            <NumberField
              label="ترتيب الظهور"
              value={approvedForm.display_order}
              onChange={(value) => setApprovedForm((prev) => ({ ...prev, display_order: value }))}
            />
            <NumberField
              label="عدد الطلاب"
              value={approvedForm.students_count}
              onChange={(value) => setApprovedForm((prev) => ({ ...prev, students_count: value }))}
            />
            <NumberField
              label="عدد الدورات"
              value={approvedForm.courses_count}
              onChange={(value) => setApprovedForm((prev) => ({ ...prev, courses_count: value }))}
            />
            <NumberField
              label="متوسط التقييم"
              value={approvedForm.rating_avg}
              onChange={(value) => setApprovedForm((prev) => ({ ...prev, rating_avg: value }))}
            />
            <NumberField
              label="عدد التقييمات"
              value={approvedForm.rating_count}
              onChange={(value) => setApprovedForm((prev) => ({ ...prev, rating_count: value }))}
            />
          </div>

          <div className="mt-4 flex items-start gap-2">
            <Checkbox
              id="home-visible"
              checked={approvedForm.is_home_visible}
              onCheckedChange={(checked) => setApprovedForm((prev) => ({ ...prev, is_home_visible: Boolean(checked) }))}
            />
            <Label htmlFor="home-visible">إظهار المعلم في قسم المعلمون النخبة على الصفحة الرئيسية</Label>
          </div>

          <div className="mt-4 space-y-2">
            <Label>نبذة مختصرة</Label>
            <Textarea
              value={approvedForm.bio_short}
              onChange={(e) => setApprovedForm((prev) => ({ ...prev, bio_short: e.target.value }))}
              rows={2}
            />
          </div>

          <div className="mt-4 space-y-2">
            <Label>نبذة كاملة</Label>
            <Textarea
              value={approvedForm.bio_full}
              onChange={(e) => setApprovedForm((prev) => ({ ...prev, bio_full: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="hero" onClick={onSave} disabled={saving}>
              {isEditing ? "حفظ التعديلات" : "إضافة المعلم"}
            </Button>
            <Button variant="outline" onClick={onReset} disabled={saving}>
              إلغاء
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

// ========== HELPER COMPONENTS ==========
function Info({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-background/60 px-3 py-2.5">
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground" dir={ltr ? "ltr" : "rtl"}>
        {value}
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <Field label={label}>
      <Input value={value} onChange={(e) => onChange(e.target.value)} dir="ltr" inputMode="numeric" />
    </Field>
  );
}
