import { MessageCircle } from "lucide-react";

const WHATSAPP_NUMBER = "201060990370";

export function WhatsAppButton() {
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="تواصل معنا عبر واتساب"
      className="fixed bottom-6 left-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#FF7A00,#FF9A2F)] text-white shadow-[0_16px_40px_-12px_rgba(255,122,0,0.35)] transition-all duration-300 hover:scale-110 hover:shadow-[0_20px_46px_-12px_rgba(255,122,0,0.4)]"
    >
      <MessageCircle className="h-7 w-7" fill="currentColor" />
    </a>
  );
}
