import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import PackagesSection from "@/components/PrivateLessonsSection";

export const Route = createFileRoute("/private-lessons")({
  head: () => ({ meta: [{ title: "الحصص الخصوصية — معلوم" }] }),
  component: function PrivateLessonsPage(){
    const isIndexRoute = useRouterState({
      select: (state) => state.location.pathname === '/private-lessons',
    })

    return isIndexRoute ? <PackagesSection /> : <Outlet />
  }
})
