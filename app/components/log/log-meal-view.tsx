"use client";

import Link from "next/link";
import type { RefObject, FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  ChevronRight,
  History as HistoryIcon,
  Keyboard,
  LayoutGrid,
  ScanLine,
  X,
  Zap,
} from "lucide-react";
import { MealItemComposer } from "@/app/components/meal-item-composer";
import {
  LogMealAnalysisReceipt,
  type LogMealAnalysisResult,
} from "@/app/components/log/log-meal-analysis-receipt";
import type { ComposerRow } from "@/lib/meals/meal-composer";
import {
  mealLogLineHintTopPx,
  type LineHintChip,
} from "@/lib/meals/log-line-hints";
import { PORTION_QUICK_SNIPPETS } from "@/lib/meals/portion-hints";
import type { PortionServingOption } from "@/lib/meals/portion-resolve";
import { Z_INDEX } from "@/lib/ui/z-index";

export type LogInputMode = "free" | "composer";

export type LogMealSuggestionItem = {
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
  source?: "prepared";
  preparedMealId?: string;
  servings?: PortionServingOption[];
};

export type LogMealHintChip = LineHintChip;

type LogMealViewProps = {
  logInputMode: LogInputMode;
  onSwitchInputMode: (mode: LogInputMode) => void;
  text: string;
  onFreeTextChange: (value: string, caret: number) => void;
  onFreeTextFocus: () => void;
  onFreeTextBlur: () => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  composerRows: ComposerRow[];
  onComposerRowsChange: (rows: ComposerRow[]) => void;
  onSuggestionPicked: (item: LogMealSuggestionItem) => void;
  busy: boolean;
  loading: boolean;
  canSubmit: boolean;
  onSubmit: (e: FormEvent) => void;
  hintChips: LogMealHintChip[];
  freeTextSuggestions: LogMealSuggestionItem[];
  showFreeTextSuggestions: boolean;
  freeTextSuggestionAnchor: { top: number; left: number };
  onPickSuggestion: (item: LogMealSuggestionItem) => void;
  onAppendQuickSnippet: (text: string) => void;
  lastLoggedRaw: string | null;
  onLogAgain: (raw: string) => void;
  showBarcodePanel: boolean;
  onToggleBarcodePanel: () => void;
  barcodeVideoRef: RefObject<HTMLVideoElement | null>;
  barcodeScanning: boolean;
  barcodeValue: string;
  onBarcodeValueChange: (value: string) => void;
  barcodeBusy: boolean;
  barcodeError: string | null;
  onLookupBarcode: (value: string) => void;
  onCloseBarcodePanel: () => void;
  onToggleBarcodeScanner: () => void;
  result: LogMealAnalysisResult | null;
  onClearResult: () => void;
};

const FORM_ID = "log-meal-form";

export function LogMealView({
  logInputMode,
  onSwitchInputMode,
  text,
  onFreeTextChange,
  onFreeTextFocus,
  onFreeTextBlur,
  textareaRef,
  composerRows,
  onComposerRowsChange,
  onSuggestionPicked,
  busy,
  loading,
  canSubmit,
  onSubmit,
  hintChips,
  freeTextSuggestions,
  showFreeTextSuggestions,
  freeTextSuggestionAnchor,
  onPickSuggestion,
  onAppendQuickSnippet,
  lastLoggedRaw,
  onLogAgain,
  showBarcodePanel,
  onToggleBarcodePanel,
  barcodeVideoRef,
  barcodeScanning,
  barcodeValue,
  onBarcodeValueChange,
  barcodeBusy,
  barcodeError,
  onLookupBarcode,
  onCloseBarcodePanel,
  onToggleBarcodeScanner,
  result,
  onClearResult,
}: LogMealViewProps) {
  const submitLabel = loading ? "Analyzing..." : "Log meal";

  return (
    <div className="flex flex-col gap-5 pb-32 sm:pb-24">
      <section
        aria-label="Meal entry"
        className="overflow-hidden rounded-[1.75rem] border border-black/[0.08] bg-white/90 shadow-[0_18px_60px_-38px_rgba(23,20,18,0.42)]"
      >
        <div
          role="tablist"
          aria-label="Input method"
          className="grid grid-cols-2 gap-1 border-b border-black/10 bg-[#f7f3e9]/70 p-1.5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={logInputMode === "free"}
            id="log-tab-free"
            aria-controls="log-panel-input"
            onClick={() => onSwitchInputMode("free")}
            className={`focus-ring tap-target flex cursor-pointer items-center justify-center gap-2 rounded-2xl px-3 py-3 text-xs font-bold transition-colors duration-200 sm:text-sm ${
              logInputMode === "free"
                ? "bg-[#171412] text-white shadow-[0_8px_24px_-12px_rgba(23,20,18,0.55)]"
                : "text-zinc-600 hover:bg-white/80 hover:text-[#171412]"
            }`}
          >
            <Keyboard className="h-4 w-4 shrink-0" aria-hidden />
            Describe
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={logInputMode === "composer"}
            id="log-tab-build"
            aria-controls="log-panel-input"
            onClick={() => onSwitchInputMode("composer")}
            className={`focus-ring tap-target flex cursor-pointer items-center justify-center gap-2 rounded-2xl px-3 py-3 text-xs font-bold transition-colors duration-200 sm:text-sm ${
              logInputMode === "composer"
                ? "bg-[#171412] text-white shadow-[0_8px_24px_-12px_rgba(23,20,18,0.55)]"
                : "text-zinc-600 hover:bg-white/80 hover:text-[#171412]"
            }`}
          >
            <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden />
            Build rows
          </button>
        </div>

        <form
          id={FORM_ID}
          onSubmit={onSubmit}
          className="flex flex-col gap-5 p-4 sm:p-6"
        >
          <div id="log-panel-input" role="tabpanel" aria-labelledby={logInputMode === "free" ? "log-tab-free" : "log-tab-build"}>
            <label
              htmlFor="meal-log-input"
              className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500"
            >
              What did you eat?
            </label>

            {logInputMode === "free" ? (
              <div className="relative">
                <textarea
                  id="meal-log-input"
                  ref={textareaRef}
                  value={text}
                  onChange={(e) =>
                    onFreeTextChange(
                      e.target.value,
                      e.target.selectionStart ?? e.target.value.length,
                    )
                  }
                  onFocus={onFreeTextFocus}
                  onClick={(e) =>
                    onFreeTextChange(
                      e.currentTarget.value,
                      e.currentTarget.selectionStart ??
                        e.currentTarget.value.length,
                    )
                  }
                  onKeyUp={(e) =>
                    onFreeTextChange(
                      e.currentTarget.value,
                      e.currentTarget.selectionStart ??
                        e.currentTarget.value.length,
                    )
                  }
                  onBlur={onFreeTextBlur}
                  rows={5}
                  placeholder="Example: 2 eggs, spinach, and toast with butter"
                  className={`input-field w-full resize-none rounded-3xl bg-[#fffdf7] px-5 py-4 text-base leading-relaxed sm:text-lg ${
                    hintChips.some((row) => row.showChip) ? "md:pr-48" : ""
                  }`}
                />
                {hintChips.some((row) => row.showChip) ? (
                  <div
                    className="pointer-events-none absolute inset-0 right-3 hidden md:block"
                    aria-hidden
                  >
                    {hintChips
                      .filter((row) => row.showChip)
                      .map((row) => (
                        <div
                          key={`side-${row.key}`}
                          style={{ top: `${mealLogLineHintTopPx(row.lineIndex)}px` }}
                          className="absolute right-0 max-w-[11rem] truncate rounded-xl border border-[#4f9d45]/20 bg-[#eaf7df] px-2.5 py-1 text-right text-[10px] font-bold text-[#356d30]"
                        >
                          {row.grams != null && row.kcal != null
                            ? `${Math.round(row.grams)}g · ${Math.round(row.kcal)} kcal`
                            : "Add amount (e.g. 2 eggs or 80g)"}
                        </div>
                      ))}
                  </div>
                ) : null}
                {hintChips.some((row) => row.showChip) ? (
                  <div className="mt-2 flex flex-col gap-1.5 md:hidden">
                    {hintChips
                      .filter((row) => row.showChip)
                      .map((row) => (
                        <div
                          key={`mobile-side-${row.key}`}
                          className="w-fit rounded-xl border border-[#4f9d45]/20 bg-[#eaf7df] px-2.5 py-1 text-[10px] font-bold text-[#356d30]"
                        >
                          {row.grams != null && row.kcal != null
                            ? `${Math.round(row.grams)}g · ${Math.round(row.kcal)} kcal`
                            : "Add amount (e.g. 2 eggs or 80g)"}
                        </div>
                      ))}
                  </div>
                ) : null}
                {logInputMode === "free" ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-3 flex flex-wrap gap-2"
                    aria-label="Quick portion examples"
                  >
                    {PORTION_QUICK_SNIPPETS.map((snippet) => (
                      <button
                        key={snippet.label}
                        type="button"
                        disabled={busy}
                        onClick={() => onAppendQuickSnippet(snippet.text)}
                        className="focus-ring tap-target cursor-pointer rounded-full border border-black/10 bg-white px-3 py-1.5 text-[11px] font-bold text-zinc-700 transition-colors duration-200 hover:border-[#4f9d45]/30 hover:bg-[#f2f8ec] hover:text-[#171412] disabled:opacity-40"
                      >
                        {snippet.label}
                      </button>
                    ))}
                  </motion.div>
                ) : null}
                {showFreeTextSuggestions && freeTextSuggestions.length > 0 ? (
                  <ul
                    className="absolute z-40 max-h-56 w-[min(20rem,calc(100%-1rem))] overflow-auto rounded-2xl border border-black/10 bg-white p-1.5 shadow-[0_20px_40px_-24px_rgba(23,20,18,0.5)]"
                    style={{
                      left: `${freeTextSuggestionAnchor.left}px`,
                      top: `${freeTextSuggestionAnchor.top}px`,
                    }}
                  >
                    {freeTextSuggestions
                      .filter(
                        (item): item is LogMealSuggestionItem =>
                          !!item &&
                          typeof item.label === "string" &&
                          item.label.length > 0,
                      )
                      .map((item, index) => (
                        <li
                          key={
                            item.source === "prepared" && item.preparedMealId
                              ? `free-prepared-${item.preparedMealId}`
                              : `free-usda-${item.fdcId}-${item.label}-${index}`
                          }
                        >
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              onPickSuggestion(item);
                            }}
                            className="focus-ring w-full cursor-pointer rounded-xl px-3 py-2.5 text-left text-sm font-medium text-zinc-800 transition-colors duration-200 hover:bg-[#f7f3e9]"
                          >
                            <span className="flex items-center justify-between gap-3">
                              <span className="flex min-w-0 items-center gap-2">
                                {item.source === "prepared" ? (
                                  <span className="shrink-0 rounded-md bg-violet-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-violet-800">
                                    Prepared
                                  </span>
                                ) : null}
                                <span className="truncate">{item.label}</span>
                              </span>
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
            ) : (
              <MealItemComposer
                rows={composerRows}
                onChange={onComposerRowsChange}
                onSuggestionPicked={onSuggestionPicked}
                disabled={busy}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <p className="w-full text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 sm:w-auto sm:mr-auto">
              Quick actions
            </p>
            <AnimatePresence>
              {lastLoggedRaw ? (
                <motion.button
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  type="button"
                  onClick={() => onLogAgain(lastLoggedRaw)}
                  className="focus-ring tap-target inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-xs font-bold text-[#171412] transition-colors duration-200 hover:border-[#4f9d45]/30 hover:bg-[#f2f8ec]"
                >
                  <HistoryIcon className="h-3.5 w-3.5" aria-hidden />
                  Repeat last
                </motion.button>
              ) : null}
            </AnimatePresence>
            <button
              type="button"
              onClick={onToggleBarcodePanel}
              className="focus-ring tap-target inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-xs font-bold text-zinc-600 transition-colors duration-200 hover:border-[#4f9d45]/30 hover:bg-[#f2f8ec] hover:text-[#171412]"
            >
              <ScanLine className="h-3.5 w-3.5" aria-hidden />
              Barcode
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="btn-primary hidden w-full cursor-pointer sm:inline-flex sm:w-auto sm:min-w-[180px]"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4 animate-pulse" aria-hidden />
                {submitLabel}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                {submitLabel}
                <ChevronRight className="h-4 w-4" aria-hidden />
              </span>
            )}
          </button>
        </form>
      </section>

      <AnimatePresence mode="wait">
        {result ? (
          <LogMealAnalysisReceipt result={result} onClear={onClearResult} />
        ) : null}
      </AnimatePresence>

      {result ? (
        <Link
          href="/dashboard"
          className="btn-secondary inline-flex w-full cursor-pointer items-center justify-center gap-2 sm:w-auto"
        >
          View today
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : null}

      <div
        className="fixed inset-x-0 z-40 border-t border-black/10 bg-[#fbfaf5]/95 px-4 py-3 backdrop-blur-md sm:hidden"
        style={{ bottom: "calc(5.75rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <button
          type="submit"
          form={FORM_ID}
          disabled={loading || !canSubmit}
          className="btn-primary w-full cursor-pointer"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Zap className="h-4 w-4 animate-pulse" aria-hidden />
              {submitLabel}
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              {submitLabel}
              <ChevronRight className="h-4 w-4" aria-hidden />
            </span>
          )}
        </button>
      </div>

      {showBarcodePanel ? (
        <div
          className="fixed inset-0 bg-black"
          style={{ zIndex: Z_INDEX.barcode }}
        >
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
              onClick={onCloseBarcodePanel}
              className="focus-ring cursor-pointer rounded-full border border-white/30 bg-black/45 p-2 text-white transition-colors duration-200 hover:bg-black/65"
              aria-label="Close barcode panel"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div className="absolute inset-x-0 bottom-0 space-y-3 bg-gradient-to-t from-black/85 via-black/65 to-transparent p-4 pb-5">
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={barcodeValue}
                onChange={(e) => onBarcodeValueChange(e.target.value)}
                placeholder="Enter barcode digits"
                aria-label="Barcode number"
                className="min-w-0 flex-1 rounded-xl border border-white/30 bg-black/45 px-3 py-2.5 text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/40"
              />
              <button
                type="button"
                onClick={() => onLookupBarcode(barcodeValue)}
                disabled={barcodeBusy || barcodeValue.trim().length < 6}
                className="focus-ring tap-target cursor-pointer rounded-xl border border-white/30 bg-white/20 px-4 py-2.5 text-xs font-bold text-white transition-colors duration-200 hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {barcodeBusy ? "Looking up..." : "Use barcode"}
              </button>
            </div>
            <button
              type="button"
              onClick={onToggleBarcodeScanner}
              className="focus-ring tap-target inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/30 bg-white/20 px-4 py-2.5 text-xs font-bold text-white transition-colors duration-200 hover:bg-white/30"
            >
              <Camera className="h-3.5 w-3.5" aria-hidden />
              {barcodeScanning ? "Stop camera" : "Scan with camera"}
            </button>
            {barcodeError ? (
              <p className="text-xs font-semibold text-red-200" role="alert">
                {barcodeError}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
