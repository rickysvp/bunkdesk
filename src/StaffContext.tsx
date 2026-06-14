import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from "react";
import { Staff, StaffRole } from "./types";
import { INITIAL_STAFF } from "./data";

function loadState<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(`bunkdesk_${key}`);
    return saved ? JSON.parse(saved) : fallback;
  } catch { return fallback; }
}

const ROLE_TABS: Record<StaffRole, string[]> = {
  manager: ["dashboard", "bedboard", "shiftlog", "checkin", "calendar", "staff", "grow", "migrate"],
  reception: ["dashboard", "bedboard", "shiftlog", "checkin", "calendar"],
  cleaning: ["dashboard", "bedboard", "shiftlog"],
};

interface StaffState {
  staffList: Staff[];
  currentStaff: Staff | null;
  isAuthenticated: boolean;
  login: (staffId: string, pin: string) => boolean;
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
  const [staffList, setStaffList] = useState<Staff[]>(() => loadState('staffList', INITIAL_STAFF));
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(null);

  const isAuthenticated = currentStaff !== null;

  // Persist staffList to localStorage with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('bunkdesk_staffList', JSON.stringify(staffList));
    }, 300);
    return () => clearTimeout(timer);
  }, [staffList]);

  const login = useCallback((staffId: string, pin: string): boolean => {
    const staff = staffList.find((s) => s.id === staffId && s.isActive);
    if (staff && staff.pin === pin) {
      setCurrentStaff(staff);
      return true;
    }
    return false;
  }, [staffList]);

  const logout = useCallback(() => {
    setCurrentStaff(null);
  }, []);

  const addStaff = useCallback((staff: Omit<Staff, "id" | "createdAt">) => {
    const newStaff: Staff = {
      ...staff,
      id: `staff_${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
    };
    setStaffList((prev) => [...prev, newStaff]);
  }, []);

  const updateStaff = useCallback((id: string, updates: Partial<Pick<Staff, "name" | "role" | "phone" | "isActive" | "pin">>) => {
    setStaffList((prev) =>
      prev.map((s) => s.id === id ? { ...s, ...updates } : s),
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
