import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/courses/")({
  component: CourseLayout,
});

function CourseLayout() {
  return <Outlet />;
}
