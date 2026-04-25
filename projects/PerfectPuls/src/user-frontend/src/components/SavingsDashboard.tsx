"use client";

import { useState } from "react";
import { TrendingUp, ShieldCheck, ChevronDown } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { MONTHS, Month, monthlyData, yearData, Category } from "@/lib/data";

const COLORS = ["#0d9488", "#14b8a6", "#5eead4", "#99f6e4", "#0891b2", "#22d3ee"];
const FILTERS = ["All", "Medical", "Wellness", "Mental Health"] as const;
type Filter = (typeof FILTERS)[number];
type View = "year" | "month";

const CATEGORY_ICONS: Record<string, string> = {
  Physiotherapy: "🦴",
  Acupuncture: "🪡",
  Nutrition: "🥗",
  "Mental Health": "🧠",
  Dental: "🦷",
  Vision: "👁️",
};

export default function SavingsDashboard() {
  const [view, setView] = useState<View>("year");
  const [selectedMonth, setSelectedMonth] = useState<Month>("April");
  const [filter, setFilter] = useState<Filter>("All");
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const dataset = view === "year" ? yearData : monthlyData[selectedMonth];
  const filtered: Category[] =
    filter === "All" ? dataset.categories : dataset.categories.filter((c) => c.type === filter);

  return (
    <div className="space-y-6">
      {/* Hero Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-teal-500 to-teal-700 p-6 rounded-2xl text-white shadow-lg">
          <div className="flex items-center gap-2 mb-1 opacity-80">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">
              {view === "year" ? "Total Saved This Year" : `Total Saved in ${selectedMonth}`}
            </span>
          </div>
          <p className="text-4xl font-bold">${dataset.totalSaved.toLocaleString()}</p>
          <p className="text-teal-100 text-xs mt-1">in insurance benefits</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-700 p-6 rounded-2xl text-white shadow-lg">
          <div className="flex items-center gap-2 mb-1 opacity-80">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-sm">
              {view === "year" ? "Out-of-Pocket Avoided This Year" : `Out-of-Pocket Avoided in ${selectedMonth}`}
            </span>
          </div>
          <p className="text-4xl font-bold">${dataset.outOfPocketAvoided.toLocaleString()}</p>
          <p className="text-green-100 text-xs mt-1">direct costs covered</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Filter buttons */}
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-teal-600 text-white shadow"
                  : "bg-white text-gray-600 shadow hover:bg-teal-50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* View toggle + month picker */}
        <div className="ml-auto flex items-center gap-2">
          <div className="flex bg-white rounded-lg shadow overflow-hidden">
            {(["month", "year"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  view === v ? "bg-teal-600 text-white" : "text-gray-600 hover:bg-teal-50"
                }`}
              >
                {v === "month" ? "This Month" : "This Year"}
              </button>
            ))}
          </div>

          {view === "month" && (
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value as Month)}
                className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-gray-700 shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {MONTHS.map((m) => (
                  <option key={m} value={m}>{m} 2026</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          )}
        </div>
      </div>

      {/* Category Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-400">
          No categories found for &quot;{filter}&quot;.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((cat) => {
            const sessionPct = Math.round((cat.sessionsUsed / cat.sessionsTotal) * 100);
            const allowancePct = Math.round((cat.allowanceUsed / cat.allowanceTotal) * 100);
            const remaining = cat.allowanceTotal - cat.allowanceUsed;
            const sessionsLeft = cat.sessionsTotal - cat.sessionsUsed;
            const isHovered = hoveredCard === cat.name;

            return (
              <div
                key={cat.name}
                className="relative bg-white p-5 rounded-2xl shadow hover:shadow-xl transition-all duration-200 cursor-default"
                onMouseEnter={() => setHoveredCard(cat.name)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute -top-20 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 z-20 w-52 shadow-xl pointer-events-none">
                    <p className="font-semibold mb-1">{cat.name}</p>
                    <p>{sessionsLeft} session{sessionsLeft !== 1 ? "s" : ""} remaining</p>
                    <p>${remaining.toLocaleString()} allowance left</p>
                    <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                  </div>
                )}

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{CATEGORY_ICONS[cat.name] ?? "💊"}</span>
                    <h2 className="font-semibold text-gray-800">{cat.name}</h2>
                  </div>
                  <span className="text-xs text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                    {cat.type}
                  </span>
                </div>

                {/* Sessions progress */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Sessions used</span>
                    <span>{cat.sessionsUsed} / {cat.sessionsTotal}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full">
                    <div
                      className="bg-teal-400 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${sessionPct}%` }}
                    />
                  </div>
                </div>

                {/* Allowance progress */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Allowance used</span>
                    <span>${cat.allowanceUsed.toLocaleString()} / ${cat.allowanceTotal.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full">
                    <div
                      className="bg-green-400 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${allowancePct}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between text-sm mt-2">
                  <span className="text-gray-500">{allowancePct}% used</span>
                  <span className="text-teal-600 font-semibold">
                    ${cat.saved.toLocaleString()} saved
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Donut Chart */}
      {filtered.length > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow">
          <h2 className="font-semibold text-gray-800 mb-4">Savings Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={filtered}
                dataKey="saved"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={75}
                outerRadius={115}
                paddingAngle={3}
              >
                {filtered.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`$${v}`, "Saved"]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-2xl shadow">
        <h2 className="font-semibold text-gray-800 mb-4">Recent Activity</h2>
        <div className="divide-y divide-gray-100">
          {dataset.recentActivity.map((item, i) => (
            <div key={i} className="flex justify-between items-center py-3">
              <div className="flex items-center gap-3">
                <span className="text-lg">{CATEGORY_ICONS[item.service] ?? "💊"}</span>
                <div>
                  <p className="text-sm font-medium text-gray-700">{item.service}</p>
                  <p className="text-xs text-gray-400">{item.provider} · {item.date}</p>
                </div>
              </div>
              <span className="text-teal-600 font-semibold text-sm">+${item.saved}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
