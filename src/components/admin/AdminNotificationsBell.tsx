import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

// Light "ding" using WebAudio — no asset needed
function playDing() {
  try {
    const audioWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
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

export function AdminNotificationsBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

  const load = async () => {
    const { data } = await supabase
      .from("admin_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    setNotifications((data as Notification[]) || []);
  };

  const initialLoadedRef = useRef(false);

  useEffect(() => {
    load().then(() => {
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
          load();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "admin_notifications" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "admin_notifications" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    const ids = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (ids.length === 0) return;
    await supabase.from("admin_notifications").update({ is_read: true }).in("id", ids);
    load();
  };

  const handleClick = async (n: Notification) => {
    if (!n.is_read) {
      await supabase.from("admin_notifications").update({ is_read: true }).eq("id", n.id);
    }
    setOpen(false);
    if (n.link) navigate({ to: n.link });
    load();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await supabase.from("admin_notifications").delete().eq("id", id);
    load();
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
      <PopoverContent align="end" className="w-80 p-0" side="bottom">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-bold text-sm text-foreground">الإشعارات</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-auto py-1" onClick={markAllRead}>
              تحديد الكل كمقروء
            </Button>
          )}
        </div>
        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              لا توجد إشعارات
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`group p-3 cursor-pointer hover:bg-muted/50 transition-colors flex gap-3 ${
                    !n.is_read ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="text-xl shrink-0">{iconFor(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground line-clamp-1">{n.title}</p>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-muted-foreground">{formatTime(n.created_at)}</span>
                      <button
                        onClick={(e) => handleDelete(e, n.id)}
                        className="text-[10px] text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        حذف
                      </button>
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
