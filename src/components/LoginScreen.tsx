import React, { useState, useEffect } from "react";
import { useStaff } from "../StaffContext";
import { useTranslation } from "../i18nContext";
import { motion } from "motion/react";
import { UserCircle, Lock, AlertCircle } from "lucide-react";

const ROLE_COLORS: Record<string, string> = {
  manager: "bg-amber-100 text-amber-700",
  reception: "bg-blue-100 text-blue-700",
  cleaning: "bg-purple-100 text-purple-700",
};

const listVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

export function LoginScreen() {
  const { activeStaffList, login } = useStaff();
  const { t } = useTranslation();

  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [lockedRemaining, setLockedRemaining] = useState(0);

  const selectedStaff = activeStaffList.find((s) => s.id === selectedStaffId);

  // 锁定倒计时
  useEffect(() => {
    if (lockedRemaining <= 0) return;
    const timer = setTimeout(() => setLockedRemaining((v) => Math.max(0, v - 1000)), 1000);
    return () => clearTimeout(timer);
  }, [lockedRemaining]);

  const handleSelectStaff = (id: string) => {
    setSelectedStaffId(id);
    setPin("");
    setError(false);
    setErrorMsg("");
    setLockedRemaining(0);
  };

  const handleSubmit = () => {
    if (!selectedStaffId || pin.length === 0) return;
    const result = login(selectedStaffId, pin);
    if (result.locked && result.remainingMs) {
      setLockedRemaining(result.remainingMs);
      setError(true);
      setErrorMsg(`尝试次数过多，已锁定 ${Math.ceil(result.remainingMs / 1000)} 秒`);
      setPin("");
      return;
    }
    if (!result.ok) {
      setError(true);
      setErrorMsg("");
      setPin("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  const handleBack = () => {
    setSelectedStaffId(null);
    setPin("");
    setError(false);
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex items-center justify-center p-4">
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm max-w-sm w-full p-8"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-zinc-900 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">BD</span>
          </div>
          <span className="text-zinc-900 font-semibold text-lg">BunkDesk</span>
        </div>

        {/* Title */}
        <h1 className="text-xl font-semibold text-zinc-900 mb-1">
          {t("login.title")}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {t("login.selectUser")}
        </p>

        {!selectedStaffId ? (
          /* Staff List */
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-2"
          >
            {activeStaffList.map((staff) => (
              <motion.button
                key={staff.id}
                variants={itemVariants}
                onClick={() => handleSelectStaff(staff.id)}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 transition-colors text-left"
              >
                <UserCircle className="w-5 h-5 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium text-zinc-800 flex-1">
                  {staff.name}
                </span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[staff.role] ?? "bg-zinc-100 text-zinc-600"}`}
                >
                  {t(`staff.${staff.role}`)}
                </span>
              </motion.button>
            ))}
          </motion.div>
        ) : (
          /* PIN Input */
          <div className="flex flex-col gap-4">
            <button
              onClick={handleBack}
              className="text-xs text-muted-foreground hover:text-zinc-600 transition-colors self-start"
            >
              &larr; {t("login.selectUser")}
            </button>

            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-50">
              <UserCircle className="w-5 h-5 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium text-zinc-800 flex-1">
                {selectedStaff?.name}
              </span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[selectedStaff.role] ?? "bg-zinc-100 text-zinc-600"}`}
              >
                {t(`staff.${selectedStaff.role}`)}
              </span>
            </div>

            <div className={`flex items-center gap-2 border rounded-xl px-4 py-3 ${error ? "border-red-300 animate-shake" : "border-zinc-200"}`}>
              <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                autoFocus
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, ""));
                  setError(false);
                }}
                onKeyDown={handleKeyDown}
                placeholder={t("login.pin")}
                className="flex-1 text-sm bg-transparent outline-none text-zinc-800 placeholder:text-muted-foreground/70"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg || t("login.wrongPin")}</span>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={pin.length === 0 || lockedRemaining > 0}
              className="w-full py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {lockedRemaining > 0 ? `已锁定 ${Math.ceil(lockedRemaining / 1000)}s` : t("login.login")}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
