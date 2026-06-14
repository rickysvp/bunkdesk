import React, { useState, useMemo } from "react";
import {
  Gift,
  Users,
  DollarSign,
  Copy,
  Check,
  Hash,
  Ticket,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHostel } from "../HostelContext";
import { useTranslation } from "../i18nContext";

const REWARD_OPTIONS = [
  { key: "reward10Off", value: "10% off" },
  { key: "rewardBreakfast", value: "Free breakfast" },
  { key: "rewardLocker", value: "Free locker" },
  { key: "rewardTowel", value: "Free towel" },
] as const;

function generateCode(name: string): string {
  const upper = name.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 6);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const suffix = Array.from({ length: 3 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
  return `BUNKDESK-${upper || "GUEST"}-${suffix}`;
}

export function ReferralPanel() {
  const { referrals, addReferral } = useHostel();
  const { t } = useTranslation();

  const [guestName, setGuestName] = useState("");
  const [reward, setReward] = useState(REWARD_OPTIONS[0].value);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Stats
  const totalReferrals = referrals.length;
  const totalConversions = useMemo(
    () => referrals.reduce((sum, r) => sum + r.usedByGuestIds.length, 0),
    [referrals]
  );
  const totalCommissionSaved = useMemo(
    () => referrals.reduce((sum, r) => sum + r.commissionSaved, 0),
    [referrals]
  );

  const handleCopy = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleGenerate = () => {
    if (!guestName.trim()) return;
    const code = generateCode(guestName.trim());
    addReferral({
      code,
      referrerGuestId: `g_ref_${Date.now()}`,
      referrerGuestName: guestName.trim(),
      usedByGuestIds: [],
      reward,
      commissionSaved: 0,
    });
    // Auto-copy the new code
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    setGuestName("");
  };

  const formatCurrency = (amount: number) =>
    `¥${amount.toLocaleString()}`;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-emerald-50 rounded-lg">
          <Gift className="w-5 h-5 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900">
          {t("referral.title")}
        </h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <Hash className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-medium text-zinc-500">
              {t("referral.totalReferrals")}
            </span>
          </div>
          <p className="text-2xl font-bold text-zinc-900">{totalReferrals}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-medium text-zinc-500">
              {t("referral.conversions")}
            </span>
          </div>
          <p className="text-2xl font-bold text-zinc-900">{totalConversions}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-medium text-zinc-500">
              {t("referral.commissionSaved")}
            </span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">
            {formatCurrency(totalCommissionSaved)}
          </p>
        </div>
      </div>

      {/* Generate New Code */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 mb-6">
        <h2 className="text-sm font-semibold text-zinc-900 mb-3">
          {t("referral.generateNew")}
        </h2>
        <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div>
            <label className="text-xs font-medium text-zinc-500 mb-1 block">
              {t("referral.guestName")}
            </label>
            <input
              className="w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder={t("referral.guestName")}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500 mb-1 block">
              {t("referral.rewardType")}
            </label>
            <select
              className="w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              value={reward}
              onChange={(e) => setReward(e.target.value)}
            >
              {REWARD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(`referral.${opt.key}`)}
                </option>
              ))}
            </select>
          </div>
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={!guestName.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Sparkles className="w-4 h-4 mr-1" />
            {t("referral.generateCode")}
          </Button>
        </div>
      </div>

      {/* Active Referral Codes */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-zinc-900 mb-3">
          {t("referral.activeCodes")}
        </h2>
        {referrals.length === 0 ? (
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-8 text-center">
            <Ticket className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">{t("referral.noReferrals")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {referrals.map((ref) => (
              <div
                key={ref.id}
                className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 border-l-4 border-l-emerald-500"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {ref.code}
                      </code>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-zinc-600">
                      <span>
                        {t("referral.referrer")}:{" "}
                        <span className="font-medium text-zinc-900">
                          {ref.referrerGuestName}
                        </span>
                      </span>
                      <span>
                        {t("referral.reward")}:{" "}
                        <span className="font-medium text-zinc-900">
                          {ref.reward}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                      <span>
                        {t("referral.usedByGuests").replace(
                          "{n}",
                          String(ref.usedByGuestIds.length)
                        )}
                      </span>
                      {ref.commissionSaved > 0 && (
                        <span className="text-emerald-600 font-medium">
                          {t("referral.commission")}:{" "}
                          {formatCurrency(ref.commissionSaved)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(ref.code)}
                    className="shrink-0 text-zinc-500 hover:text-emerald-600"
                  >
                    {copiedCode === ref.code ? (
                      <>
                        <Check className="w-4 h-4 mr-1 text-emerald-600" />
                        <span className="text-xs text-emerald-600">
                          {t("referral.copied")}
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-1" />
                        <span className="text-xs">{t("referral.copyCode")}</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* How It Works */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-zinc-900 mb-4">
          {t("referral.howItWorks")}
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              icon: <Ticket className="w-5 h-5 text-emerald-600" />,
              title: t("referral.step1Title"),
              desc: t("referral.step1Desc"),
            },
            {
              icon: <Users className="w-5 h-5 text-emerald-600" />,
              title: t("referral.step2Title"),
              desc: t("referral.step2Desc"),
            },
            {
              icon: <Gift className="w-5 h-5 text-emerald-600" />,
              title: t("referral.step3Title"),
              desc: t("referral.step3Desc"),
            },
          ].map((step, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mb-2">
                {step.icon}
              </div>
              <p className="text-sm font-semibold text-zinc-900 mb-1">
                {step.title}
              </p>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {step.desc}
              </p>
              {i < 2 && (
                <ArrowRight className="w-4 h-4 text-zinc-300 absolute -right-2 top-1/2 -translate-y-1/2" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
