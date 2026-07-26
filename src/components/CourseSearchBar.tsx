import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

interface Props {
  value: string;
  onDebouncedChange: (value: string) => void;
  placeholder?: string;
  delay?: number;
}

export function CourseSearchBar({ value, onDebouncedChange, placeholder = "ابحث عن كورس...", delay = 300 }: Props) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (local !== value) onDebouncedChange(local);
    }, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  return (
    <div className="relative">
      <svg
        className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <Input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className="pe-10 h-11 rounded-xl text-base"
      />
    </div>
  );
}
