import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Reply, Trash2, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

interface CommentRow {
  id: string;
  content: string;
  user_id: string;
  parent_id: string | null;
  is_instructor_reply: boolean;
  created_at: string;
}

interface ProfileLite {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

interface CommentNode extends CommentRow {
  author?: ProfileLite;
  replies: CommentNode[];
}

interface Props {
  lessonId: string;
  courseId: string;
  userId: string | null;
  isAdmin: boolean;
  isEnrolled: boolean;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  const d = Math.floor(h / 24);
  if (d < 30) return `منذ ${d} يوم`;
  return new Date(iso).toLocaleDateString("ar-EG");
}

function initials(name: string) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "?";
}

export function LessonComments({ lessonId, courseId, userId, isAdmin, isEnrolled }: Props) {
  const [comments, setComments] = useState<CommentNode[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const loadComments = async () => {
    setLoading(true);
    const { data: rows, error } = await supabase
      .from("lesson_comments")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("تعذر تحميل التعليقات");
      setLoading(false);
      return;
    }

    const list = (rows || []) as CommentRow[];
    const userIds = Array.from(new Set(list.map((c) => c.user_id)));

    let profilesMap: Record<string, ProfileLite> = {};
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);
      (profs || []).forEach((p) => {
        profilesMap[p.user_id] = p as ProfileLite;
      });
    }
    setProfiles(profilesMap);

    // Build tree
    const map = new Map<string, CommentNode>();
    list.forEach((c) => map.set(c.id, { ...c, author: profilesMap[c.user_id], replies: [] }));
    const roots: CommentNode[] = [];
    list.forEach((c) => {
      const node = map.get(c.id)!;
      if (c.parent_id && map.has(c.parent_id)) {
        map.get(c.parent_id)!.replies.push(node);
      } else {
        roots.push(node);
      }
    });
    // Newest roots first
    roots.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    setComments(roots);
    setLoading(false);
  };

  useEffect(() => {
    loadComments();

    // Realtime subscription — refresh on any insert/update/delete for this lesson
    const channel = supabase
      .channel(`lesson_comments:${lessonId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lesson_comments",
          filter: `lesson_id=eq.${lessonId}`,
        },
        () => {
          loadComments();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  const canPost = !!userId && (isAdmin || isEnrolled);

  const post = async (content: string, parentId: string | null) => {
    if (!userId) {
      toast.error("يجب تسجيل الدخول أولاً");
      return false;
    }
    const trimmed = content.trim();
    if (!trimmed) return false;
    if (trimmed.length > 2000) {
      toast.error("التعليق طويل جداً (الحد 2000 حرف)");
      return false;
    }
    setSubmitting(true);
    const { error } = await supabase.from("lesson_comments").insert({
      lesson_id: lessonId,
      course_id: courseId,
      user_id: userId,
      parent_id: parentId,
      content: trimmed,
      is_instructor_reply: isAdmin,
    });
    setSubmitting(false);
    if (error) {
      toast.error("تعذر إرسال التعليق");
      return false;
    }
    toast.success(isAdmin && parentId ? "تم إرسال رد المدرّس" : "تم إرسال تعليقك");
    await loadComments();
    return true;
  };

  const handleSubmitNew = async () => {
    const ok = await post(newContent, null);
    if (ok) setNewContent("");
  };

  const handleSubmitReply = async (parentId: string) => {
    const ok = await post(replyContent, parentId);
    if (ok) {
      setReplyContent("");
      setReplyTo(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل تريد حذف هذا التعليق؟")) return;
    const { error } = await supabase.from("lesson_comments").delete().eq("id", id);
    if (error) {
      toast.error("تعذر الحذف");
      return;
    }
    toast.success("تم الحذف");
    await loadComments();
  };

  const renderComment = (c: CommentNode, depth = 0) => {
    const name = c.author?.full_name?.trim() || "مستخدم";
    const canDelete = userId && (c.user_id === userId || isAdmin);
    return (
      <div key={c.id} className={`${depth > 0 ? "ms-10 mt-3" : "mt-4"}`}>
        <div
          className={`rounded-xl border p-4 ${
            c.is_instructor_reply
              ? "bg-primary/5 border-primary/30"
              : "bg-card border-border"
          }`}
        >
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback className={c.is_instructor_reply ? "bg-primary text-primary-foreground" : ""}>
                {initials(name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-semibold text-foreground">{name}</span>
                {c.is_instructor_reply && (
                  <Badge variant="default" className="gap-1 text-xs">
                    <ShieldCheck size={12} /> رد المدرّس
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">{timeAgo(c.created_at)}</span>
              </div>
              <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                {c.content}
              </p>
              <div className="flex items-center gap-2 mt-2">
                {canPost && depth === 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1"
                    onClick={() => {
                      setReplyTo(replyTo === c.id ? null : c.id);
                      setReplyContent("");
                    }}
                  >
                    <Reply size={12} /> رد
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(c.id)}
                  >
                    <Trash2 size={12} /> حذف
                  </Button>
                )}
              </div>

              {replyTo === c.id && (
                <div className="mt-3 space-y-2">
                  <Textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder={isAdmin ? "اكتب رد المدرّس..." : "اكتب ردك..."}
                    rows={2}
                    maxLength={2000}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSubmitReply(c.id)}
                      disabled={submitting || !replyContent.trim()}
                      className="gap-1"
                    >
                      <Send size={12} /> إرسال
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setReplyTo(null);
                        setReplyContent("");
                      }}
                    >
                      إلغاء
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {c.replies.length > 0 && (
          <div className="mt-1">
            {c.replies
              .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))
              .map((r) => renderComment(r, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5 mb-6">
      <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
        <MessageCircle size={18} /> التعليقات والنقاش
        <span className="text-sm font-normal text-muted-foreground">
          ({comments.reduce((acc, c) => acc + 1 + c.replies.length, 0)})
        </span>
      </h3>

      {/* New comment box */}
      {canPost ? (
        <div className="mb-4 space-y-2">
          <Textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder={isAdmin ? "اكتب تعليق المدرّس..." : "شاركنا سؤالك أو ملاحظتك على الدرس..."}
            rows={3}
            maxLength={2000}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">{newContent.length}/2000</span>
            <Button
              onClick={handleSubmitNew}
              disabled={submitting || !newContent.trim()}
              className="gap-2"
            >
              <Send size={14} /> {submitting ? "جارٍ الإرسال..." : "إرسال التعليق"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mb-4 p-4 rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">
          {!userId ? (
            <>
              <Link to="/login" className="text-primary font-medium hover:underline">
                سجّل الدخول
              </Link>{" "}
              للمشاركة في النقاش
            </>
          ) : (
            "يجب التسجيل في الكورس للتعليق"
          )}
        </div>
      )}

      {/* Comments list */}
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-6">جارٍ التحميل...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          لا توجد تعليقات بعد. كن أول من يعلق!
        </p>
      ) : (
        <div>{comments.map((c) => renderComment(c))}</div>
      )}
    </div>
  );
}
