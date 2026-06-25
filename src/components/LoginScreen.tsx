import React, { useState, useEffect } from "react";
import { useStaff } from "../StaffContext";
import { useTranslation } from "../i18nContext";
import { motion } from "motion/react";
import { UserCircle, Lock, AlertCircle, ArrowLeft } from "lucide-react";

const ROLE_COLORS: Record<string, string> = {
  manager: "bg-chart-3/20 text-chart-3",
  reception: "bg-chart-1/15 text-chart-1",
  cleaning: "bg-chart-4/15 text-chart-4",
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
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
        className="bg-card rounded-2xl shadow-sm max-w-sm w-full p-6 md:p-8 border border-border"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">B</span>
          </div>
          <span className="text-foreground font-semibold text-lg">BunkDesk</span>
        </div>

        {/* Title */}
        <h1 className="text-xl font-semibold text-foreground mb-1">
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
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-border hover:bg-accent transition-colors text-left"
              >
                <UserCircle className="w-5 h-5 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium text-foreground flex-1">
                  {staff.name}
                </span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[staff.role] ?? "bg-muted text-muted-foreground"}`}
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
              className="text-xs text-muted-foreground hover:text-foreground transition-colors self-start flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {t("login.selectUser")}
            </button>

            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted">
              <UserCircle className="w-5 h-5 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium text-foreground flex-1">
                {selectedStaff?.name}
              </span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[selectedStaff.role] ?? "bg-muted text-muted-foreground"}`}
              >
                {t(`staff.${selectedStaff.role}`)}
              </span>
            </div>

            <div className={`flex items-center gap-2 border rounded-xl px-4 py-3 ${error ? "border-destructive animate-shake" : "border-border"}`}>
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
                className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground/70"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg || t("login.wrongPin")}</span>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={pin.length === 0 || lockedRemaining > 0}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {lockedRemaining > 0 ? `已锁定 ${Math.ceil(lockedRemaining / 1000)}s` : t("login.login")}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
