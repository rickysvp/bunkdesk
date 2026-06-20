import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from "react";
import { Staff, StaffRole } from "./types";
import { INITIAL_STAFF } from "./data";

function loadState<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(`bunkdesk_${key}`);
    return saved ? JSON.parse(saved) : fallback;
  } catch { return fallback; }
}

// PIN 简单编码（非加密级，但防明文直读 localStorage）
const PIN_SALT = 'bunkdesk_v1_salt';
function encodePin(pin: string): string {
  try {
    return btoa(pin + PIN_SALT);
  } catch {
    return pin;
  }
}
function verifyPin(storedEncoded: string, inputPin: string): boolean {
  return storedEncoded === encodePin(inputPin);
}

// 迁移旧版明文 PIN 到编码格式
function migrateStaffPins(staffList: Staff[]): Staff[] {
  let changed = false;
  const migrated = staffList.map((s) => {
    // 如果 PIN 不是编码格式（编码后是 base64，通常以字母开头且较长），则编码
    if (s.pin && !s.pin.includes(PIN_SALT) && s.pin.length <= 4) {
      changed = true;
      return { ...s, pin: encodePin(s.pin) };
    }
    return s;
  });
  return changed ? migrated : staffList;
}

const ROLE_TABS: Record<StaffRole, string[]> = {
  // After the nav refactor (assistant merges dashboard + grow,
  // settings merges staff + migrate), the tab IDs are:
  //   assistant  — 经营助手 (Copilot overview + Grow sub-tabs)
  //   bedboard   — 床位看板
  //   checkin    — 前台入住
  //   shiftlog   — 交接班日志
  //   settings   — 设置 (staff + migrate + general sub-tabs)
  manager:  ["assistant", "bedboard", "shiftlog", "checkin", "settings"],
  reception:["assistant", "bedboard", "shiftlog", "checkin"],
  cleaning: ["assistant", "bedboard", "shiftlog"],
};

interface StaffState {
  staffList: Staff[];
  currentStaff: Staff | null;
  isAuthenticated: boolean;
  login: (staffId: string, pin: string) => { ok: boolean; locked?: boolean; remainingMs?: number };
  logout: () => void;
  addStaff: (staff: Omit<Staff, "id" | "createdAt">) => void;
  updateStaff: (id: string, updates: Partial<Pick<Staff, "name" | "role" | "phone" | "isActive" | "pin">>) => void;
  removeStaff: (id: string) => void;
  activeStaffList: Staff[];
  staffByRole: (role: StaffRole) => Staff[];
  visibleTabs: string[];
}

const StaffContext = createContext<StaffState | undefined>(undefined);

export function StaffProvider({ children }: { children: ReactNode }) {
  // 加载时迁移旧版明文 PIN 到编码格式
  const [staffList, setStaffList] = useState<Staff[]>(() => migrateStaffPins(loadState('staffList', INITIAL_STAFF)));
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(null);
  // 登录锁定：5 次错误后锁定 30 秒
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState(0);

  const isAuthenticated = currentStaff !== null;

  // Persist staffList to localStorage with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('bunkdesk_staffList', JSON.stringify(staffList));
    }, 300);
    return () => clearTimeout(timer);
  }, [staffList]);

  const login = useCallback((staffId: string, pin: string): { ok: boolean; locked?: boolean; remainingMs?: number } => {
    // 检查锁定状态
    const now = Date.now();
    if (lockUntil > now) {
      return { ok: false, locked: true, remainingMs: lockUntil - now };
    }
    const staff = staffList.find((s) => s.id === staffId && s.isActive);
    if (staff && verifyPin(staff.pin, pin)) {
      setCurrentStaff(staff);
      setLoginAttempts(0);
      return { ok: true };
    }
    // 错误：累加尝试次数，5 次后锁定 30 秒
    const newAttempts = loginAttempts + 1;
    setLoginAttempts(newAttempts);
    if (newAttempts >= 5) {
      setLockUntil(now + 30000);
      setLoginAttempts(0);
    }
    return { ok: false };
  }, [staffList, loginAttempts, lockUntil]);

  const logout = useCallback(() => {
    setCurrentStaff(null);
  }, []);

  const addStaff = useCallback((staff: Omit<Staff, "id" | "createdAt">) => {
    const newStaff: Staff = {
      ...staff,
      pin: encodePin(staff.pin),
      id: `staff_${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
    };
    setStaffList((prev) => [...prev, newStaff]);
  }, []);

  const updateStaff = useCallback((id: string, updates: Partial<Pick<Staff, "name" | "role" | "phone" | "isActive" | "pin">>) => {
    // 如果更新包含 pin，则编码后存储
    const encodedUpdates = updates.pin ? { ...updates, pin: encodePin(updates.pin) } : updates;
    setStaffList((prev) =>
      prev.map((s) => s.id === id ? { ...s, ...encodedUpdates } : s),
    );
  }, []);

  const removeStaff = useCallback((id: string) => {
    setStaffList((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const activeStaffList = useMemo(() => staffList.filter((s) => s.isActive), [staffList]);

  const staffByRole = useCallback((role: StaffRole) => activeStaffList.filter((s) => s.role === role), [activeStaffList]);

  const visibleTabs = useMemo(() => {
    if (!currentStaff) return [];
    return ROLE_TABS[currentStaff.role];
  }, [currentStaff]);

  const value = useMemo(() => ({
    staffList, currentStaff, isAuthenticated,
    login, logout, addStaff, updateStaff, removeStaff,
    activeStaffList, staffByRole, visibleTabs,
  }), [
    staffList, currentStaff, isAuthenticated,
    login, logout, addStaff, updateStaff, removeStaff,
    activeStaffList, staffByRole, visibleTabs,
  ]);

  return (
    <StaffContext.Provider value={value}>
      {children}
    </StaffContext.Provider>
  );
}

export const useStaff = () => {
  const ctx = useContext(StaffContext);
  if (!ctx) throw new Error("useStaff must be within StaffProvider");
  return ctx;
};
