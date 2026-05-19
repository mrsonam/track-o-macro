const OVERLAY_OPEN_KEY = "overlayOpen";
/** @deprecated Use overlayOpen; kept for migration reads */
const LEGACY_BARCODE_KEY = "barcodeOverlayOpen";

let overlayLockCount = 0;

function syncOverlayDataset() {
  if (typeof document === "undefined") return;
  const active = overlayLockCount > 0 ? "1" : "0";
  document.body.dataset[OVERLAY_OPEN_KEY] = active;
  document.body.dataset[LEGACY_BARCODE_KEY] = active;
  window.dispatchEvent(new Event("overlay-change"));
  window.dispatchEvent(new Event("barcode-overlay-change"));
}

/** Increment while a modal, sheet, or fullscreen overlay is open. */
export function acquireOverlayLock(): () => void {
  overlayLockCount += 1;
  syncOverlayDataset();
  return () => {
    overlayLockCount = Math.max(0, overlayLockCount - 1);
    syncOverlayDataset();
  };
}

export function isOverlayOpen(): boolean {
  if (typeof document === "undefined") return false;
  return (
    document.body.dataset[OVERLAY_OPEN_KEY] === "1" ||
    document.body.dataset[LEGACY_BARCODE_KEY] === "1"
  );
}
