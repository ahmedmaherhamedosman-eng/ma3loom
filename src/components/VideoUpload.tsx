import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface VideoUploadProps {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
}

export function VideoUpload({ value, onChange, folder = "lessons" }: VideoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isYouTube = value && /(?:youtu\.be\/|youtube\.com\/)/i.test(value);
  const isUploaded = value && value.includes("/lesson-videos/");

  const handleFile = async (file: File) => {
    setError(null);

    if (!file.type.startsWith("video/")) {
      setError("الملف يجب أن يكون فيديو (MP4, WebM, MOV)");
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      setError("حجم الفيديو يجب أن يكون أقل من 500 ميجا");
      return;
    }

    setUploading(true);
    setProgress(10);
    try {
      const ext = file.name.split(".").pop() || "mp4";
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      setProgress(40);
      const { error: upErr } = await supabase.storage
        .from("lesson-videos")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (upErr) throw upErr;
      setProgress(90);

      const { data } = supabase.storage.from("lesson-videos").getPublicUrl(fileName);
      onChange(data.publicUrl);
      setProgress(100);
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل رفع الفيديو");
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 800);
    }
  };

  return (
    <div className="space-y-3">
      {value && (
        <div className="rounded-lg border border-border p-3 bg-muted/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              {isYouTube ? "🎬 رابط يوتيوب" : isUploaded ? "📹 فيديو مرفوع" : "🔗 رابط فيديو"}
            </span>
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-destructive text-sm hover:underline"
            >
              حذف
            </button>
          </div>
          {isUploaded && (
            <video src={value} controls className="w-full max-h-48 rounded-md bg-black" />
          )}
          <p className="text-xs text-muted-foreground mt-2 truncate" dir="ltr">{value}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm,video/ogg,video/quicktime"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? `جاري الرفع... ${progress}%` : "📁 رفع فيديو من الجهاز"}
        </Button>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="أو الصق رابط يوتيوب / Vimeo / MP4"
          dir="ltr"
          className="flex-1"
          disabled={uploading}
        />
      </div>

      {uploading && (
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full gradient-hero transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        💡 يمكنك رفع فيديو من جهازك (حتى 500 ميجا) أو لصق رابط يوتيوب
      </p>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
