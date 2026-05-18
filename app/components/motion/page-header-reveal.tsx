"use client";

import type { ReactNode } from "react";
import { Reveal } from "@/lib/motion";

/** Page title block with scroll/mount reveal */
export function PageHeaderReveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Reveal className={className} y={12} amount={0.4}>
      {children}
    </Reveal>
  );
}
