import { BarChart3, ChefHat, Table2, Timer } from "lucide-react";

export const featureIcons = ["sparkles", "chef-hat", "bar-chart-3"] as const;
export type FeatureIconId = (typeof featureIcons)[number];

export const features = [
  {
    icon: "sparkles" as const,
    title: "Log in plain language",
    body: "Describe meals naturally. Ingredients resolve to USDA-backed nutrition with live search as you type.",
  },
  {
    icon: "chef-hat" as const,
    title: "Cook once, weigh portions",
    body: "Build prepared batches, preview full macros, then log by grams from home with one search.",
  },
  {
    icon: "bar-chart-3" as const,
    title: "See the week clearly",
    body: "Rolling trends, targets, and hydration in a calm dashboard built for daily use.",
  },
] as const;

export const steps = [
  { n: "01", label: "Describe or scan", detail: "Type ingredients, pick matches, or scan a barcode." },
  { n: "02", label: "Review macros", detail: "Kcal, protein, carbs, and fat line by line before you save." },
  { n: "03", label: "Stay on rhythm", detail: "Watch patterns emerge without spreadsheet friction." },
] as const;

export const painPoints = [
  {
    icon: Table2,
    title: "Spreadsheet fatigue",
    body: "Copying grams into tabs after every meal breaks the rhythm you are trying to build.",
  },
  {
    icon: Timer,
    title: "Slow at the table",
    body: "If logging takes longer than eating, the habit will not stick, especially on busy days.",
  },
  {
    icon: BarChart3,
    title: "Trends buried in noise",
    body: "Weekly patterns should be one calm glance, not a maze of charts and guilt metrics.",
  },
] as const;

export const navAnchors = [
  { href: "#why", label: "Why" },
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
] as const;
