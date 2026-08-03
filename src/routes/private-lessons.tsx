import { createFileRoute } from "@tanstack/react-router";
import PackagesSection from "@/components/PrivateLessonsSection";

export const Route = createFileRoute("/private-lessons")({
  head: () => ({ meta: [{ title: "الحصص الخصوصية — معلوم" }] }),
  component: function PrivateLessonsPage(){
    return <PackagesSection />
  }
})
