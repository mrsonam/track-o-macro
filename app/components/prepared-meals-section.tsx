"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChefHat, Camera, ScanLine, Trash2, X } from "lucide-react";
import type { ResolvedLine } from "@/lib/nutrition/resolve-ingredient";
import { ConfirmDialog } from "@/app/components/confirm-dialog";

export type PreparedMealListItem = {
  id: string;
  title: string;
  preparedGrams: number;
  batchTotalKcal: number;
  batchTotalProteinG: number;
  batchTotalCarbsG: number;
  batchTotalFatG: number;
  batchTotalFiberG?: number | null;
  batchTotalSodiumMg?: number | null;
  batchTotalSugarG?: number | null;
  batchTotalAddedSugarG?: number | null;
  createdAt: string;
};

type UsdaSuggestionItem = {
  label: string;
  fdcId: number;
  kcalPer100g: number | null;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
  fiberPer100g?: number | null;
  sodiumPer100g?: number | null;
  sugarPer100g?: number | null;
  addedSugarPer100g?: number | null;
};

type SelectedFoodHint = {
  label: string;
  labelNorm: string;
  fdcId: number;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g?: number;
  sodiumPer100g?: number;
  sugarPer100g?: number;
  addedSugarPer100g?: number;
};

type BatchTotals = {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sodium_mg: number;
  sugar_g: number;
  added_sugar_g?: number | null;
};

type AnalyzePreview = {
  mealId: string | null;
  lines: ResolvedLine[];
  totals: BatchTotals;
};

type PreparedMealsSectionProps = {
  preparedMeals: PreparedMealListItem[];
};

function extractTextareaIngredientQuery(value: string, caret: number): string {
  const before = value.slice(0, Math.max(0, caret));
  const lineStart = before.lastIndexOf("\n") + 1;
  const currentLine = before.slice(lineStart);
  const token = currentLine.split(",").pop()?.trim() ?? "";
  return token;
}

function parseIngredientGramsFromLine(line: string): number | null {
  const m = line.match(/(\d+(?:\.\d+)?)\s*g\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function ingredientLinesFromText(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function fmtKcal(n: number) {
  return Math.round(n).toLocaleString();
}

function fmtG(n: number) {
  if (Number.isNaN(n)) return "—";
  const r = Math.round(n * 10) / 10;
  return r % 1 === 0 ? String(Math.round(r)) : r.toFixed(1);
}

function fmtMg(n: number) {
  if (Number.isNaN(n)) return "—";
  return Math.round(n).toLocaleString();
}

function sourceLabel(source: ResolvedLine["source"]) {
  switch (source) {
    case "fdc":
      return "USDA";
    case "estimate":
      return "Estimate";
    case "custom":
      return "Custom";
    default:
      return source;
  }
}

export function PreparedMealsSection({ preparedMeals }: PreparedMealsSectionProps) {
  const router = useRouter();
  const [batchTitle, setBatchTitle] = useState("");
  const [batchRecipe, setBatchRecipe] = useState("");
  const [batchPreparedG, setBatchPreparedG] = useState("");
  const [batchPreview, setBatchPreview] = useState<AnalyzePreview | null>(null);
  const [batchPreviewBusy, setBatchPreviewBusy] = useState(false);
  const [batchSaveBusy, setBatchSaveBusy] = useState(false);
  const [batchErr, setBatchErr] = useState<string | null>(null);
  const [listErr, setListErr] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PreparedMealListItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const batchTextareaRef = useRef<HTMLTextAreaElement>(null);
  const barcodeVideoRef = useRef<HTMLVideoElement>(null);
  const barcodeStreamRef = useRef<MediaStream | null>(null);
  const barcodeRafRef = useRef<number | null>(null);
  const barcodeZxingStopRef = useRef<(() => void) | null>(null);
  const [batchFreeTextSuggestions, setBatchFreeTextSuggestions] = useState<
    UsdaSuggestionItem[]
  >([]);
  const [batchFreeTextQuery, setBatchFreeTextQuery] = useState("");
  const [batchShowSuggestions, setBatchShowSuggestions] = useState(false);
  const [batchSuggestionAnchor, setBatchSuggestionAnchor] = useState({
    top: 24,
    left: 24,
  });
  const [batchSelectedFoodHints, setBatchSelectedFoodHints] = useState<
    Record<string, SelectedFoodHint>
  >({});

  const [showBarcodePanel, setShowBarcodePanel] = useState(false);
  const [barcodeValue, setBarcodeValue] = useState("");
  const [barcodeBusy, setBarcodeBusy] = useState(false);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [barcodeScanning, setBarcodeScanning] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  const preparedGramsNum = Number(batchPreparedG);

  const per100gDish = useMemo(() => {
    if (!batchPreview || !Number.isFinite(preparedGramsNum) || preparedGramsNum <= 0) {
      return null;
    }
    const s = 100 / preparedGramsNum;
    const t = batchPreview.totals;
    return {
      kcal: t.kcal * s,
      protein_g: t.protein_g * s,
      carbs_g: t.carbs_g * s,
      fat_g: t.fat_g * s,
      fiber_g: t.fiber_g * s,
      sodium_mg: t.sodium_mg * s,
      sugar_g: t.sugar_g * s,
      added_sugar_g:
        t.added_sugar_g != null && Number.isFinite(t.added_sugar_g)
          ? t.added_sugar_g * s
          : null,
    };
  }, [batchPreview, preparedGramsNum]);

  const showFiberCol = useMemo(
    () =>
      !!batchPreview?.lines.some(
        (l) => l.fiber_g != null && Number.isFinite(l.fiber_g),
      ),
    [batchPreview],
  );
  const showSodiumCol = useMemo(
    () =>
      !!batchPreview?.lines.some(
        (l) => l.sodium_mg != null && Number.isFinite(l.sodium_mg),
      ),
    [batchPreview],
  );
  const showSugarCol = useMemo(
    () =>
      !!batchPreview?.lines.some(
        (l) => l.sugar_g != null && Number.isFinite(l.sugar_g),
      ),
    [batchPreview],
  );
  const showAddedSugarCol = useMemo(
    () =>
      !!batchPreview?.lines.some(
        (l) => l.added_sugar_g != null && Number.isFinite(l.added_sugar_g),
      ),
    [batchPreview],
  );

  useEffect(() => {
    const q = batchFreeTextQuery.trim();
    if (q.length < 2) {
      setBatchFreeTextSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const url = new URL(
            "/api/nutrition/usda-search",
            window.location.origin,
          );
          url.searchParams.set("q", q);
          const res = await fetch(url.toString(), { credentials: "same-origin" });
          const json = (await res.json().catch(() => ({}))) as {
            items?: UsdaSuggestionItem[];
          };
          setBatchFreeTextSuggestions(
            Array.isArray(json.items)
              ? json.items.filter(
                  (item): item is UsdaSuggestionItem =>
                    !!item && typeof item.label === "string" && item.label.length > 0,
                )
              : [],
          );
        } catch {
          setBatchFreeTextSuggestions([]);
        }
      })();
    }, 220);
    return () => clearTimeout(timer);
  }, [batchFreeTextQuery]);

  function updateBatchSuggestionAnchor(caret: number) {
    const el = batchTextareaRef.current;
    if (!el) return;
    const value = el.value;
    const before = value.slice(0, Math.max(0, caret));
    const lineStart = before.lastIndexOf("\n") + 1;
    const currentLine = before.slice(lineStart);
    const approxCharWidth = 8;
    const approxLineHeight = 22;
    const rawLeft = 20 + currentLine.length * approxCharWidth;
    const rawTop = 20 + before.split("\n").length * approxLineHeight;
    const maxLeft = Math.max(20, el.clientWidth - 220);
    const maxTop = Math.max(20, el.clientHeight - 120);
    setBatchSuggestionAnchor({
      left: Math.min(rawLeft, maxLeft),
      top: Math.min(rawTop, maxTop),
    });
  }

  function rememberBatchFoodHint(item: UsdaSuggestionItem) {
    const labelNorm = item.label.trim().toLowerCase().replace(/\s+/g, " ");
    if (!labelNorm) return;
    const kcalPer100g = item.kcalPer100g;
    const proteinPer100g = item.proteinPer100g;
    const carbsPer100g = item.carbsPer100g;
    const fatPer100g = item.fatPer100g;
    if (
      kcalPer100g == null ||
      proteinPer100g == null ||
      carbsPer100g == null ||
      fatPer100g == null
    ) {
      return;
    }
    setBatchSelectedFoodHints((prev) => ({
      ...prev,
      [labelNorm]: {
        label: item.label,
        labelNorm,
        fdcId: item.fdcId,
        kcalPer100g,
        proteinPer100g,
        carbsPer100g,
        fatPer100g,
        ...(item.fiberPer100g != null
          ? { fiberPer100g: item.fiberPer100g }
          : {}),
        ...(item.sodiumPer100g != null
          ? { sodiumPer100g: item.sodiumPer100g }
          : {}),
        ...(item.sugarPer100g != null
          ? { sugarPer100g: item.sugarPer100g }
          : {}),
        ...(item.addedSugarPer100g != null
          ? { addedSugarPer100g: item.addedSugarPer100g }
          : {}),
      },
    }));
  }

  function pruneBatchHintsForText(value: string) {
    const normalizedText = value.toLowerCase().replace(/\s+/g, " ").trim();
    setBatchSelectedFoodHints((prev) => {
      const entries = Object.entries(prev);
      if (entries.length === 0) return prev;
      const kept = entries.filter(([, hint]) =>
        normalizedText.includes(hint.labelNorm),
      );
      if (kept.length === entries.length) return prev;
      return Object.fromEntries(kept);
    });
  }

  const batchDerivedHints = useMemo(() => {
    const lines = ingredientLinesFromText(batchRecipe);
    if (lines.length === 0) return [];
    const hintList = Object.values(batchSelectedFoodHints);
    if (hintList.length === 0) return [];
    const out: Array<{
      key: string;
      label: string;
      labelNorm: string;
      grams: number | null;
      kcal: number | null;
    }> = [];
    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i]!;
      const normalizedLine = rawLine.toLowerCase().replace(/\s+/g, " ");
      const grams = parseIngredientGramsFromLine(rawLine);
      for (const hint of hintList) {
        if (!normalizedLine.includes(hint.labelNorm)) continue;
        const kcal =
          grams != null ? (hint.kcalPer100g * grams) / 100 : null;
        out.push({
          key: `batch-${i}-${hint.labelNorm}`,
          label: hint.label,
          labelNorm: hint.labelNorm,
          grams,
          kcal,
        });
        break;
      }
    }
    return out;
  }, [batchRecipe, batchSelectedFoodHints]);

  function onBatchRecipeChange(value: string, caret: number) {
    setBatchRecipe(value);
    pruneBatchHintsForText(value);
    const q = extractTextareaIngredientQuery(value, caret);
    updateBatchSuggestionAnchor(caret);
    setBatchFreeTextQuery(q);
    setBatchShowSuggestions(q.length >= 2);
  }

  function applyBatchSuggestionItem(item: UsdaSuggestionItem) {
    rememberBatchFoodHint(item);
    const label = item.label;
    const el = batchTextareaRef.current;
    if (!el) return;
    const value = batchRecipe;
    const caret = el.selectionStart ?? value.length;
    const before = value.slice(0, caret);
    const after = value.slice(caret);
    const lineStart = before.lastIndexOf("\n") + 1;
    const currentLine = before.slice(lineStart);
    const lastComma = currentLine.lastIndexOf(",");
    const tokenStartInLine = lastComma >= 0 ? lastComma + 1 : 0;
    const absoluteTokenStart = lineStart + tokenStartInLine;
    const prefix = value.slice(0, absoluteTokenStart);
    const suffix = after;
    const spacer = prefix.endsWith(" ") || prefix.endsWith(",") ? "" : " ";
    const next = `${prefix}${spacer}${label} 100g${suffix}`;
    setBatchRecipe(next);
    setBatchFreeTextQuery(label);
    setBatchShowSuggestions(false);
    queueMicrotask(() => {
      const nextCaret = (prefix + spacer + label + " 100g").length;
      el.focus();
      el.setSelectionRange(nextCaret, nextCaret);
    });
  }

  function appendBarcodeLineToBatch(item: UsdaSuggestionItem) {
    rememberBatchFoodHint(item);
    const label = item.label.trim();
    if (!label) return;
    const base = batchRecipe.trimEnd();
    const next = base ? `${base}\n${label} 100g` : `${label} 100g`;
    setBatchRecipe(next);
    pruneBatchHintsForText(next);
    setBatchShowSuggestions(false);
    setBatchFreeTextQuery("");
    queueMicrotask(() => {
      const el = batchTextareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(next.length, next.length);
    });
  }

  async function lookupBatchBarcode(barcode: string) {
    const clean = barcode.trim();
    if (!clean) return;
    setBarcodeBusy(true);
    setBarcodeError(null);
    try {
      const url = new URL("/api/nutrition/barcode", window.location.origin);
      url.searchParams.set("barcode", clean);
      const res = await fetch(url.toString(), { credentials: "same-origin" });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        item?: UsdaSuggestionItem | null;
      };
      if (!res.ok) {
        setBarcodeError(json.error ?? "Barcode lookup failed");
        return;
      }
      if (!json.item) {
        setBarcodeError("No food found for this barcode");
        return;
      }
      appendBarcodeLineToBatch(json.item);
      setShowBarcodePanel(false);
      setBarcodeValue("");
    } catch {
      setBarcodeError("Barcode lookup failed");
    } finally {
      setBarcodeBusy(false);
    }
  }

  function stopBatchBarcodeScanner() {
    if (barcodeRafRef.current != null) {
      cancelAnimationFrame(barcodeRafRef.current);
      barcodeRafRef.current = null;
    }
    if (barcodeZxingStopRef.current) {
      try {
        barcodeZxingStopRef.current();
      } catch {
        // Ignore scanner shutdown errors.
      }
      barcodeZxingStopRef.current = null;
    }
    if (barcodeStreamRef.current) {
      for (const t of barcodeStreamRef.current.getTracks()) t.stop();
      barcodeStreamRef.current = null;
    }
    setBarcodeScanning(false);
  }

  async function startBatchBarcodeScanner() {
    const BarcodeDetectorCtor = (window as Window & {
      BarcodeDetector?: new (opts?: { formats?: string[] }) => {
        detect: (el: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
      };
    }).BarcodeDetector;
    if (!navigator.mediaDevices?.getUserMedia) {
      setBarcodeError("Camera is not available on this device/browser");
      return;
    }
    setBarcodeError(null);
    const video = barcodeVideoRef.current;
    if (!video) {
      return;
    }

    if (!BarcodeDetectorCtor) {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        let handled = false;
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          video,
          (result) => {
            const code = result?.getText?.();
            if (!code || handled) return;
            handled = true;
            setBarcodeValue(code);
            stopBatchBarcodeScanner();
            void lookupBatchBarcode(code);
          },
        );
        barcodeZxingStopRef.current = () => controls.stop();
        setBarcodeScanning(true);
      } catch {
        setBarcodeError("Could not start camera scanner on this device/browser");
        stopBatchBarcodeScanner();
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      barcodeStreamRef.current = stream;
      video.srcObject = stream;
      await video.play();
      setBarcodeScanning(true);

      const detector = new BarcodeDetectorCtor({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
      });

      const tick = async () => {
        const v = barcodeVideoRef.current;
        if (!v || !barcodeStreamRef.current) return;
        try {
          const found = await detector.detect(v);
          const code = found.find((f) => typeof f.rawValue === "string")?.rawValue;
          if (code) {
            setBarcodeValue(code);
            stopBatchBarcodeScanner();
            await lookupBatchBarcode(code);
            return;
          }
        } catch {
          // Keep scanning; individual detect failures are common between frames.
        }
        barcodeRafRef.current = requestAnimationFrame(() => {
          void tick();
        });
      };

      barcodeRafRef.current = requestAnimationFrame(() => {
        void tick();
      });
    } catch {
      setBarcodeError("Could not access camera");
      stopBatchBarcodeScanner();
    }
  }

  async function runBatchPreview() {
    const raw = batchRecipe.trim();
    if (!raw) {
      setBatchErr("Add your ingredients (one per line or comma-separated).");
      return;
    }
    setBatchErr(null);
    setBatchPreviewBusy(true);
    try {
      const res = await fetch("/api/meals/analyze", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawInput: raw,
          persist: false,
          selectedFoodHints: Object.values(batchSelectedFoodHints),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        lines?: ResolvedLine[];
        totals?: BatchTotals;
      };
      if (!res.ok) {
        setBatchErr(data.error ?? "Preview failed");
        setBatchPreview(null);
        return;
      }
      if (!data.totals || !Array.isArray(data.lines)) {
        setBatchErr("Unexpected preview response");
        setBatchPreview(null);
        return;
      }
      setBatchPreview({
        mealId: null,
        lines: data.lines,
        totals: data.totals,
      });
    } catch {
      setBatchErr("Network error");
      setBatchPreview(null);
    } finally {
      setBatchPreviewBusy(false);
    }
  }

  async function savePreparedMeal() {
    const title = batchTitle.trim();
    const prepared = Number(batchPreparedG);
    if (!title) {
      setBatchErr("Give this dish a short name (e.g. Chicken curry).");
      return;
    }
    if (!Number.isFinite(prepared) || prepared <= 0) {
      setBatchErr("Enter total prepared weight in grams (weighed after cooking).");
      return;
    }
    if (!batchPreview?.totals) {
      setBatchErr("Preview nutrition first.");
      return;
    }
    setBatchErr(null);
    setBatchSaveBusy(true);
    try {
      const res = await fetch("/api/prepared-meals", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          preparedGrams: prepared,
          recipeRawInput: batchRecipe.trim(),
          batchTotals: batchPreview.totals,
          lines: batchPreview.lines,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setBatchErr(data.error ?? "Could not save prepared meal");
        return;
      }
      setBatchTitle("");
      setBatchRecipe("");
      setBatchPreparedG("");
      setBatchPreview(null);
      setBatchSelectedFoodHints({});
      setBatchFreeTextSuggestions([]);
      setBatchFreeTextQuery("");
      setShowBarcodePanel(false);
      stopBatchBarcodeScanner();
      setBarcodeValue("");
      router.refresh();
    } catch {
      setBatchErr("Network error");
    } finally {
      setBatchSaveBusy(false);
    }
  }

  async function executePreparedDelete() {
    const id = deleteTarget?.id;
    if (!id) return;
    setListErr(null);
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/prepared-meals/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setListErr(d.error ?? "Could not delete");
        setDeleteTarget(null);
        return;
      }
      setDeleteTarget(null);
      router.refresh();
    } catch {
      setListErr("Network error");
      setDeleteTarget(null);
    } finally {
      setDeleteBusy(false);
    }
  }

  useEffect(() => {
    return () => {
      stopBatchBarcodeScanner();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 768px), (pointer: coarse)");
    const apply = () => setIsMobileDevice(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!isMobileDevice) {
      stopBatchBarcodeScanner();
    }
  }, [isMobileDevice]);

  useEffect(() => {
    if (!showBarcodePanel || !isMobileDevice) return;
    const timer = window.setTimeout(() => {
      void startBatchBarcodeScanner();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [showBarcodePanel, isMobileDevice]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.dataset.barcodeOverlayOpen = showBarcodePanel ? "1" : "0";
    window.dispatchEvent(new Event("barcode-overlay-change"));
    return () => {
      document.body.dataset.barcodeOverlayOpen = "0";
      window.dispatchEvent(new Event("barcode-overlay-change"));
    };
  }, [showBarcodePanel]);

  const totals = batchPreview?.totals;

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-[2rem] border border-black/[0.08] bg-white/90 p-4 shadow-[0_24px_70px_-42px_rgba(23,20,18,0.45)] sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#dff1ff] text-[#3b82a0]">
            <ChefHat className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
              New prepared batch
            </p>
            <h3 className="text-lg font-black tracking-tight text-[#171412]">
              Build the recipe, preview, then save
            </h3>
            <p className="mt-1 max-w-2xl text-xs font-medium text-zinc-600">
              Search ingredients, use the barcode scanner, set grams per line, enter the
              cooked weight of the full batch, then review the breakdown below.
            </p>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-black/10 bg-[#fffdf7] p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-600">
            Recipe
          </p>
          <input
            type="text"
            value={batchTitle}
            onChange={(e) => setBatchTitle(e.target.value)}
            placeholder="Dish name (e.g. Chicken curry)"
            className="input-field w-full py-2.5 text-sm"
          />
          <div className="relative">
            <textarea
              ref={batchTextareaRef}
              value={batchRecipe}
              onChange={(e) =>
                onBatchRecipeChange(
                  e.target.value,
                  e.target.selectionStart ?? e.target.value.length,
                )
              }
              onFocus={() => {
                const el = batchTextareaRef.current;
                const caret = el?.selectionStart ?? batchRecipe.length;
                updateBatchSuggestionAnchor(caret);
                const q = el
                  ? extractTextareaIngredientQuery(el.value, caret)
                  : "";
                setBatchFreeTextQuery(q);
                setBatchShowSuggestions(q.trim().length >= 2);
              }}
              onClick={(e) =>
                updateBatchSuggestionAnchor(
                  e.currentTarget.selectionStart ??
                    e.currentTarget.value.length,
                )
              }
              onKeyUp={(e) =>
                updateBatchSuggestionAnchor(
                  e.currentTarget.selectionStart ??
                    e.currentTarget.value.length,
                )
              }
              onBlur={() => {
                setTimeout(() => setBatchShowSuggestions(false), 120);
              }}
              rows={6}
              placeholder="Ingredients — search, barcode, or pick matches; add grams (e.g. 400g) per line"
              className={`w-full resize-y rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm leading-relaxed text-[#171412] placeholder:text-zinc-400 focus:border-[#4f9d45]/50 focus:outline-none focus:ring-2 focus:ring-[#4f9d45]/15 ${
                batchDerivedHints.length > 0 ? "md:pr-44" : ""
              }`}
            />
            {batchDerivedHints.length > 0 ? (
              <div className="pointer-events-none absolute right-2 top-2 hidden max-w-[9.5rem] flex-col gap-1 md:flex">
                {batchDerivedHints.slice(0, 8).map((row) => (
                  <div
                    key={row.key}
                    className="truncate rounded-lg border border-[#4f9d45]/20 bg-[#eaf7df] px-2 py-0.5 text-right text-[10px] font-bold text-[#356d30]"
                  >
                    {row.grams != null && row.kcal != null
                      ? `${Math.round(row.grams)}g • ${Math.round(row.kcal)} kcal`
                      : "Add grams (e.g. 80g)"}
                  </div>
                ))}
              </div>
            ) : null}
            {batchDerivedHints.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5 md:hidden">
                {batchDerivedHints.slice(0, 8).map((row) => (
                  <div
                    key={`m-${row.key}`}
                    className="rounded-lg border border-[#4f9d45]/20 bg-[#eaf7df] px-2 py-0.5 text-[10px] font-bold text-[#356d30]"
                  >
                    {row.grams != null && row.kcal != null
                      ? `${Math.round(row.grams)}g • ${Math.round(row.kcal)} kcal`
                      : "Add grams (e.g. 80g)"}
                  </div>
                ))}
              </div>
            ) : null}
            {batchShowSuggestions && batchFreeTextSuggestions.length > 0 ? (
              <ul
                className="absolute z-40 max-h-56 w-[min(18rem,calc(100%-1rem))] overflow-auto rounded-xl border border-black/10 bg-white p-1 shadow-[0_20px_40px_-24px_rgba(23,20,18,0.5)]"
                style={{
                  left: `${batchSuggestionAnchor.left}px`,
                  top: `${batchSuggestionAnchor.top}px`,
                }}
              >
                {batchFreeTextSuggestions
                  .filter(
                    (item): item is UsdaSuggestionItem =>
                      !!item &&
                      typeof item.label === "string" &&
                      item.label.length > 0,
                  )
                  .map((item, index) => (
                    <li key={`batch-sug-${item.fdcId}-${item.label}-${index}`}>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          applyBatchSuggestionItem(item);
                        }}
                        className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-800 transition-colors hover:bg-[#f7f3e9]"
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="truncate">{item.label}</span>
                          {item.kcalPer100g != null ? (
                            <span className="shrink-0 text-[11px] font-bold text-[#4f9d45]">
                              {Math.round(item.kcalPer100g)} kcal
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  ))}
              </ul>
            ) : null}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-[8rem] flex-1 flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Prepared weight (g)
              <input
                type="number"
                min={1}
                inputMode="decimal"
                value={batchPreparedG}
                onChange={(e) => setBatchPreparedG(e.target.value)}
                placeholder="e.g. 1200"
                className="input-field py-2.5 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                const next = !showBarcodePanel;
                setShowBarcodePanel(next);
                setBarcodeError(null);
                if (next) {
                  if (!isMobileDevice) {
                    stopBatchBarcodeScanner();
                  }
                } else {
                  stopBatchBarcodeScanner();
                }
              }}
              className="focus-ring tap-target inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold text-zinc-700 hover:border-[#4f9d45]/30 hover:bg-[#f2f8ec] hover:text-[#171412]"
            >
              <ScanLine className="h-3.5 w-3.5" />
              Barcode
            </button>
            <button
              type="button"
              onClick={() => void runBatchPreview()}
              disabled={batchPreviewBusy}
              className="focus-ring tap-target rounded-xl border border-black/10 bg-white px-4 py-2.5 text-xs font-bold text-zinc-800 hover:bg-[#f2f8ec] disabled:opacity-50"
            >
              {batchPreviewBusy ? "Analyzing…" : "Preview nutrition"}
            </button>
          </div>
          {batchErr ? (
            <p className="text-xs font-semibold text-red-600">{batchErr}</p>
          ) : null}
        </div>
      </div>

      {batchPreview && totals ? (
        <div className="overflow-hidden rounded-[2rem] border border-black/[0.08] bg-white/95 p-4 shadow-[0_24px_70px_-42px_rgba(23,20,18,0.4)] sm:p-6">
          <div className="mb-6 flex flex-col gap-2 border-b border-black/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#356d30]">
                Nutrition breakdown
              </p>
              <h3 className="mt-1 text-xl font-black tracking-tight text-[#171412] sm:text-2xl">
                {batchTitle.trim() || "Untitled dish"}
              </h3>
              <p className="mt-2 text-sm text-zinc-600">
                Totals for everything in your recipe list before you scale by cooked
                weight. Add your prepared weight above to see{" "}
                <span className="font-semibold text-zinc-800">per 100 g of the finished dish</span>{" "}
                (same basis as logging from home).
              </p>
            </div>
          </div>

          <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-[#4f9d45]/25 bg-[#eaf7df] p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#356d30]">
                Energy
              </p>
              <p className="mt-1 font-mono text-2xl font-black text-[#171412]">
                {fmtKcal(totals.kcal)}
                <span className="text-sm font-bold text-zinc-600"> kcal</span>
              </p>
            </div>
            <div className="rounded-2xl border border-black/10 bg-[#fffdf7] p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                Protein
              </p>
              <p className="mt-1 font-mono text-2xl font-black text-[#171412]">
                {fmtG(totals.protein_g)}
                <span className="text-sm font-bold text-zinc-600"> g</span>
              </p>
            </div>
            <div className="rounded-2xl border border-black/10 bg-[#fffdf7] p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                Carbs
              </p>
              <p className="mt-1 font-mono text-2xl font-black text-[#171412]">
                {fmtG(totals.carbs_g)}
                <span className="text-sm font-bold text-zinc-600"> g</span>
              </p>
            </div>
            <div className="rounded-2xl border border-black/10 bg-[#fffdf7] p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                Fat
              </p>
              <p className="mt-1 font-mono text-2xl font-black text-[#171412]">
                {fmtG(totals.fat_g)}
                <span className="text-sm font-bold text-zinc-600"> g</span>
              </p>
            </div>
          </div>

          <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-black/10 bg-zinc-50/80 p-3">
              <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                Fiber
              </p>
              <p className="mt-0.5 font-mono text-lg font-bold text-[#171412]">
                {fmtG(totals.fiber_g)} g
              </p>
            </div>
            <div className="rounded-xl border border-black/10 bg-zinc-50/80 p-3">
              <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                Sodium
              </p>
              <p className="mt-0.5 font-mono text-lg font-bold text-[#171412]">
                {fmtMg(totals.sodium_mg)} mg
              </p>
            </div>
            <div className="rounded-xl border border-black/10 bg-zinc-50/80 p-3">
              <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                Sugars
              </p>
              <p className="mt-0.5 font-mono text-lg font-bold text-[#171412]">
                {fmtG(totals.sugar_g)} g
              </p>
            </div>
            <div className="rounded-xl border border-black/10 bg-zinc-50/80 p-3">
              <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                Added sugar
              </p>
              <p className="mt-0.5 font-mono text-lg font-bold text-[#171412]">
                {totals.added_sugar_g != null && Number.isFinite(totals.added_sugar_g)
                  ? `${fmtG(totals.added_sugar_g)} g`
                  : "—"}
              </p>
            </div>
          </div>

          {per100gDish ? (
            <div className="mb-8 rounded-2xl border border-[#3b82a0]/25 bg-[#f0f7ff] p-4 sm:p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#3b82a0]">
                Finished dish (per 100 g)
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                Using prepared weight{" "}
                <span className="font-bold text-[#171412]">
                  {Math.round(preparedGramsNum)} g
                </span>{" "}
                total cooked batch.
              </p>
              <dl className="mt-4 grid gap-3 font-mono text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-[10px] font-bold uppercase text-zinc-500">Kcal</dt>
                  <dd className="font-black text-[#171412]">
                    {fmtKcal(per100gDish.kcal)} / 100g
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase text-zinc-500">Protein</dt>
                  <dd className="font-black text-[#171412]">{fmtG(per100gDish.protein_g)} g</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase text-zinc-500">Carbs</dt>
                  <dd className="font-black text-[#171412]">{fmtG(per100gDish.carbs_g)} g</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase text-zinc-500">Fat</dt>
                  <dd className="font-black text-[#171412]">{fmtG(per100gDish.fat_g)} g</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase text-zinc-500">Fiber</dt>
                  <dd className="font-black text-[#171412]">{fmtG(per100gDish.fiber_g)} g</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase text-zinc-500">Sodium</dt>
                  <dd className="font-black text-[#171412]">{fmtMg(per100gDish.sodium_mg)} mg</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase text-zinc-500">Sugars</dt>
                  <dd className="font-black text-[#171412]">{fmtG(per100gDish.sugar_g)} g</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase text-zinc-500">Added sugar</dt>
                  <dd className="font-black text-[#171412]">
                    {per100gDish.added_sugar_g != null
                      ? `${fmtG(per100gDish.added_sugar_g)} g`
                      : "—"}
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="mb-8 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/60 p-4 text-sm text-zinc-600">
              Enter a valid <span className="font-semibold">prepared weight (g)</span> in the
              recipe card above to see per-100 g numbers for the cooked dish.
            </div>
          )}

          <div className="mb-6">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
              Line-by-line
            </p>
            <div className="overflow-x-auto rounded-2xl border border-black/10">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-black/10 bg-[#fffdf7] text-[10px] font-black uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="px-3 py-2.5">Ingredient</th>
                    <th className="px-3 py-2.5">Amount</th>
                    <th className="px-3 py-2.5 text-right">Kcal</th>
                    <th className="px-3 py-2.5 text-right">P (g)</th>
                    <th className="px-3 py-2.5 text-right">C (g)</th>
                    <th className="px-3 py-2.5 text-right">F (g)</th>
                    {showFiberCol ? (
                      <th className="px-3 py-2.5 text-right">Fiber</th>
                    ) : null}
                    {showSodiumCol ? (
                      <th className="px-3 py-2.5 text-right">Na (mg)</th>
                    ) : null}
                    {showSugarCol ? (
                      <th className="px-3 py-2.5 text-right">Sugar</th>
                    ) : null}
                    {showAddedSugarCol ? (
                      <th className="px-3 py-2.5 text-right">Added</th>
                    ) : null}
                    <th className="px-3 py-2.5">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.06]">
                  {batchPreview.lines.map((line, idx) => (
                    <tr key={`line-${idx}-${line.label}`} className="bg-white/90">
                      <td className="max-w-[14rem] px-3 py-2.5 font-medium text-[#171412]">
                        <span className="line-clamp-2">{line.label}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-zinc-600">
                        {fmtG(line.quantity)}
                        {line.unit ? ` ${line.unit}` : ""}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-zinc-800">
                        {fmtKcal(line.kcal)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-zinc-700">
                        {fmtG(line.protein_g)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-zinc-700">
                        {fmtG(line.carbs_g)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-zinc-700">
                        {fmtG(line.fat_g)}
                      </td>
                      {showFiberCol ? (
                        <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-zinc-600">
                          {line.fiber_g != null ? fmtG(line.fiber_g) : "—"}
                        </td>
                      ) : null}
                      {showSodiumCol ? (
                        <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-zinc-600">
                          {line.sodium_mg != null ? fmtMg(line.sodium_mg) : "—"}
                        </td>
                      ) : null}
                      {showSugarCol ? (
                        <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-zinc-600">
                          {line.sugar_g != null ? fmtG(line.sugar_g) : "—"}
                        </td>
                      ) : null}
                      {showAddedSugarCol ? (
                        <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-zinc-600">
                          {line.added_sugar_g != null ? fmtG(line.added_sugar_g) : "—"}
                        </td>
                      ) : null}
                      <td className="px-3 py-2.5">
                        <span className="inline-flex rounded-md border border-black/10 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-600">
                          {sourceLabel(line.source)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-[#4f9d45]/30 bg-[#f7fcf0]">
                  <tr className="font-black text-[#171412]">
                    <td className="px-3 py-3" colSpan={2}>
                      Batch total
                    </td>
                    <td className="px-3 py-3 text-right font-mono">{fmtKcal(totals.kcal)}</td>
                    <td className="px-3 py-3 text-right font-mono">{fmtG(totals.protein_g)}</td>
                    <td className="px-3 py-3 text-right font-mono">{fmtG(totals.carbs_g)}</td>
                    <td className="px-3 py-3 text-right font-mono">{fmtG(totals.fat_g)}</td>
                    {showFiberCol ? (
                      <td className="px-3 py-3 text-right font-mono">{fmtG(totals.fiber_g)}</td>
                    ) : null}
                    {showSodiumCol ? (
                      <td className="px-3 py-3 text-right font-mono">{fmtMg(totals.sodium_mg)}</td>
                    ) : null}
                    {showSugarCol ? (
                      <td className="px-3 py-3 text-right font-mono">{fmtG(totals.sugar_g)}</td>
                    ) : null}
                    {showAddedSugarCol ? (
                      <td className="px-3 py-3 text-right font-mono">
                        {totals.added_sugar_g != null
                          ? fmtG(totals.added_sugar_g)
                          : "—"}
                      </td>
                    ) : null}
                    <td className="px-3 py-3" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void savePreparedMeal()}
            disabled={batchSaveBusy}
            className="focus-ring tap-target w-full rounded-2xl bg-[#4f9d45] px-4 py-3.5 text-sm font-black uppercase tracking-wider text-white hover:bg-[#458a3d] disabled:opacity-50 sm:w-auto sm:min-w-[12rem]"
          >
            {batchSaveBusy ? "Saving…" : "Save prepared meal"}
          </button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[2rem] border border-black/[0.08] bg-white/90 p-4 shadow-[0_24px_70px_-42px_rgba(23,20,18,0.45)] sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-600">
          Saved batches
        </p>
        {preparedMeals.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">
            No saved batches yet. Preview nutrition and save a dish above — then you can log
            it from home by searching for the same name.
          </p>
        ) : (
          <>
            <ul className="mt-4 max-h-72 space-y-2 overflow-y-auto text-sm">
              {preparedMeals.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-[#fffdf7] px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold text-[#171412]">{m.title}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {Math.round(m.preparedGrams)} g batch ·{" "}
                      {fmtKcal(m.batchTotalKcal)} kcal · P {fmtG(m.batchTotalProteinG)} · C{" "}
                      {fmtG(m.batchTotalCarbsG)} · F {fmtG(m.batchTotalFatG)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(m)}
                    className="focus-ring shrink-0 rounded-lg p-2 text-zinc-500 hover:bg-red-50 hover:text-red-600"
                    aria-label={`Delete ${m.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
            {listErr ? (
              <p className="mt-3 text-xs font-semibold text-red-600">{listErr}</p>
            ) : null}
          </>
        )}
      </div>

      {showBarcodePanel ? (
        <div className="fixed inset-0 z-[120] bg-black">
          <video
            ref={barcodeVideoRef}
            className="h-full w-full object-cover"
            playsInline
            muted
          />
          {!barcodeScanning ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-semibold text-white/90">
              Preparing camera...
            </div>
          ) : null}

          <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/75 to-transparent p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-white/90">
              Barcode scanner
            </p>
            <button
              type="button"
              onClick={() => {
                stopBatchBarcodeScanner();
                setShowBarcodePanel(false);
              }}
              className="focus-ring rounded-full border border-white/30 bg-black/45 p-2 text-white hover:bg-black/65"
              aria-label="Close barcode panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="absolute inset-x-0 bottom-0 space-y-3 bg-gradient-to-t from-black/85 via-black/65 to-transparent p-4 pb-5">
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={barcodeValue}
                onChange={(e) => setBarcodeValue(e.target.value)}
                placeholder="Enter barcode digits"
                className="min-w-0 flex-1 rounded-xl border border-white/30 bg-black/45 px-3 py-2.5 text-sm text-white placeholder:text-white/60 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => void lookupBatchBarcode(barcodeValue)}
                disabled={barcodeBusy || barcodeValue.trim().length < 6}
                className="focus-ring tap-target rounded-xl border border-white/30 bg-white/20 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/30 disabled:opacity-40"
              >
                {barcodeBusy ? "Looking up..." : "Use barcode"}
              </button>
            </div>
            <button
              type="button"
              onClick={() =>
                barcodeScanning
                  ? stopBatchBarcodeScanner()
                  : void startBatchBarcodeScanner()
              }
              className="focus-ring tap-target inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/20 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/30"
            >
              <Camera className="h-3.5 w-3.5" />
              {barcodeScanning ? "Stop camera" : "Scan with camera"}
            </button>
            {barcodeError ? (
              <p className="text-xs font-semibold text-red-200">{barcodeError}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={deleteTarget != null}
        title="Remove prepared meal?"
        description={
          deleteTarget ? (
            <>
              <span className="font-semibold text-zinc-800">{deleteTarget.title}</span>{" "}
              will be removed from your saved batches. You can create it again anytime.
            </>
          ) : null
        }
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="danger"
        busy={deleteBusy}
        onCancel={() => {
          if (!deleteBusy) setDeleteTarget(null);
        }}
        onConfirm={() => void executePreparedDelete()}
      />
    </div>
  );
}
