"use client";

import { useCallback, useEffect, useState } from "react";
import { 
  Plus, 
  Trash2, 
  Edit3, 
  X, 
  Save, 
  Database, 
  Flame, 
  Zap, 
  UtensilsCrossed, 
  AlertCircle 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Row = {
  id: string;
  label: string;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  version: number;
};

const emptyForm = {
  label: "",
  kcalPer100g: "",
  proteinPer100g: "",
  carbsPer100g: "",
  fatPer100g: "",
};

export function UserFoodsManager() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/user-foods");
      const data = (await res.json()) as { items?: Row[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not load foods");
        return;
      }
      setItems(data.items ?? []);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/user-foods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: form.label.trim(),
          kcalPer100g: parseFloat(form.kcalPer100g),
          proteinPer100g: parseFloat(form.proteinPer100g),
          carbsPer100g: parseFloat(form.carbsPer100g),
          fatPer100g: parseFloat(form.fatPer100g),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not save");
        return;
      }
      setForm(emptyForm);
      await load();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(row: Row) {
    setEditingId(row.id);
    setEditForm({
      label: row.label,
      kcalPer100g: String(row.kcalPer100g),
      proteinPer100g: String(row.proteinPer100g),
      carbsPer100g: String(row.carbsPer100g),
      fatPer100g: String(row.fatPer100g),
    });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(emptyForm);
  }

  async function onSaveEdit(id: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/user-foods/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: editForm.label.trim(),
          kcalPer100g: parseFloat(editForm.kcalPer100g),
          proteinPer100g: parseFloat(editForm.proteinPer100g),
          carbsPer100g: parseFloat(editForm.carbsPer100g),
          fatPer100g: parseFloat(editForm.fatPer100g),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not update");
        return;
      }
      cancelEdit();
      await load();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Remove this saved food? Logging will fall back to USDA/estimates.")) {
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/user-foods/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Could not delete");
        return;
      }
      if (editingId === id) cancelEdit();
      await load();
    } catch {
      setError("Network error");
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Introduction */}
      <div className="rounded-3xl bg-zinc-950 p-8 border border-white/5 shadow-inner">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <h3 className="text-xl font-bold text-white">Custom Ingredient override</h3>
        </div>
        <p className="text-sm text-zinc-500 leading-relaxed max-w-2xl">
          Define nutritional values <span className="text-emerald-500 font-bold">per 100g</span>. 
          When we detect these exact labels in your logs, your custom data will override USDA defaults.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Add Food Form */}
      <section className="bento-card bg-zinc-900/40 p-1 ring-1 ring-white/5">
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-8">
            <Plus className="h-4 w-4 text-emerald-500" />
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Registry Entry</h4>
          </div>

          <form onSubmit={(e) => void onAdd(e)} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <label className="lg:col-span-2 flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Canonical Label</span>
                <input
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  className="w-full rounded-2xl bg-zinc-950 px-5 py-4 text-white focus:ring-1 focus:ring-emerald-500 outline-none border border-white/5"
                  placeholder="e.g. My Custom Sourdough"
                  required
                />
              </label>
              
              <label className="flex flex-col gap-2">
                 <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Energy (kcal)</span>
                 <input
                  type="number"
                  step="any"
                  value={form.kcalPer100g}
                  onChange={(e) => setForm((f) => ({ ...f, kcalPer100g: e.target.value }))}
                  className="w-full rounded-2xl bg-zinc-950 px-5 py-4 text-white focus:ring-1 focus:ring-emerald-500 outline-none border border-white/5"
                  required
                />
              </label>

              <label className="flex flex-col gap-2">
                 <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Protein (g)</span>
                 <input
                  type="number"
                  step="any"
                  value={form.proteinPer100g}
                  onChange={(e) => setForm((f) => ({ ...f, proteinPer100g: e.target.value }))}
                  className="w-full rounded-2xl bg-zinc-950 px-5 py-4 text-white focus:ring-1 focus:ring-emerald-500 outline-none border border-white/5"
                  required
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="flex flex-col gap-2">
                 <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Carbs (g)</span>
                 <input
                  type="number"
                  step="any"
                  value={form.carbsPer100g}
                  onChange={(e) => setForm((f) => ({ ...f, carbsPer100g: e.target.value }))}
                  className="w-full rounded-2xl bg-zinc-950 px-5 py-4 text-white focus:ring-1 focus:ring-emerald-500 outline-none border border-white/5"
                  required
                />
              </label>
              
              <label className="flex flex-col gap-2">
                 <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Fat (g)</span>
                 <input
                  type="number"
                  step="any"
                  value={form.fatPer100g}
                  onChange={(e) => setForm((f) => ({ ...f, fatPer100g: e.target.value }))}
                  className="w-full rounded-2xl bg-zinc-950 px-5 py-4 text-white focus:ring-1 focus:ring-emerald-500 outline-none border border-white/5"
                  required
                />
              </label>
            </div>

            <button type="submit" disabled={saving} className="btn-primary w-fit mt-2">
              {saving ? "Processing..." : "Commit Ingredient"}
            </button>
          </form>
        </div>
      </section>

      {/* List */}
      <div className="space-y-4">
        <div className="flex items-center gap-4 mb-2">
          <Database className="h-4 w-4 text-zinc-700" />
          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700">Stored Library</h4>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="h-8 w-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-xs text-zinc-700 font-bold uppercase tracking-widest">Database Empty</p>
        ) : (
          <ul className="grid grid-cols-1 gap-4">
            <AnimatePresence mode="popLayout">
              {items.map((row) => (
                <motion.li
                  key={row.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="group relative rounded-3xl border border-white/[0.05] bg-zinc-900/50 p-6 transition-all hover:bg-zinc-900/80"
                >
                  {editingId === row.id ? (
                    <div className="flex flex-col gap-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                          value={editForm.label}
                          onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
                          className="w-full rounded-xl bg-zinc-950 px-4 py-3 text-sm text-white outline-none border border-white/10"
                        />
                        <div className="grid grid-cols-4 gap-2">
                           <input type="number" step="any" value={editForm.kcalPer100g} onChange={(e) => setEditForm(f => ({...f, kcalPer100g: e.target.value}))} className="rounded-xl bg-zinc-950 p-2 text-xs text-center border border-white/10" title="kcal" />
                           <input type="number" step="any" value={editForm.proteinPer100g} onChange={(e) => setEditForm(f => ({...f, proteinPer100g: e.target.value}))} className="rounded-xl bg-zinc-950 p-2 text-xs text-center border border-white/10" title="P" />
                           <input type="number" step="any" value={editForm.carbsPer100g} onChange={(e) => setEditForm(f => ({...f, carbsPer100g: e.target.value}))} className="rounded-xl bg-zinc-950 p-2 text-xs text-center border border-white/10" title="C" />
                           <input type="number" step="any" value={editForm.fatPer100g} onChange={(e) => setEditForm(f => ({...f, fatPer100g: e.target.value}))} className="rounded-xl bg-zinc-950 p-2 text-xs text-center border border-white/10" title="F" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => void onSaveEdit(row.id)} className="bg-emerald-500 text-zinc-950 px-4 py-2 rounded-xl text-xs font-bold">Save</button>
                        <button onClick={cancelEdit} className="bg-zinc-800 text-white px-4 py-2 rounded-xl text-xs font-bold">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-[10px] font-black uppercase text-zinc-500">v{row.version} protocol active</span>
                        </div>
                        <h5 className="text-lg font-bold text-white tracking-tight">{row.label}</h5>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="flex gap-4 border-r border-white/5 pr-6">
                          <div className="text-center">
                            <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">Kcal</p>
                            <p className="text-sm font-bold text-white">{row.kcalPer100g}</p>
                          </div>
                          <div className="text-center">
                             <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">P</p>
                            <p className="text-sm font-bold text-emerald-400">{row.proteinPer100g}g</p>
                          </div>
                          <div className="text-center">
                             <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">C</p>
                            <p className="text-sm font-bold text-lime-400">{row.carbsPer100g}g</p>
                          </div>
                   <div className="text-center">
                             <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">F</p>
                            <p className="text-sm font-bold text-amber-500">{row.fatPer100g}g</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => startEdit(row)}
                            className="p-2 rounded-xl bg-zinc-950 text-zinc-500 hover:text-white transition-colors"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => void onDelete(row.id)}
                            className="p-2 rounded-xl bg-zinc-950 text-zinc-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}
