"use client";

import type { ReactNode } from "react";
import { Reveal, RevealItem, RevealStagger } from "@/lib/motion";

export function SectionReveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <Reveal className={className} delay={delay} y={14}>
      {children}
    </Reveal>
  );
}

export function StaggerSections({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <RevealStagger className={className}>{children}</RevealStagger>;
}

export function StaggerSectionItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <RevealItem className={className}>{children}</RevealItem>;
}
