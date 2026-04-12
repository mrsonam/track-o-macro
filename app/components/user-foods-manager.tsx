"use client";

import { useCallback, useEffect, useState } from "react";

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
    <section className="mt-12 border-t border-stone-200 pt-10">
      <h2 className="text-lg font-semibold text-stone-900">My foods</h2>
      <p className="mt-2 max-w-lg text-sm leading-relaxed text-stone-600">
        Save nutrition <span className="font-medium text-stone-800">per 100 g</span>
        . When you log that ingredient by name (same wording as in your meal
        text), it overrides USDA and estimates. Editing bumps the version so
        you know values changed.
      </p>

      {error ? (
        <div
          className="mt-4 rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-900"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <form
        onSubmit={(e) => void onAdd(e)}
        className="mt-6 rounded-xl border border-stone-200/90 bg-white/90 p-4 shadow-sm"
      >
        <p className="text-xs font-medium text-stone-600">Add a food</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-stone-600">
            Name (match in logs)
            <input
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              className="input-field mt-1"
              placeholder="e.g. homemade protein bar"
              maxLength={200}
              required
            />
          </label>
          <label className="block text-xs font-medium text-stone-600">
            kcal / 100 g
            <input
              type="number"
              step="any"
              min={0}
              value={form.kcalPer100g}
              onChange={(e) =>
                setForm((f) => ({ ...f, kcalPer100g: e.target.value }))
              }
              className="input-field mt-1"
              required
            />
          </label>
          <label className="block text-xs font-medium text-stone-600">
            Protein g / 100 g
            <input
              type="number"
              step="any"
              min={0}
              value={form.proteinPer100g}
              onChange={(e) =>
                setForm((f) => ({ ...f, proteinPer100g: e.target.value }))
              }
              className="input-field mt-1"
              required
            />
          </label>
          <label className="block text-xs font-medium text-stone-600">
            Carbs g / 100 g
            <input
              type="number"
              step="any"
              min={0}
              value={form.carbsPer100g}
              onChange={(e) =>
                setForm((f) => ({ ...f, carbsPer100g: e.target.value }))
              }
              className="input-field mt-1"
              required
            />
          </label>
          <label className="block text-xs font-medium text-stone-600 sm:col-span-2">
            Fat g / 100 g
            <input
              type="number"
              step="any"
              min={0}
              value={form.fatPer100g}
              onChange={(e) =>
                setForm((f) => ({ ...f, fatPer100g: e.target.value }))
              }
              className="input-field mt-1 max-w-xs"
              required
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="btn-primary mt-4 px-4 py-2 text-sm"
        >
          {saving ? "Saving…" : "Save food"}
        </button>
      </form>

      {loading ? (
        <p className="mt-6 text-sm text-stone-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="mt-6 text-sm text-stone-600">No custom foods yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((row) =>
            editingId === row.id ? (
              <li
                key={row.id}
                className="rounded-xl border border-violet-200/90 bg-violet-50/40 p-4"
              >
                <p className="text-xs font-medium text-stone-600">Edit food</p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs text-stone-600">
                    Name
                    <input
                      value={editForm.label}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, label: e.target.value }))
                      }
                      className="input-field mt-1"
                      maxLength={200}
                    />
                  </label>
                  <label className="block text-xs text-stone-600">
                    kcal / 100 g
                    <input
                      type="number"
                      step="any"
                      min={0}
                      value={editForm.kcalPer100g}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          kcalPer100g: e.target.value,
                        }))
                      }
                      className="input-field mt-1"
                    />
                  </label>
                  <label className="block text-xs text-stone-600">
                    P / 100 g
                    <input
                      type="number"
                      step="any"
                      min={0}
                      value={editForm.proteinPer100g}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          proteinPer100g: e.target.value,
                        }))
                      }
                      className="input-field mt-1"
                    />
                  </label>
                  <label className="block text-xs text-stone-600">
                    C / 100 g
                    <input
                      type="number"
                      step="any"
                      min={0}
                      value={editForm.carbsPer100g}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          carbsPer100g: e.target.value,
                        }))
                      }
                      className="input-field mt-1"
                    />
                  </label>
                  <label className="block text-xs text-stone-600 sm:col-span-2">
                    F / 100 g
                    <input
                      type="number"
                      step="any"
                      min={0}
                      value={editForm.fatPer100g}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, fatPer100g: e.target.value }))
                      }
                      className="input-field mt-1 max-w-xs"
                    />
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void onSaveEdit(row.id)}
                    className="btn-primary px-4 py-2 text-sm"
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={cancelEdit}
                    className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800"
                  >
                    Cancel
                  </button>
                </div>
              </li>
            ) : (
              <li
                key={row.id}
                className="flex flex-col gap-2 rounded-xl border border-stone-200/90 bg-white/90 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-stone-900">{row.label}</p>
                  <p className="mt-1 text-xs tabular-nums text-stone-600">
                    {row.kcalPer100g} kcal · P {row.proteinPer100g} · C{" "}
                    {row.carbsPer100g} · F {row.fatPer100g} (per 100 g) · v
                    {row.version}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(row)}
                    className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-800 hover:bg-stone-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDelete(row.id)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  );
}
