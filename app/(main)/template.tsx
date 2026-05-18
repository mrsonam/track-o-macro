"use client";

import { MotionPage } from "@/lib/motion";

export default function MainRouteTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MotionPage>{children}</MotionPage>;
}
