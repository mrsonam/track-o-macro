"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { modalBackdrop, modalPanel } from "@/lib/motion";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger = destructive red confirm button */
  variant?: "danger" | "neutral";
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  busy = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      cancelBtnRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!mounted) return null;

  const confirmClass =
    variant === "danger"
      ? "bg-red-600 text-white hover:bg-red-500 disabled:opacity-50"
      : "bg-[#171412] text-white hover:bg-black disabled:opacity-50";

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center"
          role="presentation"
        >
          <motion.button
            type="button"
            aria-label="Dismiss"
            disabled={busy}
            variants={modalBackdrop}
            initial="hidden"
            animate="show"
            exit="exit"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={() => {
              if (!busy) onCancel();
            }}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            variants={modalPanel}
            initial="hidden"
            animate="show"
            exit="exit"
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-black/10 bg-[#fbfaf5] shadow-[0_28px_80px_-36px_rgba(23,20,18,0.75)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-black/[0.06] px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
              <h2
                id={titleId}
                className="text-lg font-black tracking-tight text-[#171412]"
              >
                {title}
              </h2>
              {description ? (
                <div
                  id={descId}
                  className="mt-2 text-sm font-medium leading-relaxed text-zinc-600"
                >
                  {description}
                </div>
              ) : null}
            </div>
            <div className="flex flex-col-reverse gap-2 px-5 py-4 sm:flex-row sm:justify-end sm:gap-3 sm:px-6 sm:py-5">
              <button
                ref={cancelBtnRef}
                type="button"
                disabled={busy}
                onClick={onCancel}
                className="focus-ring tap-target motion-press rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-bold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onConfirm}
                className={`focus-ring tap-target motion-press rounded-xl px-4 py-2.5 text-sm font-bold ${confirmClass}`}
              >
                {busy ? "Please wait…" : confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
