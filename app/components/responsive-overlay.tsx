"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  motion,
  useDragControls,
  useReducedMotion,
  type PanInfo,
} from "framer-motion";
import { X } from "lucide-react";
import { modalBackdrop, modalPanel, sheetPanel, sheetPanelReduced } from "@/lib/motion";
import { acquireOverlayLock } from "@/lib/ui/overlay-open";
import { Z_INDEX } from "@/lib/ui/z-index";

const SWIPE_OFFSET_PX = 72;
const SWIPE_VELOCITY = 400;

export type ResponsiveOverlayProps = {
  open: boolean;
  onClose: () => void;
  busy?: boolean;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  /** Top zone: title, optional subtitle. Shown above scroll body. */
  header: ReactNode;
  /** Scrollable main content (optional if everything is in header/footer). */
  children?: ReactNode;
  /** Sticky actions at bottom of sheet (safe-area padded on mobile). */
  footer?: ReactNode;
  initialFocusRef?: RefObject<HTMLElement | null>;
  showCloseButton?: boolean;
  enableSwipeDismiss?: boolean;
  /** Mobile sheet only (e.g. `min-h-[50vh] sm:min-h-0`). */
  mobileSheetMinHeightClass?: string;
};

function useMobileSheetViewport() {
  const [isMobileSheet, setIsMobileSheet] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const apply = () => setIsMobileSheet(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return isMobileSheet;
}

export function ResponsiveOverlay({
  open,
  onClose,
  busy = false,
  ariaLabelledBy,
  ariaDescribedBy,
  header,
  children,
  footer,
  initialFocusRef,
  showCloseButton = false,
  enableSwipeDismiss = true,
  mobileSheetMinHeightClass,
}: ResponsiveOverlayProps) {
  const [mounted, setMounted] = useState(false);
  const reduceMotion = useReducedMotion();
  const isMobileSheet = useMobileSheetViewport();
  const dragControls = useDragControls();
  const defaultFocusRef = useRef<HTMLButtonElement>(null);

  const canSwipe =
    enableSwipeDismiss &&
    isMobileSheet &&
    !reduceMotion &&
    !busy;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    return acquireOverlayLock();
  }, [open]);

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
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      (initialFocusRef?.current ?? defaultFocusRef.current)?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open, initialFocusRef]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (!canSwipe) return;
    if (info.offset.y > SWIPE_OFFSET_PX || info.velocity.y > SWIPE_VELOCITY) {
      onClose();
    }
  }

  if (!mounted) return null;

  const panelVariants =
    isMobileSheet && !reduceMotion ? sheetPanel : reduceMotion && isMobileSheet
      ? sheetPanelReduced
      : modalPanel;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 flex items-end justify-center sm:items-center sm:p-4"
          style={{ zIndex: Z_INDEX.overlay }}
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
              if (!busy) onClose();
            }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={ariaLabelledBy}
            aria-describedby={ariaDescribedBy}
            variants={panelVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            drag={canSwipe ? "y" : false}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.15}
            onDragEnd={handleDragEnd}
            className={[
              "relative z-10 flex w-full max-h-[90dvh] flex-col overflow-hidden border border-black/10 border-b-0 bg-[#fbfaf5] shadow-[0_28px_80px_-36px_rgba(23,20,18,0.75)] sm:max-h-none sm:max-w-md sm:rounded-2xl sm:border-b rounded-t-2xl",
              mobileSheetMinHeightClass ?? "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              className={`shrink-0 sm:cursor-default ${canSwipe ? "cursor-grab active:cursor-grabbing touch-none" : ""}`}
              onPointerDown={(e) => {
                if (!canSwipe) return;
                dragControls.start(e);
              }}
            >
              <motion.div
                className="flex justify-center pt-2 sm:hidden"
                aria-hidden={!canSwipe}
              >
                <div
                  className="h-1 w-9 rounded-full bg-black/15"
                  aria-hidden
                />
              </motion.div>
              {canSwipe ? (
                <span className="sr-only">Drag down to close</span>
              ) : null}
              <div className="relative flex items-start gap-3 px-4 pb-3 pt-1 sm:px-6 sm:pb-4 sm:pt-6">
                <div className="min-w-0 flex-1">{header}</div>
                {showCloseButton ? (
                  <button
                    ref={!initialFocusRef ? defaultFocusRef : undefined}
                    type="button"
                    onClick={onClose}
                    disabled={busy}
                    className="focus-ring tap-target flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-black/10 text-zinc-600 hover:bg-warm-neutral"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    ref={defaultFocusRef}
                    type="button"
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden
                  >
                    Focus anchor
                  </button>
                )}
              </div>
            </motion.div>

            {children ? (
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 touch-pan-y sm:px-6">
                {children}
              </div>
            ) : null}

            {footer ? (
              <div className="shrink-0 border-t border-black/[0.06] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-5 sm:pb-5">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
