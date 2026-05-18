"use client";

import { MotionPage } from "@/lib/motion";

export default function OnboardingTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MotionPage>{children}</MotionPage>;
}
