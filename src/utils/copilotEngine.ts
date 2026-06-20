/* ------------------------------------------------------------------ *
 * Copilot Engine
 *
 * 把 7 类 insight 模板（机会 + 风险）的文案从硬编码英文迁到 i18n。
 * 接受外部传入的 t() — 让数据层无状态地生成"已经翻译过"的 insight。
 *
 * 数据输入：rooms (Room[])、arrivals (Guest[])、shiftNotes (ShiftNote[])、
 *          guestProfiles (GuestProfile[])、groupBookings (GroupBooking[])。
 *
 * 输出对齐 types.CopilotInsight（type / severity / title / description
 * / actionLabel / actionTarget / relatedIds / dismissed）。
 * ------------------------------------------------------------------ */

import {
  Room,
  Guest,
  GuestProfile,
  GroupBooking,
  CopilotInsight,
  InsightSeverity,
} from "../types";

export type { CopilotInsight, InsightSeverity };

export type TranslateFn = (
  path: string,
  params?: Record<string, string | number>,
) => string;

// 用函数替代模块级常量，避免应用长时间运行后 TODAY 过期导致洞察数据错乱
function getToday(): Date {
  return new Date();
}

/* --------------------- 今日小结 --------------------- */
export function generateTodaySummary(
  rooms: Room[],
  arrivals: Guest[],
  t: TranslateFn,
) {
  const totalBeds = rooms.reduce(
    (s, r) => s + r.beds.length,
    0,
  );
  const occupied = rooms.reduce(
    (s, r) => s + r.beds.filter((b) => b.status === "occupied").length,
    0,
  );
  const cleaningBeds = rooms.reduce(
    (s, r) => s + r.beds.filter((b) => b.status === "cleaning").length,
    0,
  );
  const emptyBeds = rooms.reduce(
    (s, r) => s + r.beds.filter((b) => b.status === "empty").length,
    0,
  );

  // 今日 check-in = 入住日期 = 今天的 guest
  const todayStr = getToday().toISOString().slice(0, 10);
  const checkIns = arrivals.filter((g) => g.checkInDate?.slice(0, 10) === todayStr).length;
  const checkOuts = arrivals.filter((g) => g.checkOutDate?.slice(0, 10) === todayStr).length;

  return {
    totalBeds,
    occupied,
    cleaningBeds,
    emptyBeds,
    checkIns,
    checkOuts,
    occupancy: totalBeds > 0 ? Math.round((occupied / totalBeds) * 100) : 0,
    hello: t("assistant.todaySummary.hello"),
  };
}

/* --------------------- 本周预测 --------------------- *
 * 返回：daily（7 天细条形图）+ threeDay（前三天的卡片数据）
 * threeDay 字段预留给 Hero 下方的「接下来 3 天」strip。
 * canFill = 该天理论上可填的床数（满房时为 0）。
 * ----------------------------------------------- */
export interface ThreeDayEntry {
  date: string;
  occupancyRate: number;
  emptyBeds: number;
  canFill: number;
}

export function generateWeekForecast(
  rooms: Room[],
  arrivals: Guest[],
  _t: TranslateFn,
) {
  const totalBeds = rooms.reduce(
    (s, r) => s + r.beds.length,
    0,
  );

  // 7 天日期 + 占用率预测（演示用：基于当前数据 + 简单 forward projection）
  const daily: { date: string; occupancyRate: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(getToday());
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayGuests = arrivals.filter((g) => {
      const ci = g.checkInDate?.slice(0, 10);
      const co = g.checkOutDate?.slice(0, 10);
      return ci && co && ci <= dateStr && co > dateStr;
    }).length;
    const rate = totalBeds > 0 ? Math.min(100, Math.round((dayGuests / totalBeds) * 100)) : 0;
    daily.push({ date: dateStr, occupancyRate: rate });
  }

  const threeDay: ThreeDayEntry[] = daily.slice(0, 3).map((d) => {
    const emptyBeds = Math.max(0, Math.round(totalBeds * (1 - d.occupancyRate / 100)));
    return {
      date: d.date,
      occupancyRate: d.occupancyRate,
      emptyBeds,
      canFill: emptyBeds,
    };
  });

  const peakDay = daily.reduce((p, d) => (d.occupancyRate > p.occupancyRate ? d : p), daily[0]);
  const totalEmptyBedNights = daily.reduce(
    (s, d) => s + Math.round(totalBeds * (1 - d.occupancyRate / 100)),
    0,
  );
  const avgOccupancy =
    daily.length > 0
      ? Math.round(daily.reduce((s, d) => s + d.occupancyRate, 0) / daily.length)
      : 0;

  return {
    daily,
    threeDay,
    peakDay: { date: peakDay.date, rate: peakDay.occupancyRate },
    totalEmptyBedNights,
    avgOccupancy,
  };
}

/* --------------------- 机会（3 类） --------------------- */
export function generateOpportunities(
  rooms: Room[],
  guestProfiles: GuestProfile[],
  _arrivals: Guest[],
  _groupBookings: GroupBooking[],
  t: TranslateFn,
): CopilotInsight[] {
  const insights: CopilotInsight[] = [];

  // 1. 女宿空置 → 建议改混宿
  const femaleRoom = rooms.find(
    (r) => r.type === "dorm-female" && r.beds.some((b) => b.status === "empty"),
  );
  if (femaleRoom) {
    const emptyBeds = femaleRoom.beds.filter((b) => b.status === "empty").length;
    const totalBeds = femaleRoom.beds.length;
    const convertible = Math.min(emptyBeds, 2);
    insights.push({
      id: `opp-female-${femaleRoom.id}`,
      severity: "opportunity",
      type: "opportunity",
      title: t("insights.femaleRoom.title", { name: femaleRoom.name }),
      description: t("insights.femaleRoom.description", {
        empty: emptyBeds,
        total: totalBeds,
        count: convertible,
      }),
      actionLabel: t("insights.femaleRoom.actionLabel"),
      actionTarget: "grow:occupancy",
      relatedIds: [femaleRoom.id],
      createdAt: new Date().toISOString(),
      dismissed: false,
    });
  }

  // 2. 未来 3 天空床
  const empty3d = rooms.reduce(
    (s, r) =>
      s + r.beds.filter((b) => b.status === "empty" || b.status === "cleaning").length,
    0,
  );
  if (empty3d >= 3) {
    insights.push({
      id: "opp-empty-3d",
      severity: "opportunity",
      type: "opportunity",
      title: t("insights.emptyBeds3d.title", { count: empty3d }),
      description: t("insights.emptyBeds3d.description"),
      actionLabel: t("insights.emptyBeds3d.actionLabel"),
      actionTarget: "grow:pricing",
      createdAt: new Date().toISOString(),
      dismissed: false,
    });
  }

  // 3. 6+ 月未回访
  const recallable = guestProfiles.filter(
    (g) => g.lastStayDate && daysSince(g.lastStayDate) > 180,
  );
  if (recallable.length >= 1) {
    insights.push({
      id: "opp-recall-6m",
      severity: "opportunity",
      type: "opportunity",
      title: t("insights.recall6m.title", { count: recallable.length }),
      description: t("insights.recall6m.description"),
      actionLabel: t("insights.recall6m.actionLabel"),
      actionTarget: "grow:crm",
      relatedIds: recallable.map((g) => g.id),
      createdAt: new Date().toISOString(),
      dismissed: false,
    });
  }

  return insights;
}

/* --------------------- 风险（2 类 — 仅与经营者决策相关） --------------------- *
 * 旧版本曾生成 4 类风险，包含「紧急交接班」「待清洁床位」。
 * 这两个是员工执行项，对经营者的"入住率 / 现金流"决策无意义，
 * 且在交接班日志 / 床位看板 / 打扫模式 中都有独立视图——v2 移除。
 * ---------------------------------------------------------------- */
export function generateRisks(
  rooms: Room[],
  _guestProfiles: GuestProfile[],
  arrivals: Guest[],
  _groupBookings: GroupBooking[],
  t: TranslateFn,
): CopilotInsight[] {
  const insights: CopilotInsight[] = [];

  // 1. 超售
  const totalBeds = rooms.reduce((s, r) => s + r.beds.length, 0);
  const tomorrow = new Date(getToday());
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);
  const tomorrowArrivals = arrivals.filter((g) => {
    const ci = g.checkInDate?.slice(0, 10);
    const co = g.checkOutDate?.slice(0, 10);
    return ci && co && ci <= tomorrowStr && co > tomorrowStr;
  }).length;
  if (tomorrowArrivals > totalBeds) {
    insights.push({
      id: "risk-overbook",
      severity: "risk",
      type: "risk",
      title: t("insights.overbooking.title", { date: tomorrowStr }),
      description: t("insights.overbooking.description", {
        occupied: tomorrowArrivals,
        total: totalBeds,
      }),
      actionLabel: t("insights.overbooking.actionLabel"),
      actionTarget: "bedboard",
      createdAt: new Date().toISOString(),
      dismissed: false,
    });
  }

  // 2. 未确认预订 — 用未结算 (unpaid) 的 arrival 作为代理
  const unconfirmed = arrivals.filter((g) => g.paymentStatus === "unpaid");
  if (unconfirmed.length >= 1) {
    const sep = t("insights.listSeparator");
    const details = unconfirmed
      .slice(0, 2)
      .map((g) => g.name)
      .join(sep);
    insights.push({
      id: "risk-unconfirmed",
      severity: "risk",
      type: "action",
      title: t("insights.unconfirmed.title", { count: unconfirmed.length }),
      description: t("insights.unconfirmed.description", { details }),
      actionLabel: t("insights.unconfirmed.actionLabel"),
      actionTarget: "reservations",
      createdAt: new Date().toISOString(),
      dismissed: false,
    });
  }

  return insights;
}

/* --------------------- helper --------------------- */
function daysSince(dateStr: string): number {
  const d = new Date(dateStr);
  const diff = getToday().getTime() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
