import React, { useState, useMemo, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Tag,
  Plus,
  Zap,
  DollarSign,
  CalendarDays,
  Bed,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { addDays, format } from "date-fns";
import { useHostel } from "../HostelContext";
import { useTranslation, formatCurrency } from "../i18nContext";
import type { PromotionType } from "../types";

// ── Pricing demo data ──────────────────────────────────────────
const PRICING_DATA_FALLBACK = [
  { key: "peakSeason", current: 85, suggested: 110, change: 16 },
  { key: "offSeason", current: 55, suggested: 45, change: -18 },
  { key: "weekend", current: 85, suggested: 90, change: 6 },
  { key: "weekday", current: 65, suggested: 60, change: -8 },
];

const PROMO_TYPES: { value: PromotionType; labelKey: string }[] = [
  { value: "last-minute", labelKey: "revenue.typeLastMinute" },
  { value: "early-bird", labelKey: "revenue.typeEarlyBird" },
  { value: "long-stay", labelKey: "revenue.typeLongStay" },
  { value: "group-discount", labelKey: "revenue.typeGroupDiscount" },
];

const PROMO_TYPE_BADGE_COLORS: Record<PromotionType, string> = {
  "last-minute": "bg-amber-50 text-amber-700",
  "early-bird": "bg-sky-50 text-sky-700",
  "long-stay": "bg-violet-50 text-violet-700",
  "group-discount": "bg-rose-50 text-rose-700",
};

export function RevenueBoost({ autoOpenPromo, onAutoOpenPromoConsumed }: { autoOpenPromo?: boolean; onAutoOpenPromoConsumed?: () => void }) {
  const { rooms, promotions, addPromotion, togglePromotion } = useHostel();
  const { t, language } = useTranslation();

  const PRICING_DATA = useMemo(() => {
    if (rooms.length === 0) return PRICING_DATA_FALLBACK;
    const avg = Math.round(rooms.reduce((s, r) => s + r.pricePerNight, 0) / rooms.length);
    return [
      { key: "peakSeason", current: avg, suggested: Math.round(avg * 1.15), change: 15 },
      { key: "offSeason", current: Math.round(avg * 0.65), suggested: Math.round(avg * 0.55), change: -15 },
      { key: "weekend", current: avg, suggested: Math.round(avg * 1.06), change: 6 },
      { key: "weekday", current: Math.round(avg * 0.75), suggested: Math.round(avg * 0.7), change: -7 },
    ];
  }, [rooms]);

  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<PromotionType>("last-minute");
  const [formName, setFormName] = useState("");
  const [formDiscount, setFormDiscount] = useState("15");
  const [formStartDate, setFormStartDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [formEndDate, setFormEndDate] = useState(
    format(addDays(new Date(), 7), "yyyy-MM-dd")
  );
  const [formRoomType, setFormRoomType] = useState("");
  const [formMinNights, setFormMinNights] = useState("");
  const [formMinGuests, setFormMinGuests] = useState("");

  // Auto-open promo form when triggered from Dashboard
  useEffect(() => {
    if (autoOpenPromo) {
      setShowForm(true);
      onAutoOpenPromoConsumed?.();
    }
  }, [autoOpenPromo]);

  // ── Occupancy calculation ───────────────────────────────────
  const occupancyData = useMemo(() => {
    const days: {
      date: Date;
      dayName: string;
      occupancy: number;
      totalBeds: number;
      occupiedBeds: number;
    }[] = [];

    for (let i = 0; i < 7; i++) {
      const date = addDays(new Date(), i);
      const dayStr = format(date, "yyyy-MM-dd");
      const dayName = format(date, "EEE");

      let totalBeds = 0;
      let occupiedBeds = 0;

      rooms.forEach((room) => {
        room.beds.forEach((bed) => {
          totalBeds++;
          if (
            bed.status === "occupied" ||
            bed.status === "reserved" ||
            bed.status === "late-arrival"
          ) {
            occupiedBeds++;
          }
          // Check reservations for future dates
          if (bed.reservations) {
            bed.reservations.forEach((guest) => {
              const ci = guest.checkInDate;
              const co = guest.checkOutDate;
              if (dayStr >= ci && dayStr < co) {
                occupiedBeds++;
              }
            });
          }
        });
      });

      const occupancy = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
      days.push({ date, dayName, occupancy, totalBeds, occupiedBeds });
    }
    return days;
  }, [rooms]);

  // ── Empty bed alerts ────────────────────────────────────────
  const lowOccupancyDays = useMemo(
    () =>
      occupancyData.filter((d) => d.occupancy < 50),
    [occupancyData]
  );

  // ── Bar color helper ────────────────────────────────────────
  const barColor = (occ: number) => {
    if (occ > 70) return "bg-emerald-500";
    if (occ >= 40) return "bg-amber-500";
    return "bg-red-500";
  };

  const barColorLight = (occ: number) => {
    if (occ > 70) return "bg-emerald-100";
    if (occ >= 40) return "bg-amber-100";
    return "bg-red-100";
  };

  // ── Handle create promotion ─────────────────────────────────
  const handleCreatePromotion = () => {
    if (!formName.trim() || !formDiscount) return;
    addPromotion({
      type: formType,
      name: formName.trim(),
      discount: Number(formDiscount),
      startDate: formStartDate,
      endDate: formEndDate,
      roomTypeFilter: formRoomType || undefined,
      minNights:
        formType === "long-stay" && formMinNights
          ? Number(formMinNights)
          : undefined,
      minGuests:
        formType === "group-discount" && formMinGuests
          ? Number(formMinGuests)
          : undefined,
      active: true,
    });
    setShowForm(false);
    setFormName("");
    setFormDiscount("15");
    setFormStartDate(format(new Date(), "yyyy-MM-dd"));
    setFormEndDate(format(addDays(new Date(), 7), "yyyy-MM-dd"));
    setFormRoomType("");
    setFormMinNights("");
    setFormMinGuests("");
  };

  // ── Pre-fill from alert ─────────────────────────────────────
  const handleCreateFromAlert = (day: (typeof lowOccupancyDays)[number]) => {
    setFormType("last-minute");
    setFormName(`Last Minute — ${day.dayName} ${format(day.date, "MMM d")}`);
    setFormDiscount("15");
    setFormStartDate(format(day.date, "yyyy-MM-dd"));
    setFormEndDate(format(addDays(day.date, 1), "yyyy-MM-dd"));
    setShowForm(true);
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-emerald-50 rounded-lg">
          <TrendingUp className="w-5 h-5 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900">
          {t("revenue.title")}
        </h1>
      </div>

      {/* ── 1. Occupancy Overview ─────────────────────────────── */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Bed className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-zinc-900">
            {t("revenue.occupancyOverview")}
          </h2>
        </div>
        <div className="flex items-end gap-2 h-40">
          {occupancyData.map((day, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full relative h-32 flex items-end">
                <div
                  className={`w-full rounded-t-md ${barColorLight(day.occupancy)} absolute inset-0`}
                />
                <motion.div
                  className={`w-full rounded-t-md ${barColor(day.occupancy)} relative z-10`}
                  initial={{ height: 0 }}
                  animate={{ height: `${day.occupancy}%` }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {day.dayName}
              </span>
              <span
                className={`text-xs font-bold ${
                  day.occupancy > 70
                    ? "text-emerald-600"
                    : day.occupancy >= 40
                    ? "text-amber-600"
                    : "text-red-600"
                }`}
              >
                {day.occupancy}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 2. Empty Bed Alerts ───────────────────────────────── */}
      {lowOccupancyDays.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-zinc-900">
              {t("revenue.emptyBedAlerts")}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {lowOccupancyDays.map((day, i) => {
              const emptyBeds = day.totalBeds - day.occupiedBeds;
              return (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 border-l-4 border-l-amber-500"
                >
                  <p className="text-sm text-zinc-700 mb-2">
                    <span className="font-bold text-zinc-900">{emptyBeds}</span>{" "}
                    {t("revenue.emptyBedsOn")}{" "}
                    <span className="font-semibold text-zinc-900">
                      {day.dayName} {format(day.date, "MMM d")}
                    </span>{" "}
                    — {t("revenue.suggestDiscount")}
                  </p>
                  <button
                    onClick={() => handleCreateFromAlert(day)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    {t("revenue.createPromotion")}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 3. Pricing Suggestions ────────────────────────────── */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-zinc-900">
            {t("revenue.pricingSuggestions")}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground">
                  {t("revenue.season")}
                </th>
                <th className="text-right py-2 px-4 text-xs font-medium text-muted-foreground">
                  {t("revenue.currentPrice")}
                </th>
                <th className="text-right py-2 px-4 text-xs font-medium text-muted-foreground">
                  {t("revenue.suggestedPrice")}
                </th>
                <th className="text-right py-2 pl-4 text-xs font-medium text-muted-foreground">
                  {t("revenue.revenueChange")}
                </th>
              </tr>
            </thead>
            <tbody>
              {PRICING_DATA.map((row) => (
                <tr
                  key={row.key}
                  className="border-b border-zinc-50 last:border-0"
                >
                  <td className="py-2.5 pr-4 font-medium text-zinc-900">
                    {t(`revenue.${row.key}`)}
                  </td>
                  <td className="py-2.5 px-4 text-right text-zinc-600">
                    {formatCurrency(row.current, language)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-semibold text-zinc-900">
                    {formatCurrency(row.suggested, language)}
                  </td>
                  <td className="py-2.5 pl-4 text-right">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold ${
                        row.change > 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {row.change > 0 ? (
                        <TrendingUp className="w-3.5 h-3.5" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5" />
                      )}
                      {row.change > 0 ? "+" : ""}
                      {row.change}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 4. Active Promotions ──────────────────────────────── */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-zinc-900">
              {t("revenue.activePromotions")}
            </h2>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {t("revenue.newPromotion")}
          </button>
        </div>

        {promotions.length === 0 ? (
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-8 text-center">
            <Tag className="w-8 h-8 text-muted-foreground/70 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {t("revenue.noPromotions")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {promotions.map((promo) => (
              <div
                key={promo.id}
                className={`bg-white rounded-xl border border-zinc-200 shadow-sm p-4 border-l-4 ${
                  promo.active ? "border-l-emerald-500" : "border-l-zinc-300"
                } ${!promo.active ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-zinc-900">
                        {promo.name}
                      </span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          PROMO_TYPE_BADGE_COLORS[promo.type]
                        }`}
                      >
                        {t(`revenue.type${promo.type.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join("")}`)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="font-semibold text-emerald-600">
                        {promo.discount}% {t("revenue.off")}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {promo.startDate} → {promo.endDate}
                      </span>
                      {promo.minNights && (
                        <span>
                          {t("revenue.minNights")}: {promo.minNights}
                        </span>
                      )}
                      {promo.minGuests && (
                        <span>
                          {t("revenue.minGuests")}: {promo.minGuests}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => togglePromotion(promo.id)}
                    className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${
                      promo.active ? "bg-emerald-500" : "bg-zinc-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        promo.active ? "left-5" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 5. Create Promotion Form ──────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-semibold text-zinc-900">
                  {t("revenue.createPromotionTitle")}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Type */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    {t("revenue.promotionType")}
                  </label>
                  <select
                    className="w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    value={formType}
                    onChange={(e) =>
                      setFormType(e.target.value as PromotionType)
                    }
                  >
                    {PROMO_TYPES.map((pt) => (
                      <option key={pt.value} value={pt.value}>
                        {t(pt.labelKey)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Name */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    {t("revenue.promotionName")}
                  </label>
                  <input
                    className="w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder={t("revenue.promotionNamePlaceholder")}
                  />
                </div>

                {/* Discount */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    {t("revenue.discountPercent")}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    className="w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    value={formDiscount}
                    onChange={(e) => setFormDiscount(e.target.value)}
                  />
                </div>

                {/* Room type filter */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    {t("revenue.roomTypeFilter")} ({t("revenue.optional")})
                  </label>
                  <select
                    className="w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    value={formRoomType}
                    onChange={(e) => setFormRoomType(e.target.value)}
                  >
                    <option value="">{t("revenue.allRoomTypes")}</option>
                    <option value="dorm-mixed">
                      {t("revenue.mixedDorm")}
                    </option>
                    <option value="dorm-female">
                      {t("revenue.femaleDorm")}
                    </option>
                    <option value="private">
                      {t("revenue.privateRoom")}
                    </option>
                  </select>
                </div>

                {/* Start date */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    {t("revenue.startDate")}
                  </label>
                  <input
                    type="date"
                    className="w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                  />
                </div>

                {/* End date */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    {t("revenue.endDate")}
                  </label>
                  <input
                    type="date"
                    className="w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                  />
                </div>

                {/* Min nights (long-stay only) */}
                {formType === "long-stay" && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      {t("revenue.minNights")}
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                      value={formMinNights}
                      onChange={(e) => setFormMinNights(e.target.value)}
                      placeholder="7"
                    />
                  </div>
                )}

                {/* Min guests (group-discount only) */}
                {formType === "group-discount" && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      {t("revenue.minGuests")}
                    </label>
                    <input
                      type="number"
                      min="2"
                      className="w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                      value={formMinGuests}
                      onChange={(e) => setFormMinGuests(e.target.value)}
                      placeholder="4"
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-zinc-100">
                <button
                  onClick={() => setShowForm(false)}
                  className="text-sm text-muted-foreground hover:text-zinc-700 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {t("revenue.cancel")}
                </button>
                <button
                  onClick={handleCreatePromotion}
                  disabled={!formName.trim() || !formDiscount}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none px-4 py-1.5 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {t("revenue.create")}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
