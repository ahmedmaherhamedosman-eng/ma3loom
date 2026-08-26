import { Facebook, Music2, Youtube } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const defaultSocialLinks = [
  {
    platform: "facebook",
    label: "فيسبوك",
    href: "https://www.facebook.com/people/%D9%85%D9%8E%D8%B9%D9%84%D9%8F%D9%88%D9%85-%D8%A7%D9%84%D8%AA%D8%B9%D9%84%D9%8A%D9%85%D9%8A%D8%A9/61592678940406/?rdid=zpQTm0J8hUEWSdKW&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F1AqyVbBk9s%2F",
    icon: Facebook,
  },
  {
    platform: "youtube",
    label: "يوتيوب",
    href: "https://www.youtube.com/@ma3looom",
    icon: Youtube,
  },
  {
    platform: "tiktok",
    label: "تيك توك",
    href: "https://www.tiktok.com/@ma3loom2026",
    icon: Music2,
  },
] as const;

export type SocialLink = (typeof defaultSocialLinks)[number];

export function useSocialLinks() {
  const [links, setLinks] = useState<SocialLink[]>([...defaultSocialLinks]);

  useEffect(() => {
    supabase.from("social_links").select("platform, url").then(({ data }) => {
      if (!data) return;
      const urls = new Map(data.map((item) => [item.platform, item.url]));
      setLinks(defaultSocialLinks.map((link) => ({ ...link, href: urls.get(link.platform) || link.href })));
    });
  }, []);

  return links.filter((link) => link.href.trim());
}