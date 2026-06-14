import React, { useState, useMemo, useCallback } from "react";
import {
  MessageSquare,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  Bed,
  Users,
  BarChart3,
  Zap,
  Megaphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHostel } from "../HostelContext";
import { useTranslation } from "../i18nContext";

export function SocialKit() {
  const { rooms, hostelPage } = useHostel();
  const { t } = useTranslation();

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [activeLastMinute, setActiveLastMinute] = useState(false);

  const hostelName = hostelPage.hostelName;
  const hostelLink = `https://bunkdesk.app/${hostelPage.slug}`;
  const facilities = hostelPage.facilities.join(", ") || t("socialKit.facilities");

  // Bed stats
  const { totalBeds, occupiedBeds, emptyBeds, occupancyRate } = useMemo(() => {
    const allBeds = rooms.flatMap((r) => r.beds);
    const total = allBeds.length;
    const occupied = allBeds.filter((b) => b.status === "occupied").length;
    const empty = allBeds.filter((b) => b.status === "empty").length;
    const rate = total > 0 ? Math.round((occupied / total) * 100) : 0;
    return { totalBeds: total, occupiedBeds: occupied, emptyBeds: empty, occupancyRate: rate };
  }, [rooms]);

  const showEmptyBedAlert = totalBeds > 0 && emptyBeds > totalBeds / 2;

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2000);
  }, []);

  const handleCopy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(t("socialKit.copied"));
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openWhatsApp = (text: string) => {
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  // WhatsApp templates
  const waTemplates = useMemo(() => {
    const discount = activeLastMinute ? 20 : 15;
    return [
      {
        id: "wa-welcome",
        label: t("socialKit.templateWelcome"),
        icon: <MessageSquare className="w-4 h-4" />,
        message: t("socialKit.welcomeMessage")
          .replace("{hostelName}", hostelName)
          .replace("{facilities}", facilities)
          .replace("{link}", hostelLink),
      },
      {
        id: "wa-lastminute",
        label: t("socialKit.templateLastMinute"),
        icon: <Zap className="w-4 h-4" />,
        message: t("socialKit.lastMinuteMessage")
          .replace("{hostelName}", hostelName)
          .replace("{discount}", String(discount))
          .replace("{link}", hostelLink),
      },
      {
        id: "wa-newarrival",
        label: t("socialKit.templateNewArrival"),
        icon: <Megaphone className="w-4 h-4" />,
        message: t("socialKit.newArrivalMessage")
          .replace("{hostelName}", hostelName)
          .replace("{feature}", t("socialKit.newFeature"))
          .replace("{link}", hostelLink),
      },
    ];
  }, [t, hostelName, facilities, hostelLink, activeLastMinute]);

  return (
    <div className="max-w-3xl mx-auto relative">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-zinc-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg animate-in fade-in slide-in-from-top-2">
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-emerald-50 rounded-lg">
          <Megaphone className="w-5 h-5 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900">
          {t("socialKit.title")}
        </h1>
      </div>

      {/* Quick Stats */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 mb-6">
        <h2 className="text-sm font-semibold text-zinc-900 mb-3">
          {t("socialKit.quickStats")}
        </h2>
        <div className="grid grid-cols-4 gap-3 mb-3">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Bed className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-xs font-medium text-zinc-500">{t("socialKit.totalBeds")}</span>
            </div>
            <p className="text-xl font-bold text-zinc-900">{totalBeds}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs font-medium text-zinc-500">{t("socialKit.occupiedBeds")}</span>
            </div>
            <p className="text-xl font-bold text-emerald-600">{occupiedBeds}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Bed className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-xs font-medium text-zinc-500">{t("socialKit.emptyBeds")}</span>
            </div>
            <p className="text-xl font-bold text-zinc-900">{emptyBeds}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <BarChart3 className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-xs font-medium text-zinc-500">{t("socialKit.occupancyRate")}</span>
            </div>
            <p className="text-xl font-bold text-zinc-900">{occupancyRate}%</p>
          </div>
        </div>
        {/* Occupancy bar */}
        <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${occupancyRate}%` }}
          />
        </div>
      </div>

      {/* Empty Bed Alert */}
      {showEmptyBedAlert && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900">
              {t("socialKit.emptyBedAlertText").replace("{count}", String(emptyBeds))}
            </p>
            <Button
              size="sm"
              className="mt-2 bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => setActiveLastMinute(true)}
            >
              <Zap className="w-3.5 h-3.5 mr-1" />
              {t("socialKit.generateLastMinute")}
            </Button>
            {activeLastMinute && (
              <div className="mt-2 flex items-center gap-2 text-xs text-amber-700">
                <span className="bg-amber-100 px-2 py-0.5 rounded font-medium">
                  {t("socialKit.discountOff")}
                </span>
                <span className="bg-amber-100 px-2 py-0.5 rounded font-medium">
                  {t("socialKit.sameDayBooking")}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* WhatsApp Templates */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-green-50 rounded-lg">
            <MessageSquare className="w-4 h-4 text-green-600" />
          </div>
          <h2 className="text-sm font-semibold text-zinc-900">
            {t("socialKit.whatsappTitle")}
          </h2>
        </div>
        <div className="space-y-3">
          {waTemplates.map((tpl) => (
            <div
              key={tpl.id}
              className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden border-l-4 border-l-green-500"
            >
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-600">{tpl.icon}</span>
                  <span className="text-sm font-semibold text-zinc-900">{tpl.label}</span>
                </div>
                {/* WhatsApp message preview */}
                <div className="bg-green-50 rounded-lg p-3 mb-3">
                  <p className="text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed">
                    {tpl.message}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(tpl.id, tpl.message)}
                  >
                    {copiedId === tpl.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1 text-green-600" />
                        <span className="text-xs text-green-600">{t("socialKit.copied")}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-1" />
                        <span className="text-xs">{t("socialKit.copyMessage")}</span>
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openWhatsApp(tpl.message)}
                    className="text-green-700 border-green-200 hover:bg-green-50"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1" />
                    <span className="text-xs">{t("socialKit.openWhatsApp")}</span>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
