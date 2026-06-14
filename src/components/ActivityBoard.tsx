import React, { useState, useMemo } from "react";
import {
  PartyPopper,
  Plus,
  Users,
  MapPin,
  Clock,
  DollarSign,
  Check,
  X,
  UserPlus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHostel } from "../HostelContext";
import { useTranslation } from "../i18nContext";
import { format, isToday, isTomorrow, parseISO, addDays } from "date-fns";
import { Activity, ActivityStatus } from "../types";

export function ActivityBoard() {
  const {
    activities,
    addActivity,
    updateActivityStatus,
    addParticipant,
    removeParticipant,
    toggleParticipantCheckIn,
    deleteActivity,
    rooms,
  } = useHostel();
  const { t } = useTranslation();

  const [filter, setFilter] = useState<"today" | "week" | "all">("today");
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(
    null
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [newActivity, setNewActivity] = useState({
    name: "",
    date: format(new Date(), "yyyy-MM-dd"),
    time: "",
    capacity: 10,
    price: 0,
    location: "",
  });
  const [newParticipantName, setNewParticipantName] = useState("");
  const [newParticipantBed, setNewParticipantBed] = useState("");

  // Current guests from rooms for reference
  const currentGuests = useMemo(() => {
    return rooms.flatMap((r) =>
      r.beds
        .filter((b) => b.status === "occupied" && b.guest)
        .map((b) => ({
          name: b.guest!.name,
          bedName: `${r.number}-${b.name}`,
        }))
    );
  }, [rooms]);

  // Filtered activities
  const filteredActivities = useMemo(() => {
    const today = new Date();
    const weekEnd = addDays(today, 7);
    return activities.filter((a) => {
      if (filter === "today") return isToday(parseISO(a.date));
      if (filter === "week") {
        const d = parseISO(a.date);
        return d >= today && d <= weekEnd;
      }
      return true;
    });
  }, [activities, filter]);

  // Status badge config
  const statusConfig: Record<
    ActivityStatus,
    { label: string; className: string }
  > = {
    upcoming: {
      label: t("activities.upcoming") || "Upcoming",
      className: "bg-blue-50 text-blue-700 border-blue-200",
    },
    ongoing: {
      label: t("activities.ongoing") || "Ongoing",
      className: "bg-amber-50 text-amber-700 border-amber-200",
    },
    completed: {
      label: t("activities.completed") || "Completed",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    cancelled: {
      label: t("activities.cancelled") || "Cancelled",
      className: "bg-red-50 text-red-700 border-red-200",
    },
  };

  // Capacity bar color
  const getCapacityColor = (ratio: number) => {
    if (ratio > 0.9) return "bg-red-500";
    if (ratio > 0.7) return "bg-amber-500";
    return "bg-emerald-500";
  };

  // Format date label
  const formatDateLabel = (dateStr: string) => {
    const d = parseISO(dateStr);
    if (isToday(d)) return t("activities.today") || "Today";
    if (isTomorrow(d)) return t("activities.tomorrow") || "Tomorrow";
    return format(d, "MMM d");
  };

  // Handle add new activity
  const handleAddActivity = () => {
    if (!newActivity.name.trim() || !newActivity.time) return;
    addActivity({
      name: newActivity.name.trim(),
      date: newActivity.date,
      time: newActivity.time,
      capacity: newActivity.capacity,
      price: newActivity.price || undefined,
      location: newActivity.location.trim() || undefined,
      status: "upcoming",
    });
    setNewActivity({
      name: "",
      date: format(new Date(), "yyyy-MM-dd"),
      time: "",
      capacity: 10,
      price: 0,
      location: "",
    });
    setShowAddForm(false);
  };

  // Handle add participant
  const handleAddParticipant = (activityId: string) => {
    if (!newParticipantName.trim()) return;
    addParticipant(activityId, {
      guestName: newParticipantName.trim(),
      bedName: newParticipantBed.trim() || undefined,
      checkedIn: false,
    });
    setNewParticipantName("");
    setNewParticipantBed("");
  };

  // Status cycle
  const statusOrder: ActivityStatus[] = [
    "upcoming",
    "ongoing",
    "completed",
    "cancelled",
  ];
  const cycleStatus = (activityId: string, current: ActivityStatus) => {
    const idx = statusOrder.indexOf(current);
    const next = statusOrder[(idx + 1) % statusOrder.length];
    updateActivityStatus(activityId, next);
  };

  const filterTabs = [
    { key: "today" as const, label: t("activities.today") || "Today" },
    { key: "week" as const, label: t("activities.thisWeek") || "This Week" },
    { key: "all" as const, label: t("activities.all") || "All" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 flex items-center gap-2">
            <PartyPopper className="h-6 w-6 text-zinc-400" />
            {t("activities.title") || "Activity Board"}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {filteredActivities.length}{" "}
            {t("activities.activitiesCount") || "activities"}
          </p>
        </div>
        <Button
          size="sm"
          className="h-9 gap-2"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus className="h-4 w-4" />
          {t("activities.addActivity") || "New Activity"}
        </Button>
      </div>

      {/* Add Activity Form */}
      {showAddForm && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900">
              {t("activities.newActivity") || "New Activity"}
            </h3>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-zinc-400 hover:text-zinc-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">
                {t("activities.activityName") || "Name"}
              </label>
              <input
                type="text"
                value={newActivity.name}
                onChange={(e) =>
                  setNewActivity({ ...newActivity, name: e.target.value })
                }
                placeholder="Pub Crawl, Yoga..."
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">
                {t("activities.location") || "Location"}
              </label>
              <input
                type="text"
                value={newActivity.location}
                onChange={(e) =>
                  setNewActivity({ ...newActivity, location: e.target.value })
                }
                placeholder="Reception, Rooftop..."
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">
                {t("activities.date") || "Date"}
              </label>
              <input
                type="date"
                value={newActivity.date}
                onChange={(e) =>
                  setNewActivity({ ...newActivity, date: e.target.value })
                }
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">
                {t("activities.time") || "Time"}
              </label>
              <input
                type="time"
                value={newActivity.time}
                onChange={(e) =>
                  setNewActivity({ ...newActivity, time: e.target.value })
                }
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">
                {t("activities.capacity") || "Capacity"}
              </label>
              <input
                type="number"
                min={1}
                value={newActivity.capacity}
                onChange={(e) =>
                  setNewActivity({
                    ...newActivity,
                    capacity: parseInt(e.target.value) || 1,
                  })
                }
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">
                {t("activities.price") || "Price"}
              </label>
              <input
                type="number"
                min={0}
                value={newActivity.price}
                onChange={(e) =>
                  setNewActivity({
                    ...newActivity,
                    price: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(false)}
            >
              {t("guest.cancel") || "Cancel"}
            </Button>
            <Button size="sm" onClick={handleAddActivity}>
              {t("activities.createActivity") || "Create"}
            </Button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1 rounded-lg bg-zinc-100 p-1">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === tab.key
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Activity Cards */}
      {filteredActivities.length === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center">
          <PartyPopper className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
          <p className="text-sm text-zinc-500">
            {t("activities.noActivities") ||
              "No activities found for this period."}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredActivities.map((activity) => {
          const isExpanded = expandedActivityId === activity.id;
          const ratio =
            activity.capacity > 0
              ? activity.participants.length / activity.capacity
              : 0;
          const checkedInCount = activity.participants.filter(
            (p) => p.checkedIn
          ).length;
          const badge = statusConfig[activity.status];

          return (
            <div
              key={activity.id}
              className={`rounded-xl border bg-white shadow-sm transition-shadow ${
                isExpanded ? "shadow-md border-zinc-300" : "border-zinc-200"
              }`}
            >
              {/* Card Header */}
              <div
                className="p-4 cursor-pointer"
                onClick={() =>
                  setExpandedActivityId(isExpanded ? null : activity.id)
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-zinc-900 truncate">
                        {activity.name}
                      </h3>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDateLabel(activity.date)} {activity.time}
                      </span>
                      {activity.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {activity.location}
                        </span>
                      )}
                      {activity.price !== undefined && activity.price > 0 && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />${activity.price}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteActivity(activity.id);
                      }}
                      className="p-1 rounded-md text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Capacity Bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1 text-zinc-500">
                      <Users className="h-3 w-3" />
                      {activity.participants.length} / {activity.capacity}
                    </span>
                    <span className="text-zinc-400">
                      {checkedInCount}{" "}
                      {t("activities.checkedIn") || "checked in"}
                    </span>
                  </div>
                  <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${getCapacityColor(ratio)}`}
                      style={{
                        width: `${Math.min(ratio * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Expanded: Participants */}
              {isExpanded && (
                <div className="border-t border-zinc-100 px-4 pb-4">
                  {/* Status cycle button */}
                  <div className="flex items-center justify-between pt-3 pb-2">
                    <span className="text-xs font-medium text-zinc-500 uppercase">
                      {t("activities.participants") || "Participants"} (
                      {activity.participants.length})
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => cycleStatus(activity.id, activity.status)}
                    >
                      {t("activities.changeStatus") || "Change Status"}
                    </Button>
                  </div>

                  {/* Participant list */}
                  {activity.participants.length === 0 && (
                    <p className="text-xs text-zinc-400 py-2">
                      {t("activities.noParticipants") ||
                        "No participants yet."}
                    </p>
                  )}
                  <div className="space-y-1">
                    {activity.participants.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-zinc-50 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            onClick={() =>
                              toggleParticipantCheckIn(activity.id, p.id)
                            }
                            className={`flex-shrink-0 h-5 w-5 rounded-md border flex items-center justify-center transition-colors ${
                              p.checkedIn
                                ? "bg-emerald-500 border-emerald-500 text-white"
                                : "border-zinc-300 text-transparent hover:border-zinc-400"
                            }`}
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <span
                            className={`text-sm truncate ${
                              p.checkedIn
                                ? "text-zinc-400 line-through"
                                : "text-zinc-900"
                            }`}
                          >
                            {p.guestName}
                          </span>
                          {p.bedName && (
                            <span className="text-[10px] text-zinc-400 bg-zinc-100 rounded px-1.5 py-0.5">
                              {p.bedName}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() =>
                            removeParticipant(activity.id, p.id)
                          }
                          className="p-1 rounded text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add participant form */}
                  <div className="mt-3 pt-3 border-t border-zinc-100">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newParticipantName}
                        onChange={(e) => setNewParticipantName(e.target.value)}
                        placeholder={
                          t("activities.participantName") || "Guest name"
                        }
                        className="flex-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            handleAddParticipant(activity.id);
                        }}
                      />
                      <input
                        type="text"
                        value={newParticipantBed}
                        onChange={(e) => setNewParticipantBed(e.target.value)}
                        placeholder={
                          t("activities.bedName") || "Bed (optional)"
                        }
                        className="w-24 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            handleAddParticipant(activity.id);
                        }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1 flex-shrink-0"
                        onClick={() => handleAddParticipant(activity.id)}
                        disabled={
                          !newParticipantName.trim() ||
                          activity.participants.length >= activity.capacity
                        }
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {/* Quick add from current guests */}
                    {currentGuests.length > 0 && (
                      <div className="mt-2">
                        <p className="text-[10px] font-medium text-zinc-400 uppercase mb-1">
                          {t("activities.currentGuests") ||
                            "Current guests"}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {currentGuests
                            .filter(
                              (g) =>
                                !activity.participants.some(
                                  (p) => p.guestName === g.name
                                )
                            )
                            .map((g) => (
                              <button
                                key={g.bedName}
                                onClick={() => {
                                  addParticipant(activity.id, {
                                    guestName: g.name,
                                    bedName: g.bedName,
                                    checkedIn: false,
                                  });
                                }}
                                className="inline-flex items-center gap-1 rounded-full border border-zinc-200 px-2 py-0.5 text-[11px] text-zinc-600 hover:bg-zinc-100 transition-colors"
                              >
                                {g.name}
                                <span className="text-zinc-400">
                                  {g.bedName}
                                </span>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
