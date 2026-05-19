"use client";

import { useId, useRef, type ReactNode } from "react";
import { ResponsiveOverlay } from "@/app/components/responsive-overlay";

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
  const titleId = useId();
  const descId = useId();
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  const confirmClass =
    variant === "danger"
      ? "bg-red-600 text-white hover:bg-red-500 disabled:opacity-50"
      : "bg-[#171412] text-white hover:bg-black disabled:opacity-50";

  return (
    <ResponsiveOverlay
      open={open}
      onClose={onCancel}
      busy={busy}
      ariaLabelledBy={titleId}
      ariaDescribedBy={description ? descId : undefined}
      initialFocusRef={cancelBtnRef}
      header={
        <>
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
        </>
      }
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
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
      }
    />
  );
}
