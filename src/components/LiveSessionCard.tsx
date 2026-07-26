import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { computeTiming, formatCountdown, normalizeMeetingLink, platformInfo, statusLabel } from "@/lib/liveSession";

export interface LiveSessionCardData {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number | null;
  platform: string;
  meeting_link: string | null;
  instructor_name: string | null;
  is_free: boolean;
  price: number;
  max_seats: number | null;
  bookings_count: number;
  status: string;
  join_window_minutes: number;
  image_url: string | null;
}

interface Props {
  session: LiveSessionCardData;
  isBooked: boolean;
  bookingLoading?: boolean;
  onBook: () => void;
  onCancelBooking?: () => void;
}

export function LiveSessionCard({ session, isBooked, bookingLoading, onBook, onCancelBooking }: Props) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const timing = computeTiming(session.scheduled_at, session.duration_minutes, session.join_window_minutes, session.status);
  const platform = platformInfo[session.platform] || platformInfo.zoom;
  const date = new Date(session.scheduled_at);
  const url = normalizeMeetingLink(session.meeting_link);

  const seatsLeft = session.max_seats ? Math.max(0, session.max_seats - session.bookings_count) : null;
  const isFull = seatsLeft !== null && seatsLeft <= 0 && !isBooked;

  const statusBadgeClass =
    timing.status === "live"
      ? "bg-destructive/10 text-destructive animate-pulse"
      : timing.status === "ended"
      ? "bg-muted text-muted-foreground"
      : "bg-primary/10 text-primary";

  return (
    <article className="bg-card rounded-2xl border border-border overflow-hidden card-hover flex flex-col">
      {session.image_url && (
        <div className="aspect-video w-full overflow-hidden bg-muted">
          <img src={session.image_url} alt={session.title} className="w-full h-full object-cover" loading="lazy" />
        </div>
      )}
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${statusBadgeClass}`}>
            {timing.status === "live" && <span className="w-1.5 h-1.5 rounded-full bg-destructive" />}
            {statusLabel[timing.status]}
          </span>
          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${platform.color}`}>
            <span>{platform.icon}</span>
            <span>{platform.label}</span>
          </span>
          {session.is_free ? (
            <span className="inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full bg-success/10 text-success">مجاني</span>
          ) : (
            <span className="inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full bg-warm/10 text-warm">{session.price} ر.س</span>
          )}
        </div>

        <h3 className="font-bold text-lg text-card-foreground mb-1 line-clamp-2">{session.title}</h3>
        {session.instructor_name && (
          <p className="text-xs text-muted-foreground mb-2">👨‍🏫 {session.instructor_name}</p>
        )}
        {session.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{session.description}</p>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-4">
          <div className="flex items-center gap-1.5">
            📅 <span>{date.toLocaleDateString("ar-EG", { dateStyle: "medium" })}</span>
          </div>
          <div className="flex items-center gap-1.5">
            🕐 <span>{date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <div className="flex items-center gap-1.5">
            ⏱️ <span>{session.duration_minutes || 60} دقيقة</span>
          </div>
          {seatsLeft !== null && (
            <div className="flex items-center gap-1.5">
              👥 <span>{seatsLeft > 0 ? `${seatsLeft} مقاعد متاحة` : "مكتمل"}</span>
            </div>
          )}
        </div>

        {timing.status === "upcoming" && (
          <div className="bg-muted/50 rounded-lg px-3 py-2 mb-3 text-center">
            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">يبدأ خلال</div>
            <div className="text-sm font-bold text-foreground tabular-nums">{formatCountdown(timing.msUntilStart)}</div>
          </div>
        )}

        <div className="mt-auto space-y-2">
          {timing.status === "ended" ? (
            <Button variant="outline" size="sm" className="w-full" disabled>انتهت الحصة</Button>
          ) : isBooked ? (
            <>
              {timing.canJoin && url ? (
                <a href={url} target="_blank" rel="noopener noreferrer" className="block">
                  <Button variant="hero" size="sm" className="w-full">
                    {timing.status === "live" ? "🔴 انضم الآن" : "انضم للحصة"} {platform.icon}
                  </Button>
                </a>
              ) : (
                <Button variant="hero" size="sm" className="w-full" disabled>
                  ✅ محجوز — الانضمام قبل {session.join_window_minutes} دقيقة
                </Button>
              )}
              {onCancelBooking && timing.status === "upcoming" && (
                <button onClick={onCancelBooking} className="text-xs text-muted-foreground hover:text-destructive w-full">
                  إلغاء الحجز
                </button>
              )}
            </>
          ) : isFull ? (
            <Button variant="outline" size="sm" className="w-full" disabled>المقاعد مكتملة</Button>
          ) : (
            <Button variant="hero" size="sm" className="w-full" onClick={onBook} disabled={bookingLoading}>
              {bookingLoading ? "جاري..." : session.is_free ? "احجز الآن (مجاني)" : `احجز الآن — ${session.price} ر.س`}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
