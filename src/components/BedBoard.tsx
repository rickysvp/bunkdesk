import React, { useState, useMemo, useRef, useEffect } from "react";
import { useHostel } from "../HostelContext";
import {
  differenceInDays,
  parseISO,
  isAfter,
  isBefore,
  addDays,
  startOfDay,
} from "date-fns";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { Room, Bed, Guest } from "../types";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import {
  Users,
  AlertCircle,
  Clock,
  Sparkles,
  Filter,
  LogOut,
  Plus,
  CalendarDays,
  Phone,
  Mail,
  UserCircle,
  FileText,
  CreditCard,
  Building,
  Settings2,
  Trash2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "../i18nContext";
import { useStaff } from "../StaffContext";
import { Button } from "@/components/ui/button";
import { BedDouble } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function GuestCard({
  guest,
  isDragging,
}: {
  guest: Guest;
  isDragging?: boolean;
}) {
  const { t } = useTranslation();

  const today = startOfDay(new Date());
  const checkInDate = startOfDay(parseISO(guest.checkInDate));
  const checkOutDate = startOfDay(parseISO(guest.checkOutDate));

  let daysPassed = differenceInDays(today, checkInDate);
  if (daysPassed < 0) daysPassed = 0;
  if (daysPassed > guest.nights) daysPassed = guest.nights;

  const progressPercent =
    guest.nights > 0 ? (daysPassed / guest.nights) * 100 : 0;

  return (
    <div
      className={cn(
        "p-3 rounded-xl bg-white border border-zinc-200 shadow-sm text-left flex flex-col gap-2 w-full active:scale-[0.98] transition-transform touch-manipulation",
        isDragging && "opacity-50 scale-105 shadow-xl border-zinc-300",
        guest.paymentStatus === "unpaid" && "border-red-200 bg-red-50/30",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-hidden">
          {guest.gender === "male" && <span className="text-[12px] text-blue-500 font-bold" title={t("guest.male") || "Male"}>♂</span>}
          {guest.gender === "female" && <span className="text-[12px] text-pink-500 font-bold" title={t("guest.female") || "Female"}>♀</span>}
          <span className="text-sm font-semibold text-zinc-900 truncate pr-2">
            {guest.name}
          </span>
        </div>
        <span className="text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded font-medium">
          {guest.countryCode}
        </span>
      </div>

      {/* Mini Gantt Progress Bar */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[10px] text-zinc-400 font-medium">
          <span>{guest.checkInDate.slice(5)}</span>
          <span className="text-zinc-500">
            {guest.nights} {t("dashboard.nights")}
          </span>
          <span>{guest.checkOutDate.slice(5)}</span>
        </div>
        <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden flex">
          <div
            className={cn(
              "h-full transition-all duration-500 rounded-full",
              guest.paymentStatus === "unpaid"
                ? "bg-red-400"
                : "bg-emerald-400",
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {guest.paymentStatus === "unpaid" && (
        <div className="flex items-center justify-end text-[10px] uppercase font-bold text-red-500 tracking-wider">
          {t("bedboard.unpaid")}
        </div>
      )}
    </div>
  );
}

function DraggableGuest({
  guest,
  sourceBedId,
  onClick,
}: {
  guest: Guest;
  sourceBedId: string;
  onClick?: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `guest-${guest.id}`,
    data: { type: "guest", sourceBedId, guest },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="cursor-grab active:cursor-grabbing w-full"
      onClick={onClick}
    >
      <GuestCard guest={guest} isDragging={isDragging} />
    </div>
  );
}

const DroppableBed: React.FC<{
  bed: Bed;
  room: Room;
  onGuestClick?: (guest: Guest, bedId: string) => void;
  onCheckoutClick?: (guestName: string, bedId: string) => void;
  popoverBedId: string | null;
  setPopoverBedId: (id: string | null) => void;
  navigateToGrow?: (subTab: string, options?: { autoOpenPromo?: boolean }) => void;
}> = ({ bed, room, onGuestClick, onCheckoutClick, popoverBedId, setPopoverBedId, navigateToGrow }) => {
  const { t } = useTranslation();
  const { markBedClean, checkoutGuest } = useHostel();
  const { isOver, setNodeRef, active } = useDroppable({
    id: bed.id,
    data: { type: "bed", bed },
    disabled: bed.status === "occupied" || bed.status === "cleaning",
  });
  const popoverRef = useRef<HTMLDivElement>(null);
  const isPopoverOpen = popoverBedId === bed.id;

  useEffect(() => {
    if (!isPopoverOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverBedId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isPopoverOpen, setPopoverBedId]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col p-3 rounded-2xl border transition-all min-h-[120px] touch-manipulation group/bed",
        bed.status === "empty"
          ? "bg-zinc-50 border-zinc-200 border-dashed"
          : bed.status === "occupied"
            ? "bg-white border-zinc-200"
            : bed.status === "cleaning"
              ? "bg-purple-50/50 border-purple-200 border-dashed"
              : bed.status === "reserved"
                ? "bg-amber-50/50 border-amber-200"
                : "bg-blue-50/50 border-blue-200",
        isOver &&
          "bg-zinc-100 border-zinc-400 ring-2 ring-zinc-900/10 scale-[1.02]",
      )}
    >
      <div className="flex items-center justify-between mb-3 text-sm relative">
        <div className="flex items-center gap-2 truncate">
          <span className="font-semibold text-zinc-500">{bed.name}</span>
          {bed.bedType && (
            <span className="flex items-center">
              {bed.bedType === "top" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
                  {/* Bed frame posts */}
                  <line x1="4" y1="3" x2="4" y2="21" />
                  <line x1="20" y1="3" x2="20" y2="21" />
                  {/* Top bunk (highlighted) */}
                  <rect x="4" y="3" width="16" height="7" rx="0.5" fill="currentColor" fillOpacity="0.15" />
                  <line x1="4" y1="10" x2="20" y2="10" />
                  {/* Pillow on top bunk */}
                  <rect x="6" y="4.5" width="4" height="2" rx="0.5" fill="currentColor" fillOpacity="0.3" />
                  {/* Bottom bunk (dimmed) */}
                  <line x1="4" y1="14" x2="20" y2="14" />
                  <line x1="4" y1="21" x2="20" y2="21" />
                  {/* Ladder */}
                  <line x1="18" y1="10" x2="18" y2="21" strokeWidth="1" />
                  <line x1="16" y1="13" x2="18" y2="13" strokeWidth="1" />
                  <line x1="16" y1="17" x2="18" y2="17" strokeWidth="1" />
                </svg>
              ) : bed.bedType === "bottom" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
                  {/* Bed frame posts */}
                  <line x1="4" y1="3" x2="4" y2="21" />
                  <line x1="20" y1="3" x2="20" y2="21" />
                  {/* Top bunk (dimmed) */}
                  <line x1="4" y1="3" x2="20" y2="3" />
                  <line x1="4" y1="10" x2="20" y2="10" />
                  {/* Bottom bunk (highlighted) */}
                  <rect x="4" y="14" width="16" height="7" rx="0.5" fill="currentColor" fillOpacity="0.15" />
                  <line x1="4" y1="14" x2="20" y2="14" />
                  {/* Pillow on bottom bunk */}
                  <rect x="6" y="15.5" width="4" height="2" rx="0.5" fill="currentColor" fillOpacity="0.3" />
                  {/* Ladder */}
                  <line x1="18" y1="10" x2="18" y2="21" strokeWidth="1" />
                  <line x1="16" y1="13" x2="18" y2="13" strokeWidth="1" />
                  <line x1="16" y1="17" x2="18" y2="17" strokeWidth="1" />
                </svg>
              ) : bed.bedType === "double" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
                  {/* Double bed frame */}
                  <rect x="3" y="8" width="18" height="10" rx="1" fill="currentColor" fillOpacity="0.15" />
                  {/* Two pillows */}
                  <rect x="5" y="9.5" width="5" height="2.5" rx="0.5" fill="currentColor" fillOpacity="0.3" />
                  <rect x="14" y="9.5" width="5" height="2.5" rx="0.5" fill="currentColor" fillOpacity="0.3" />
                  {/* Headboard */}
                  <line x1="3" y1="8" x2="21" y2="8" strokeWidth="2" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
                  {/* Single bed frame */}
                  <rect x="4" y="8" width="16" height="10" rx="1" fill="currentColor" fillOpacity="0.15" />
                  {/* Pillow */}
                  <rect x="6" y="9.5" width="4" height="2.5" rx="0.5" fill="currentColor" fillOpacity="0.3" />
                  {/* Headboard */}
                  <line x1="4" y1="8" x2="20" y2="8" strokeWidth="2" />
                </svg>
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-emerald-600">${room.pricePerNight + (bed.bedType === 'bottom' ? (room.bottomBunkPremium || 0) : 0)}</span>
          {bed.status === "cleaning" && (
            <Sparkles className="w-4 h-4 text-purple-500" />
          )}
          {bed.status === "empty" && !isOver && (
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-end group">
        {bed.status === "occupied" && bed.guest && (
          <div className="relative">
            <DraggableGuest
              guest={bed.guest}
              sourceBedId={bed.id}
              onClick={() => onGuestClick?.(bed.guest!, bed.id)}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onCheckoutClick && bed.guest) {
                  onCheckoutClick(bed.guest.name, bed.id);
                } else {
                  checkoutGuest(bed.id);
                }
              }}
              className="absolute -top-3 -right-3 bg-red-100 text-red-600 hover:bg-red-200 active:bg-red-300 outline-none rounded-full p-2.5 opacity-100 sm:opacity-0 group-hover:opacity-100 shadow-sm transition-opacity"
              title={t("bedboard.checkout")}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}

        {bed.status === "cleaning" && (
          <button
            onClick={() => markBedClean(bed.id)}
            className="text-xs font-semibold text-purple-700 bg-purple-100/80 active:bg-purple-200 hover:bg-purple-200 py-3 px-2 rounded-xl transition-colors flex items-center justify-center mt-auto w-full cursor-pointer touch-manipulation"
          >
            {t("bedboard.needsCleaning")}
          </button>
        )}

        {bed.status === "empty" && !isOver && (
          <div className="flex flex-col items-center gap-1 mt-auto relative" ref={isPopoverOpen ? popoverRef : undefined}>
            <div className="text-xs text-zinc-400 font-medium text-center pb-1">
              {t("bedboard.empty")}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPopoverBedId(isPopoverOpen ? null : bed.id);
              }}
              className="text-[10px] text-emerald-600 hover:text-emerald-700 font-semibold hover:underline cursor-pointer"
            >
              {t("bedboard.howToFill")}
            </button>
            {isPopoverOpen && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-white border border-zinc-200 rounded-xl shadow-lg p-2 z-50 text-left">
                <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-2 py-1">
                  {t("bedboard.howToFill")}
                </div>
                <div
                  className="text-xs text-zinc-700 px-2 py-1.5 hover:bg-zinc-100 rounded-lg cursor-pointer"
                  onClick={() => { navigateToGrow?.('pricing'); setPopoverBedId(null); }}
                >
                  💡 {t("bedboard.suggestLowerPrice")}
                </div>
                <div
                  className="text-xs text-zinc-700 px-2 py-1.5 hover:bg-zinc-100 rounded-lg cursor-pointer"
                  onClick={() => { navigateToGrow?.('pricing'); setPopoverBedId(null); }}
                >
                  🏷️ {t("bedboard.suggestPromo")}
                </div>
                <div
                  className="text-xs text-zinc-700 px-2 py-1.5 hover:bg-zinc-100 rounded-lg cursor-pointer"
                  onClick={() => { navigateToGrow?.('social'); setPopoverBedId(null); }}
                >
                  📱 {t("bedboard.suggestShare")}
                </div>
              </div>
            )}
          </div>
        )}

        {isOver && (
          <div className="text-xs text-zinc-500 font-medium text-center mt-auto pb-1">
            {t("bedboard.dropToAssign")}
          </div>
        )}
      </div>
    </div>
  );
}

export function BedBoard({ navigateToGrow, setActiveTab }: { navigateToGrow?: (subTab: string, options?: { autoOpenPromo?: boolean }) => void; setActiveTab?: (tab: string) => void }) {
  const { rooms, arrivals, moveGuest, addRoom, addBedToRoom, checkoutGuest, deleteRoom } =
    useHostel();
  const { t } = useTranslation();
  const { currentStaff } = useStaff();
  const [activeGuest, setActiveGuest] = useState<Guest | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>(currentStaff?.role === "cleaning" ? "cleaning" : "all");
  const [roomTypeFilter, setRoomTypeFilter] = useState("all");

  // Dialog States
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState("");
  const [newRoomType, setNewRoomType] = useState<
    "dorm-mixed" | "dorm-female" | "private"
  >("dorm-mixed");
  const [newRoomPrice, setNewRoomPrice] = useState(85);

  // Inline add bed state (used in room settings dialog)
  const [newBedName, setNewBedName] = useState("");
  const [newBedType, setNewBedType] = useState<"top" | "bottom" | "single" | "double">("single");

  // Guest Details & Checkout State
  const [viewingGuest, setViewingGuest] = useState<{
    guest: Guest;
    bedId: string;
  } | null>(null);
  const [confirmCheckoutData, setConfirmCheckoutData] = useState<{
    guestName: string;
    bedId: string;
  } | null>(null);

  // Gender conflict confirmation state
  const [genderConflictData, setGenderConflictData] = useState<{
    type: "move";
    sourceBedId?: string;
    targetBedId: string;
  } | null>(null);

  // Room Editing State
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editRoomName, setEditRoomName] = useState("");
  const [editRoomNumber, setEditRoomNumber] = useState("");
  const [editRoomPrice, setEditRoomPrice] = useState(0);
  const [editRoomBottomPremium, setEditRoomBottomPremium] = useState(0);

  const [popoverBedId, setPopoverBedId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
  );

  const getRoomTypeForBed = (bedId: string): Room["type"] | undefined => {
    for (const room of rooms) {
      if (room.beds.some(b => b.id === bedId)) return room.type;
    }
    return undefined;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === "guest") {
      setActiveGuest(active.data.current.guest);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveGuest(null);
    const { active, over } = event;

    if (!over) return;

    if (
      active.data.current?.type === "guest" &&
      over.data.current?.type === "bed"
    ) {
      const sourceBedId = active.data.current.sourceBedId;
      const targetBedId = over.id as string;
      const guest = active.data.current.guest as Guest;
      const targetRoomType = getRoomTypeForBed(targetBedId);

      if (sourceBedId !== targetBedId) {
        // Gender conflict check: male guest → dorm-female room
        if (guest.gender === "male" && targetRoomType === "dorm-female") {
          setGenderConflictData({
            type: "move",
            sourceBedId,
            targetBedId,
          });
          return;
        }
        moveGuest(sourceBedId, targetBedId);
      }
    }
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomNumber) return;
    addRoom({ number: newRoomNumber, type: newRoomType, pricePerNight: newRoomPrice });
    setIsAddRoomOpen(false);
    setNewRoomNumber("");
    setNewRoomPrice(85);
  };

  const { updateRoom, updateBed, deleteBed } = useHostel();

  const handleUpdateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom || !editRoomNumber) return;
    updateRoom(editingRoom.id, editRoomName || editingRoom.name, editRoomNumber, editRoomPrice, editRoomBottomPremium);
    setEditingRoom(null);
  };

  const filteredRooms = useMemo(() => rooms
    .filter((room) => roomTypeFilter === "all" || room.type === roomTypeFilter)
    .map((room) => {
      const filteredBeds = room.beds.filter(
        (bed) => statusFilter === "all" || bed.status === statusFilter,
      );
      return { ...room, beds: filteredBeds, totalBeds: room.beds.length };
    })
    .filter((room) => room.beds.length > 0), [rooms, roomTypeFilter, statusFilter]);

  const dirtyBedsCount = useMemo(() => rooms.reduce(
    (acc, room) =>
      acc + room.beds.filter((b) => b.status === "cleaning").length,
    0,
  ), [rooms]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full pb-20 md:pb-0">
        {/* Arrivals summary bar */}
        {arrivals.length > 0 && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm shrink-0">
            <div className="flex items-center gap-3 text-blue-900">
              <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold">
                  {arrivals.length} {arrivals.length === 1 ? (t('checkin.pendingGuest') || 'guest') : (t('checkin.pendingGuests') || 'guests')} {t('checkin.pending') || 'pending'}
                </h4>
                <p className="text-xs text-blue-700/80 mt-0.5">
                  {t('bedboard.goToCheckInHint') || 'Go to Check-in to assign beds'}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="shrink-0 h-8 bg-blue-600 hover:bg-blue-700 text-xs shadow-none"
              onClick={() => setActiveTab?.('checkin')}
            >
              {t('bedboard.goToCheckIn') || 'Go to Check-in'}
            </Button>
          </div>
        )}

        {/* Board */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Dirty Beds Alert Banner */}
          {dirtyBedsCount > 0 && statusFilter !== "cleaning" && (
            <div className="mb-4 bg-purple-50 border border-purple-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm shrink-0">
              <div className="flex items-center gap-3 text-purple-900">
                <div className="p-2 bg-purple-100 rounded-lg shrink-0">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">
                    {t('bedboard.bedsNeedCleaning').replace('{n}', String(dirtyBedsCount))}
                  </h4>
                  <p className="text-xs text-purple-700/80 mt-0.5">
                    {t('bedboard.bedsNeedCleaningDesc')}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 h-8 border-purple-200 text-purple-700 hover:bg-purple-100 text-xs shadow-none"
                onClick={() => setStatusFilter("cleaning")}
              >
                {t('bedboard.reviewAndClean')}
              </Button>
            </div>
          )}

          {statusFilter === "cleaning" && (
            <div className="mb-4 bg-zinc-900 text-white rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-800 rounded-lg shrink-0">
                  <Sparkles className="w-5 h-5 text-zinc-100" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">
                    {t("bedboard.cleaningModeActive")}
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {t("bedboard.showingOnlyDirty")}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="shrink-0 h-8 text-xs shadow-none"
                onClick={() => setStatusFilter("all")}
              >
                {t("bedboard.exitCleaningMode")}
              </Button>
            </div>
          )}

          {/* Filters */}
          <div className="flex items-center gap-3 pb-4">
            <div className="flex items-center gap-2 text-zinc-500 mr-2 flex-shrink-0">
              <Filter className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">
                {t("bedboard.filterBeds")}
              </span>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px] md:w-[140px] h-8 text-xs bg-white border-zinc-200">
                <SelectValue placeholder={t("bedboard.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("bedboard.allStatuses")}</SelectItem>
                <SelectItem value="empty">{t("bedboard.available")}</SelectItem>
                <SelectItem value="occupied">
                  {t("bedboard.occupied")}
                </SelectItem>
                <SelectItem value="cleaning">{t("bedboard.dirty")}</SelectItem>
                <SelectItem value="reserved">
                  {t("bedboard.reserved")}
                </SelectItem>
                <SelectItem value="late-arrival">
                  {t("bedboard.lateArrival")}
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={roomTypeFilter} onValueChange={setRoomTypeFilter}>
              <SelectTrigger className="w-[120px] md:w-[140px] h-8 text-xs bg-white border-zinc-200">
                <SelectValue placeholder={t("bedboard.roomType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("bedboard.allRooms")}</SelectItem>
                <SelectItem value="dorm-mixed">
                  {t("bedboard.mixedDorm")}
                </SelectItem>
                <SelectItem value="dorm-female">
                  {t("bedboard.femaleDorm")}
                </SelectItem>
                <SelectItem value="private">{t("bedboard.private")}</SelectItem>
              </SelectContent>
            </Select>

            <Dialog open={isAddRoomOpen} onOpenChange={setIsAddRoomOpen}>
              <DialogTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 ml-auto flex-shrink-0 gap-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">
                      {t("rooms.addRoom")}
                    </span>
                  </Button>
                }
              />
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{t("rooms.createRoom")}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateRoom} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-zinc-500 uppercase">
                      {t("rooms.roomNumber")}
                    </Label>
                    <Input
                      required
                      placeholder="e.g. 101"
                      value={newRoomNumber}
                      onChange={(e) => setNewRoomNumber(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-zinc-500 uppercase">
                      {t("rooms.roomType")}
                    </Label>
                    <Select
                      value={newRoomType}
                      onValueChange={(val: string) => setNewRoomType(val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("rooms.roomType")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dorm-mixed">
                          {t("rooms.mixedDorm")}
                        </SelectItem>
                        <SelectItem value="dorm-female">
                          {t("rooms.femaleDorm")}
                        </SelectItem>
                        <SelectItem value="private">
                          {t("rooms.privateRoom")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-zinc-500 uppercase">
                      {t("rooms.pricePerNight") || "Price/Night"}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="e.g. 85"
                      value={newRoomPrice}
                      onChange={(e) => setNewRoomPrice(Number(e.target.value))}
                    />
                  </div>
                  <div className="pt-4">
                    <Button type="submit" className="w-full">
                      {t("rooms.createRoom")}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto pb-10 pr-2">
            {filteredRooms.map((room) => (
              <div
                key={room.id}
                className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden"
              >
                <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
                  <div
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                       setEditingRoom(room as Room);
                       setEditRoomName(room.name || "");
                       setEditRoomNumber(room.number);
                       setEditRoomPrice(room.pricePerNight);
                    }}
                  >
                    <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
                      {room.name || (room.type === "dorm-mixed"
                        ? t("bedboard.mixedDorm")
                        : room.type === "dorm-female"
                          ? t("bedboard.femaleDorm")
                          : t("bedboard.private"))}
                      <span className="text-xs font-normal text-zinc-500 bg-zinc-200 px-1.5 py-0.5 rounded">
                        {t("bedboard.roomLabel").replace("{number}", room.number)}
                      </span>
                      {room.type === "dorm-female" && (
                        <span className="text-[10px] font-semibold text-pink-600 bg-pink-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          ♀ {t("bedboard.femaleOnly")}
                        </span>
                      )}
                      {(() => {
                        const base = room.pricePerNight;
                        const bottom = base + (room.bottomBunkPremium || 0);
                        const hasPremium = (room.bottomBunkPremium || 0) > 0;
                        return (
                          <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {room.type === 'private'
                              ? `$${base}`
                              : hasPremium
                                ? `$${base}–$${bottom}`
                                : `$${base}`
                            }/{t('booking.perBedNight') || 'night'}
                          </span>
                        );
                      })()}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-medium text-zinc-500">
                      {room.beds.filter((b) => b.status === "occupied").length}/
                      {room.totalBeds} {t("bedboard.occupied")}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-400 hover:text-zinc-600"
                      onClick={() => {
                        setEditingRoom(room as Room);
                        setEditRoomName(room.name || "");
                        setEditRoomNumber(room.number);
                        setEditRoomPrice(room.pricePerNight);
                        setEditRoomBottomPremium(room.bottomBunkPremium || 0);
                      }}
                    >
                      <Settings2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {room.beds.map((bed) => (
                    <DroppableBed
                      key={bed.id}
                      bed={bed}
                      room={room}
                      onGuestClick={(guest, bedId) =>
                        setViewingGuest({ guest, bedId })
                      }
                      onCheckoutClick={(guestName, bedId) =>
                        setConfirmCheckoutData({ guestName, bedId })
                      }
                      popoverBedId={popoverBedId}
                      setPopoverBedId={setPopoverBedId}
                      navigateToGrow={navigateToGrow}
                    />
                  ))}
                </div>
              </div>
            ))}

            {filteredRooms.length === 0 && (
              <div className="text-center p-12 bg-white rounded-2xl border border-zinc-200 shadow-sm flex flex-col items-center gap-2">
                <div className="p-3 bg-zinc-100 rounded-lg">
                  <Filter className="h-6 w-6 text-zinc-400" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-900">
                  {t("bedboard.noBedsFound")}
                </h3>
                <p className="text-xs text-zinc-500">
                  {t("bedboard.tryAdjustingFilters")}
                </p>
              </div>
            )}
          </div>
        </div>

        <DragOverlay zIndex={1000}>
          {activeGuest ? (
            <div className="w-[180px] shadow-2xl rotate-2">
              <GuestCard guest={activeGuest} />
            </div>
          ) : null}
        </DragOverlay>
      </div>

      {/* Guest Details Dialog */}
      <Dialog
        open={!!viewingGuest}
        onOpenChange={(open) => !open && setViewingGuest(null)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {t("guest.details") || "Guest Information"}
            </DialogTitle>
          </DialogHeader>
          {viewingGuest &&
            (() => {
              const guest = viewingGuest.guest;
              const today = startOfDay(new Date());
              const checkInDate = startOfDay(parseISO(guest.checkInDate));
              const checkOutDate = startOfDay(parseISO(guest.checkOutDate));

              let daysPassed = differenceInDays(today, checkInDate);
              if (daysPassed < 0) daysPassed = 0;
              if (daysPassed > guest.nights) daysPassed = guest.nights;
              const progressPercent =
                guest.nights > 0 ? (daysPassed / guest.nights) * 100 : 0;

              const defaultTotal = guest.nights * 50;
              const totalAmount = guest.totalAmount || defaultTotal;
              const isUnpaid = guest.paymentStatus === "unpaid";
              const isPartial = guest.paymentStatus === "partial";
              const paidAmount =
                guest.paidAmount !== undefined
                  ? guest.paidAmount
                  : isUnpaid
                    ? 0
                    : isPartial
                      ? totalAmount / 2
                      : totalAmount;

              const dueAmount = totalAmount - paidAmount;

              return (
                <div className="space-y-6 pt-2">
                  {/* Visual Gantt Chart */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                      <span>{t("guest.stayProgress") || "Stay Progress"}</span>
                      <span>
                        {daysPassed} / {guest.nights} {t("guest.nights")}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-zinc-400 font-medium pb-1">
                      <span>{guest.checkInDate}</span>
                      <span>{guest.checkOutDate}</span>
                    </div>
                    <div className="relative h-2.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "absolute top-0 left-0 h-full rounded-full transition-all duration-700",
                          dueAmount > 0 ? "bg-amber-400" : "bg-emerald-400",
                        )}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Main Information */}
                  <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-4 space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b border-zinc-200/60">
                      <div className="p-2 bg-white rounded-full shadow-sm">
                        <UserCircle className="w-6 h-6 text-zinc-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 font-semibold text-zinc-900">
                          {guest.gender === "male" && <span className="text-blue-500 font-bold" title={t("guest.male") || "Male"}>♂</span>}
                          {guest.gender === "female" && <span className="text-pink-500 font-bold" title={t("guest.female") || "Female"}>♀</span>}
                          {guest.name}
                        </div>
                        <div className="text-xs text-zinc-500 flex items-center gap-1">
                          <span>{guest.country}</span>
                          {guest.countryCode && (
                            <span className="bg-zinc-200/50 px-1 py-0.5 rounded text-[10px] font-medium">
                              {guest.countryCode}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-zinc-400" />
                        <span
                          className="text-zinc-700 text-xs truncate"
                          title={guest.phone || ""}
                        >
                          {guest.phone || "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-zinc-400" />
                        <span
                          className="text-zinc-700 text-xs truncate"
                          title={guest.email || ""}
                        >
                          {guest.email || "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="text-zinc-700 text-xs truncate">
                          {guest.dob ? guest.dob : t("guest.dob") + " —"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-zinc-400" />
                        <span
                          className="text-zinc-700 text-xs truncate"
                          title={guest.passportOrId || ""}
                        >
                          {guest.passportOrId
                            ? guest.passportOrId
                            : t("guest.idPassport") + " —"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Overview */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-zinc-600 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" />
                      {t("guest.payment") || "Payment Summary"}
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white border border-zinc-200 shadow-sm rounded-lg p-3 text-center">
                        <div className="text-[10px] uppercase text-zinc-500 font-medium mb-1">
                          {t("guest.totalAmount")}
                        </div>
                        <div className="font-bold text-zinc-900">
                          ${totalAmount.toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-white border border-emerald-100 shadow-sm rounded-lg p-3 text-center">
                        <div className="text-[10px] uppercase text-emerald-600/70 font-medium mb-1">
                          {t("guest.paidAmount")}
                        </div>
                        <div className="font-bold text-emerald-600">
                          ${paidAmount.toFixed(2)}
                        </div>
                      </div>
                      <div
                        className={cn(
                          "border shadow-sm rounded-lg p-3 text-center",
                          dueAmount > 0
                            ? "bg-red-50/50 border-red-200"
                            : "bg-zinc-50 border-zinc-200",
                        )}
                      >
                        <div
                          className={cn(
                            "text-[10px] uppercase font-medium mb-1",
                            dueAmount > 0 ? "text-red-500/80" : "text-zinc-500",
                          )}
                        >
                          {t("guest.dueAmount")}
                        </div>
                        <div
                          className={cn(
                            "font-bold",
                            dueAmount > 0 ? "text-red-600" : "text-zinc-400",
                          )}
                        >
                          ${dueAmount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-between gap-3">
                    <Button
                      variant="outline"
                      className="w-full flex-1"
                      onClick={() => setViewingGuest(null)}
                    >
                      {t("guest.cancel") || "Cancel"}
                    </Button>
                    <Button
                      variant="destructive"
                      className="w-full flex-1"
                      onClick={() => {
                        setConfirmCheckoutData({
                          guestName: viewingGuest.guest.name,
                          bedId: viewingGuest.bedId,
                        });
                        setViewingGuest(null);
                      }}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      {t("guest.confirmCheckout") || "Check Out"}
                    </Button>
                  </div>
                </div>
              );
            })()}
        </DialogContent>
      </Dialog>

      {/* Checkout Confirmation Dialog */}
      <Dialog
        open={!!confirmCheckoutData}
        onOpenChange={(open) => !open && setConfirmCheckoutData(null)}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {t("guest.confirmCheckout") || "Confirm Check Out"}
            </DialogTitle>
          </DialogHeader>
          {confirmCheckoutData && (
            <div className="space-y-4 pt-4">
              <p className="text-sm text-zinc-600">
                {t("guest.checkoutWarning") ||
                  "Are you sure you want to check out "}
                <strong>{confirmCheckoutData.guestName}</strong>?
              </p>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setConfirmCheckoutData(null)}
                >
                  {t("guest.cancel") || "Cancel"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    checkoutGuest(confirmCheckoutData.bedId);
                    setConfirmCheckoutData(null);
                  }}
                >
                  {t("guest.confirm") || "Confirm Check Out"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Room Settings Dialog */}
      <Dialog
        open={!!editingRoom}
        onOpenChange={(open) => !open && setEditingRoom(null)}
      >
        <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-zinc-500" />
              {t("rooms.editRoom") || "Room Settings"} — {editingRoom?.name || editingRoom?.number}
            </DialogTitle>
          </DialogHeader>
          {editingRoom && (() => {
            const currentRoom = rooms.find(r => r.id === editingRoom.id);
            if (!currentRoom) return null;
            return (
              <div className="space-y-5 pt-2">
                {/* Room Info Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{t("rooms.roomInfo") || "Room Info"}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t("rooms.roomNumber") || "Number"}</Label>
                      <Input
                        required
                        placeholder="101"
                        value={editRoomNumber}
                        onChange={(e) => setEditRoomNumber(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t("rooms.roomName") || "Name"}</Label>
                      <Input
                        placeholder="Mixed Dorm"
                        value={editRoomName}
                        onChange={(e) => setEditRoomName(e.target.value)}
                      />
                    </div>
                  </div>
                  {/* Pricing - only show bunk distinction for dorm rooms */}
                  {currentRoom.type !== 'private' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t("rooms.topBunkPrice") || "Top Bunk / Night"}</Label>
                        <Input
                          type="number"
                          min={0}
                          placeholder="85"
                          value={editRoomPrice}
                          onChange={(e) => setEditRoomPrice(Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t("rooms.bottomBunkExtra") || "Bottom Bunk +"}</Label>
                        <Input
                          type="number"
                          min={0}
                          placeholder="10"
                          value={editRoomBottomPremium}
                          onChange={(e) => setEditRoomBottomPremium(Number(e.target.value))}
                        />
                        <p className="text-[10px] text-emerald-600 font-medium">
                          {t("rooms.bottomBunkTotal") || "Bottom bunk"}: ${editRoomPrice + editRoomBottomPremium}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t("rooms.pricePerNight") || "Price/Night"}</Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="150"
                        value={editRoomPrice}
                        onChange={(e) => setEditRoomPrice(Number(e.target.value))}
                      />
                    </div>
                  )}
                </div>

                {/* Beds Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      {t("rooms.bedsCount") || "Beds"} ({currentRoom.beds.length})
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {currentRoom.beds.map(bed => {
                      const bedPrice = currentRoom.pricePerNight + (bed.bedType === 'bottom' ? (currentRoom.bottomBunkPremium || 0) : 0);
                      return (
                        <div key={bed.id} className="flex items-center gap-2 bg-zinc-50 rounded-lg p-2.5">
                          <Input
                            className="h-8 text-xs w-24"
                            value={bed.name}
                            onChange={(e) => updateBed(currentRoom.id, bed.id, e.target.value)}
                            placeholder="A"
                          />
                          <Select
                            value={bed.bedType || "single"}
                            onValueChange={(val: string) => updateBed(currentRoom.id, bed.id, bed.name, val as "top" | "bottom" | "single" | "double")}
                          >
                            <SelectTrigger className="h-8 text-xs w-[100px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="top">{t("rooms.topBunk")}</SelectItem>
                              <SelectItem value="bottom">{t("rooms.bottomBunk")}</SelectItem>
                              <SelectItem value="single">{t("rooms.singleBed")}</SelectItem>
                              <SelectItem value="double">{t("rooms.doubleBed")}</SelectItem>
                            </SelectContent>
                          </Select>
                          <span className="text-xs font-semibold text-emerald-600 min-w-[40px] text-right">
                            ${bedPrice}
                          </span>
                          <span className={cn(
                            "text-[10px] font-medium px-1.5 py-0.5 rounded",
                            bed.status === 'occupied' ? 'bg-blue-100 text-blue-700' :
                            bed.status === 'empty' ? 'bg-emerald-100 text-emerald-700' :
                            bed.status === 'cleaning' ? 'bg-purple-100 text-purple-700' :
                            'bg-amber-100 text-amber-700'
                          )}>
                            {bed.status}
                          </span>
                          <button
                            onClick={() => {
                              if (bed.status === 'occupied') return;
                              deleteBed(currentRoom.id, bed.id);
                            }}
                            disabled={bed.status === 'occupied'}
                            className={cn(
                              "p-1.5 rounded-md transition-colors",
                              bed.status === 'occupied'
                                ? "text-zinc-300 cursor-not-allowed"
                                : "text-zinc-400 hover:text-red-500 hover:bg-red-50"
                            )}
                            title={bed.status === 'occupied' ? '' : (t("rooms.deleteBed") || "Delete Bed")}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {/* Add Bed inline */}
                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      className="h-8 text-xs w-24"
                      placeholder="A"
                      value={newBedName}
                      onChange={(e) => setNewBedName(e.target.value)}
                    />
                    <Select
                      value={newBedType}
                      onValueChange={(val: string) => setNewBedType(val)}
                    >
                      <SelectTrigger className="h-8 text-xs w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top">{t("rooms.topBunk")}</SelectItem>
                        <SelectItem value="bottom">{t("rooms.bottomBunk")}</SelectItem>
                        <SelectItem value="single">{t("rooms.singleBed")}</SelectItem>
                        <SelectItem value="double">{t("rooms.doubleBed")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-xs font-semibold text-emerald-600 min-w-[40px] text-right">
                      ${editRoomPrice + (newBedType === 'bottom' ? editRoomBottomPremium : 0)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      disabled={!newBedName.trim()}
                      onClick={() => {
                        addBedToRoom(currentRoom.id, { name: newBedName, bedType: newBedType });
                        setNewBedName("");
                        setNewBedType("single");
                      }}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      {t("rooms.createBed") || "Add"}
                    </Button>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      if (currentRoom.beds.some(b => b.status === 'occupied')) return;
                      deleteRoom(currentRoom.id);
                      setEditingRoom(null);
                    }}
                    disabled={currentRoom.beds.some(b => b.status === 'occupied')}
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    {t("rooms.deleteRoom") || "Delete Room"}
                  </Button>
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setEditingRoom(null)}>
                      {t("guest.cancel") || "Cancel"}
                    </Button>
                    <Button type="button" onClick={handleUpdateRoom}>
                      {t("rooms.save") || "Save"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Gender Conflict Confirmation Dialog */}
      <Dialog
        open={!!genderConflictData}
        onOpenChange={(open) => !open && setGenderConflictData(null)}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {t("bedboard.genderConflictTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-zinc-600">
              {t("bedboard.genderConflictMessage")}
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setGenderConflictData(null)}
              >
                {t("guest.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (genderConflictData) {
                    if (genderConflictData.type === "move" && genderConflictData.sourceBedId) {
                      moveGuest(genderConflictData.sourceBedId, genderConflictData.targetBedId);
                    }
                  }
                  setGenderConflictData(null);
                }}
              >
                {t("bedboard.assignAnyway")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DndContext>
  );
}
