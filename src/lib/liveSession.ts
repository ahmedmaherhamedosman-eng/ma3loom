// Helpers for live sessions

export interface LiveSessionTiming {
  status: "upcoming" | "live" | "ended";
  /** Whether the meeting Join button should be active right now */
  canJoin: boolean;
  /** ms until session start (negative if started) */
  msUntilStart: number;
  /** ms until session end (negative if ended) */
  msUntilEnd: number;
}

export function computeTiming(
  scheduledAt: string,
  durationMinutes: number | null,
  joinWindowMinutes: number = 15,
  status?: string
): LiveSessionTiming {
  const now = Date.now();
  const start = new Date(scheduledAt).getTime();
  const duration = (durationMinutes || 60) * 60 * 1000;
  const end = start + duration;
  const msUntilStart = start - now;
  const msUntilEnd = end - now;

  // Manual override
  if (status === "completed" || status === "cancelled") {
    return { status: "ended", canJoin: false, msUntilStart, msUntilEnd };
  }
  if (status === "live") {
    return { status: "live", canJoin: true, msUntilStart, msUntilEnd };
  }

  if (now > end) {
    return { status: "ended", canJoin: false, msUntilStart, msUntilEnd };
  }
  if (now >= start) {
    return { status: "live", canJoin: true, msUntilStart, msUntilEnd };
  }
  // upcoming — allow join inside the join window
  const canJoin = msUntilStart <= joinWindowMinutes * 60 * 1000;
  return { status: "upcoming", canJoin, msUntilStart, msUntilEnd };
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return "بدأت الآن";
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (days > 0) return `${days}ي ${hours}س`;
  if (hours > 0) return `${hours}س ${minutes}د`;
  if (minutes > 0) return `${minutes}د ${seconds}ث`;
  return `${seconds}ث`;
}

export function normalizeMeetingLink(link: string | null | undefined): string | null {
  if (!link) return null;
  const t = link.trim();
  if (!t) return null;
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

export const platformInfo: Record<string, { label: string; icon: string; color: string }> = {
  zoom: { label: "Zoom", icon: "🎥", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  teams: { label: "Microsoft Teams", icon: "💼", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  google_meet: { label: "Google Meet", icon: "📹", color: "bg-green-500/10 text-green-600 dark:text-green-400" },
};

export const statusLabel: Record<string, string> = {
  upcoming: "قادمة",
  live: "مباشرة الآن",
  ended: "انتهت",
};
