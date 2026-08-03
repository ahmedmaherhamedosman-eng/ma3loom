import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { BellRing, CheckCheck, Filter, Sparkles, Trash2 } from "lucide-react";

// Light "ding" using WebAudio — no asset needed
function playDing() {
  try {
    const audioWindow = window as Window & {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctx = audioWindow.AudioContext || audioWindow.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.18);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.42);
    setTimeout(() => ctx.close(), 600);
  } catch {
    /* ignore */
  }
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationInsertPayload {
  new: Notification;
}

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} د`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} س`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

function iconFor(type: string): string {
  if (type === "new_student") return "👨‍🎓";
  if (type === "low_rating") return "⚠️";
  return "🔔";
}

function labelForType(type: string): string {
  if (type === "new_student") return "طالب جديد";
  if (type === "low_rating") return "تقييم منخفض";
  return "عام";
}

export function AdminNotificationsBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("admin_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      setNotifications((data as Notification[]) || []);
    } finally {
      setLoading(false);
    }
  };

  const initialLoadedRef = useRef(false);

  useEffect(() => {
    load(true).then(() => {
      initialLoadedRef.current = true;
    });

    const channelName = `admin_notifications_changes_${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_notifications" },
        (payload: NotificationInsertPayload) => {
          // Only react after the initial fetch — avoids ding on first mount
          if (initialLoadedRef.current) {
            const n = payload.new as Notification;
            playDing();
            toast(n?.title || "إشعار جديد", {
              description: n?.message,
              action: n?.link
                ? {
                    label: "فتح",
                    onClick: () => navigate({ to: n.link! }),
                  }
                : undefined,
            });
          }
          void load(false);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "admin_notifications" },
        () => void load(false),
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "admin_notifications" },
        () => void load(false),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const visibleNotifications = useMemo(() => {
    if (!showOnlyUnread) return notifications;
    return notifications.filter((n) => !n.is_read);
  }, [notifications, showOnlyUnread]);

  const markAllRead = async () => {
    const ids = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (ids.length === 0) return;
    setNotifications((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, is_read: true } : n)));
    await supabase.from("admin_notifications").update({ is_read: true }).in("id", ids);
    await load(false);
  };

  const handleClick = async (n: Notification) => {
    if (!n.is_read) {
      setNotifications((prev) => prev.map((item) => (item.id === n.id ? { ...item, is_read: true } : item)));
      await supabase.from("admin_notifications").update({ is_read: true }).eq("id", n.id);
    }
    setOpen(false);
    if (n.link) navigate({ to: n.link });
    await load(false);
  };

  const handleDelete = async (e: MouseEvent, id: string) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((item) => item.id !== id));
    await supabase.from("admin_notifications").delete().eq("id", id);
    await load(false);
  };

  if (!mounted) {
    return (
      <div className="w-10 h-10 rounded-full flex items-center justify-center">
        <span className="text-xl">🔔</span>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
          aria-label="الإشعارات"
        >
          <span className="text-xl">🔔</span>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[92vw] max-w-sm p-0 border border-sky-100 shadow-2xl bg-white ring-1 ring-sky-50 rounded-2xl" side="bottom">
        <div className="border-b border-sky-100 bg-white px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-sky-700">الإشعارات</h3>
              <p className="text-xs text-sky-600">تابع أهم التحديثات والإجراءات الواردة</p>
            </div>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-auto py-1 text-xs" onClick={markAllRead}>
                <CheckCheck className="ml-1 h-3.5 w-3.5" />
                قراءة الكل
              </Button>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <Button
              type="button"
              variant={showOnlyUnread ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => setShowOnlyUnread((prev) => !prev)}
            >
              <Filter className="ml-1 h-3.5 w-3.5" />
              غير المقروءة فقط
            </Button>
            <span className="text-xs text-muted-foreground">{unreadCount} غير مقروءة</span>
          </div>
        </div>
        <ScrollArea className="h-[24rem] bg-white">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
              <Sparkles className="h-5 w-5 text-primary" />
              جاري تحميل الإشعارات...
            </div>
          ) : visibleNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
              <BellRing className="h-5 w-5" />
              {showOnlyUnread ? "لا توجد إشعارات غير مقروءة" : "لا توجد إشعارات حتى الآن"}
            </div>
          ) : (
            <div className="divide-y divide-border p-2">
              {visibleNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => void handleClick(n)}
                  className={`group rounded-xl border p-3 transition-colors ${
                    !n.is_read ? "border-primary/20 bg-primary/5" : "border-transparent bg-background hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-lg">
                      {iconFor(n.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground line-clamp-1">{n.title}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">{labelForType(n.type)}</p>
                        </div>
                        {!n.is_read && <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground line-clamp-2">{n.message}</p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-muted-foreground">{formatTime(n.created_at)}</span>
                        <button
                          onClick={(e) => void handleDelete(e, n.id)}
                          className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] text-destructive opacity-70 transition-opacity hover:bg-destructive/10 hover:opacity-100"
                        >
                          <Trash2 className="h-3 w-3" /> حذف
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
