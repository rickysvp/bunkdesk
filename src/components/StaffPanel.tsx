import React, { useState } from "react";
import { Plus, UserCircle, Edit2, UserX, UserCheck, Phone, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStaff } from "../StaffContext";
import { useTranslation } from "../i18nContext";
import { StaffRole } from "../types";

const ROLE_BADGE: Record<StaffRole, string> = {
  manager: "bg-amber-50 text-amber-700",
  reception: "bg-blue-50 text-blue-700",
  cleaning: "bg-purple-50 text-purple-700",
};

const ROLE_LABEL_KEY: Record<StaffRole, string> = {
  manager: "staff.manager",
  reception: "staff.reception",
  cleaning: "staff.cleaning",
};

export function StaffPanel() {
  const { staffList, addStaff, updateStaff } = useStaff();
  const { t } = useTranslation();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<StaffRole>("reception");
  const [editPhone, setEditPhone] = useState("");

  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffRole, setNewStaffRole] = useState<StaffRole>("reception");
  const [newStaffPin, setNewStaffPin] = useState("");
  const [newStaffPhone, setNewStaffPhone] = useState("");

  const handleAddStaff = () => {
    if (!newStaffName.trim() || !newStaffPin.trim()) return;
    addStaff({
      name: newStaffName.trim(),
      role: newStaffRole,
      pin: newStaffPin,
      phone: newStaffPhone.trim() || undefined,
      isActive: true,
    });
    setNewStaffName("");
    setNewStaffRole("reception");
    setNewStaffPin("");
    setNewStaffPhone("");
    setShowAddForm(false);
  };

  const startEdit = (staff: typeof staffList[number]) => {
    setEditingId(staff.id);
    setEditName(staff.name);
    setEditRole(staff.role);
    setEditPhone(staff.phone ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditRole("reception");
    setEditPhone("");
  };

  const saveEdit = (id: string) => {
    updateStaff(id, {
      name: editName.trim(),
      role: editRole,
      phone: editPhone.trim() || undefined,
    });
    cancelEdit();
  };

  const toggleActive = (staff: typeof staffList[number]) => {
    updateStaff(staff.id, { isActive: !staff.isActive });
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">{t("staff.title")}</h1>
        <Button onClick={() => setShowAddForm(!showAddForm)} variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-1" />
          {t("staff.addStaff")}
        </Button>
      </div>

      {/* Add Staff Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">{t("staff.name")}</label>
              <input
                className="w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                placeholder={t("staff.name")}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">{t("staff.role")}</label>
              <select
                className="w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
                value={newStaffRole}
                onChange={(e) => setNewStaffRole(e.target.value as StaffRole)}
              >
                <option value="reception">{t("staff.reception")}</option>
                <option value="cleaning">{t("staff.cleaning")}</option>
                <option value="manager">{t("staff.manager")}</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">{t("staff.pin")}</label>
              <div className="relative">
                <KeyRound className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                <input
                  type="password"
                  maxLength={4}
                  className="w-full border border-zinc-200 rounded-lg pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
                  value={newStaffPin}
                  onChange={(e) => setNewStaffPin(e.target.value)}
                  placeholder="****"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">{t("staff.phone")}</label>
              <div className="relative">
                <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                <input
                  className="w-full border border-zinc-200 rounded-lg pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
                  value={newStaffPhone}
                  onChange={(e) => setNewStaffPhone(e.target.value)}
                  placeholder={t("staff.phone")}
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
              {t("staff.cancel")}
            </Button>
            <Button size="sm" onClick={handleAddStaff}>
              {t("staff.create")}
            </Button>
          </div>
        </div>
      )}

      {/* Staff Cards */}
      <div className="space-y-3">
        {staffList.map((staff) => {
          const isEditing = editingId === staff.id;

          return (
            <div
              key={staff.id}
              className={`bg-white rounded-xl border border-zinc-200 shadow-sm p-4 ${
                !staff.isActive ? "opacity-50" : ""
              }`}
            >
              {isEditing ? (
                /* Edit Mode */
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-medium text-zinc-500 mb-1 block">{t("staff.name")}</label>
                      <input
                        className="w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-zinc-500 mb-1 block">{t("staff.role")}</label>
                      <select
                        className="w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as StaffRole)}
                      >
                        <option value="reception">{t("staff.reception")}</option>
                        <option value="cleaning">{t("staff.cleaning")}</option>
                        <option value="manager">{t("staff.manager")}</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-zinc-500 mb-1 block">{t("staff.phone")}</label>
                      <input
                        className="w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={cancelEdit}>
                      {t("staff.cancel")}
                    </Button>
                    <Button size="sm" onClick={() => saveEdit(staff.id)}>
                      {t("staff.save")}
                    </Button>
                  </div>
                </div>
              ) : (
                /* Display Mode */
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserCircle className="w-8 h-8 text-zinc-400 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-900">{staff.name}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_BADGE[staff.role]}`}>
                          {t(ROLE_LABEL_KEY[staff.role])}
                        </span>
                        {!staff.isActive && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500">
                            {t("staff.inactive")}
                          </span>
                        )}
                      </div>
                      {staff.phone && (
                        <div className="flex items-center gap-1 mt-0.5 text-sm text-zinc-500">
                          <Phone className="w-3 h-3" />
                          {staff.phone}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(staff)}>
                      <Edit2 className="w-4 h-4 text-zinc-500" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActive(staff)}>
                      {staff.isActive ? (
                        <UserX className="w-4 h-4 text-zinc-500" />
                      ) : (
                        <UserCheck className="w-4 h-4 text-zinc-500" />
                      )}
                    </Button>
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
