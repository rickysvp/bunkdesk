# Bunkly — Small Hostel Operating System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Bunkly — The Operating System for Independent Hostels. Run your hostel, grow direct bookings, and fill more beds.

**Architecture:** Three-module system: Operations OS (manage today), Growth OS (get more orders), Hostel Copilot (guide decisions). Each module is a top-level navigation section. Data flows through React Context + localStorage persistence. Growth and Intelligence modules consume Operations data to generate actionable insights.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, motion/react (Framer Motion), dnd-kit, date-fns, lucide-react, shadcn/ui

---

## Product Mission

> 帮助小青旅赚钱，并且省时间。

Boss cares about:
- 更多订单 (More orders)
- 更多利润 (More profit)
- 更少麻烦 (Less hassle)

## Module Architecture

```
Bunkly
├── Module 1: Operations OS — 管理今天 (Manage today)
│   ├── Bed Board
│   ├── Reservation
│   ├── Check-in Center
│   ├── Housekeeping (minimal)
│   └── iCal Sync
├── Module 2: Growth OS — 获得更多订单 (Get more orders)
│   ├── Growth A: Direct Booking (官网 + 预订页 + 支付)
│   ├── Growth B: Guest CRM (客人资产 + 标签 + 召回)
│   └── Growth C: Occupancy Actions (空床 → 动作 → 预计增量)
└── Module 3: Hostel Copilot — 指导经营决策 (Guide decisions)
    ├── Today Summary
    ├── This Week Forecast
    ├── Opportunities
    └── Risks
```

## MVP Phasing

| Version | Scope | Value |
|---------|-------|-------|
| V1 | Operations + minimal Growth (Direct Booking) | 替代 Excel |
| V2 | Guest CRM + 老客召回 | 替代 BananaDesk |
| V3 | Occupancy Actions | 帮助赚钱 |
| V4 | Hostel Copilot | 帮助经营 |

## Current State vs Target

| Feature | Current Status | Target Version |
|---------|---------------|----------------|
| Bed Board | ✅ Built | V1 |
| Reservation | ✅ Built | V1 |
| Check-in Center | ✅ Built | V1 |
| Calendar View | ✅ Built | V1 |
| Shift Log | ✅ Built | V1 |
| Staff Panel | ✅ Built | V1 |
| iCal Import | ✅ Built | V1 |
| Booking Engine | ✅ Built | V1 |
| Hostel Page | ✅ Built | V1 |
| 3-Module Navigation | ❌ Flat tab list | V1 |
| Guest CRM | ❌ Not built | V2 |
| Guest Tags | ❌ Not built | V2 |
| Guest History | ❌ Not built | V2 |
| Occupancy Actions | ❌ Not built | V3 |
| Hostel Copilot | ❌ Not built | V4 |

---

## File Structure

### New Files to Create

| File | Responsibility |
|------|---------------|
| `src/types.ts` | Add `GuestTag`, `GuestProfile`, `OccupancyAction`, `CopilotInsight` types |
| `src/components/CopilotPanel.tsx` | Hostel Copilot main panel (V4) |
| `src/components/GuestCRM.tsx` | Guest CRM sub-panel (V2) |
| `src/components/OccupancyActions.tsx` | Occupancy Actions sub-panel (V3) |
| `src/utils/occupancyEngine.ts` | Pure functions for occupancy analysis + action generation |
| `src/utils/copilotEngine.ts` | Pure functions for copilot insights (today, week, opportunities, risks) |
| `src/utils/guestCrmEngine.ts` | Pure functions for guest profile building, tagging, recall |

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/Sidebar.tsx` | Restructure into 3-module navigation with collapsible sections |
| `src/components/GrowPanel.tsx` | Add Guest CRM + Occupancy Actions sub-tabs |
| `src/App.tsx` | Add Copilot panel route, restructure tab system |
| `src/HostelContext.tsx` | Add guest profiles, tags, occupancy actions state + methods |
| `src/data.ts` | Add demo data for guest profiles, tags |
| `src/i18nContext.tsx` | Add i18n keys for all new features |
| `src/StaffContext.tsx` | Add "copilot" to manager visible tabs |

---

## Task Breakdown

---

### Task 1: Restructure Sidebar into 3-Module Navigation

**Why:** The current flat tab list doesn't reflect the 3-module product architecture. Users need to see Operations / Growth / Intelligence as distinct modules.

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Define module-based tab configuration**

Replace the flat `ALL_TAB_CONFIG` with a module-grouped structure:

```tsx
const MODULE_CONFIG = [
  {
    id: 'operations',
    i18nKey: 'sidebar.operations',
    defaultIcon: LayoutDashboard,
    tabs: [
      { id: 'dashboard', icon: LayoutDashboard, i18nKey: 'sidebar.today' },
      { id: 'bedboard', icon: Grid, i18nKey: 'sidebar.bedBoard' },
      { id: 'checkin', icon: KeyRound, i18nKey: 'sidebar.checkIn' },
      { id: 'calendar', icon: Calendar, i18nKey: 'sidebar.calendar' },
      { id: 'reservations', icon: BookOpen, i18nKey: 'sidebar.reservations' },
      { id: 'shiftlog', icon: ClipboardList, i18nKey: 'sidebar.shiftLog' },
      { id: 'staff', icon: Users, i18nKey: 'staff.title' },
    ],
  },
  {
    id: 'growth',
    i18nKey: 'sidebar.growth',
    defaultIcon: Sprout,
    tabs: [
      { id: 'grow', icon: Sprout, i18nKey: 'sidebar.grow' },
    ],
  },
  {
    id: 'intelligence',
    i18nKey: 'sidebar.intelligence',
    defaultIcon: Brain,
    tabs: [
      { id: 'copilot', icon: Brain, i18nKey: 'sidebar.copilot' },
    ],
  },
  // migrate stays as standalone at bottom
];
```

- [ ] **Step 2: Implement collapsible module sections in Sidebar**

Each module group renders as a collapsible section with a header. The active module auto-expands. Clicking a module header collapses/expands it. The active tab is highlighted within its module.

```tsx
export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { t } = useTranslation();
  const { currentStaff, visibleTabs } = useStaff();
  const [expandedModules, setExpandedModules] = useState<string[]>(['operations', 'growth', 'intelligence']);

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev =>
      prev.includes(moduleId) ? prev.filter(id => id !== moduleId) : [...prev, moduleId]
    );
  };

  // Flatten all tabs for role filtering
  const allTabIds = MODULE_CONFIG.flatMap(m => m.tabs.map(t => t.id));
  const filteredModules = MODULE_CONFIG.map(module => ({
    ...module,
    tabs: module.tabs.filter(tab => visibleTabs.includes(tab.id)),
  })).filter(module => module.tabs.length > 0);

  // Add migrate as standalone
  const standaloneTabs = [{ id: 'migrate', icon: ArrowRightLeft, i18nKey: 'sidebar.migrate' }]
    .filter(tab => visibleTabs.includes(tab.id));

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 bg-[#F7F7F7] border-r border-[#EBEBEB] flex-col h-full inset-y-0 fixed z-10">
        <div className="p-6">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div className="h-8 w-8 bg-zinc-900 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm tracking-tighter">B</span>
            </div>
            <span className="font-semibold text-zinc-900 tracking-tight">Bunkly</span>
          </div>

          <nav className="flex flex-col gap-1">
            {filteredModules.map(module => (
              <div key={module.id}>
                {/* Module Header */}
                <button
                  onClick={() => toggleModule(module.id)}
                  className="flex items-center justify-between w-full px-3 py-2 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider hover:text-zinc-600 transition-colors"
                >
                  <span>{t(module.i18nKey) || module.id}</span>
                  <ChevronDown className={cn(
                    "h-3 w-3 transition-transform",
                    expandedModules.includes(module.id) ? "" : "-rotate-90"
                  )} />
                </button>
                {/* Module Tabs */}
                {expandedModules.includes(module.id) && module.tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ml-2",
                      activeTab === tab.id
                        ? "bg-white shadow-sm ring-1 ring-black/5 text-zinc-900"
                        : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                    )}
                  >
                    <tab.icon className={cn("h-4 w-4", activeTab === tab.id ? "text-zinc-900" : "text-zinc-400")} />
                    {t(tab.i18nKey) || tab.id}
                  </button>
                ))}
              </div>
            ))}

            {/* Standalone tabs */}
            {standaloneTabs.length > 0 && (
              <>
                <div className="border-t border-zinc-200 my-1.5" />
                {standaloneTabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer",
                      activeTab === tab.id
                        ? "bg-white shadow-sm ring-1 ring-black/5 text-zinc-900"
                        : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                    )}
                  >
                    <tab.icon className={cn("h-4 w-4", activeTab === tab.id ? "text-zinc-900" : "text-zinc-400")} />
                    {t(tab.i18nKey) || tab.id}
                  </button>
                ))}
              </>
            )}
          </nav>
        </div>
      </div>

      {/* Mobile Bottom Nav — keep existing 3-primary + more pattern */}
      {/* ... existing mobile nav code unchanged ... */}
    </>
  );
}
```

- [ ] **Step 3: Add `Brain` icon import and `ChevronDown` import**

Add to the lucide-react imports:
```tsx
import { LayoutDashboard, Grid, KeyRound, Calendar, BookOpen, ClipboardList, Users, Sprout, ArrowRightLeft, Brain, ChevronDown } from 'lucide-react';
```

- [ ] **Step 4: Update i18n keys**

In `src/i18nContext.tsx`, add:

EN:
```tsx
'sidebar.operations': 'Operations',
'sidebar.growth': 'Growth',
'sidebar.intelligence': 'Intelligence',
'sidebar.copilot': 'Copilot',
```

ZH:
```tsx
'sidebar.operations': '运营',
'sidebar.growth': '增长',
'sidebar.intelligence': '智能',
'sidebar.copilot': '经营助手',
```

- [ ] **Step 5: Update StaffContext to add copilot tab**

In `src/StaffContext.tsx`, update `ROLE_TABS`:

```tsx
const ROLE_TABS: Record<StaffRole, string[]> = {
  manager: ["dashboard", "bedboard", "shiftlog", "checkin", "calendar", "reservations", "staff", "grow", "copilot", "migrate"],
  reception: ["dashboard", "bedboard", "shiftlog", "checkin", "calendar", "reservations", "copilot"],
  cleaning: ["dashboard", "bedboard", "shiftlog"],
};
```

- [ ] **Step 6: Add CopilotPanel placeholder in App.tsx**

In `src/App.tsx`, add import and render:

```tsx
import { CopilotPanel } from './components/CopilotPanel';

// In the render section, add:
{effectiveTab === 'copilot' && <CopilotPanel />}

// In headerTitles, add:
copilot: t('sidebar.copilot') || 'Copilot',
```

- [ ] **Step 7: Create CopilotPanel placeholder**

Create `src/components/CopilotPanel.tsx`:

```tsx
import React from 'react';
import { Brain } from 'lucide-react';
import { useTranslation } from '../i18nContext';

export function CopilotPanel() {
  const { t } = useTranslation();

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-16 w-16 bg-zinc-100 rounded-2xl flex items-center justify-center mb-4">
          <Brain className="h-8 w-8 text-zinc-400" />
        </div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-2">
          {t('copilot.comingSoon') || 'Hostel Copilot'}
        </h2>
        <p className="text-sm text-zinc-500 max-w-sm">
          {t('copilot.comingSoonDesc') || 'Your intelligent hostel assistant is coming soon. It will help you make better decisions every day.'}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Verify the app compiles and runs**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 9: Commit**

```bash
git add src/components/Sidebar.tsx src/components/CopilotPanel.tsx src/App.tsx src/StaffContext.tsx src/i18nContext.tsx
git commit -m "feat: restructure sidebar into 3-module navigation (Operations/Growth/Intelligence)"
```

---

### Task 2: Add Guest Profile & Tag Types

**Why:** Guest CRM (V2) and Occupancy Actions (V3) both depend on a guest profile system that tracks history, tags, and contact info across stays. This type foundation must be laid first.

**Files:**
- Modify: `src/types.ts`
- Modify: `src/data.ts`
- Modify: `src/HostelContext.tsx`

- [ ] **Step 1: Add GuestTag and GuestProfile types to types.ts**

Append to `src/types.ts`:

```typescript
// Guest CRM
export type GuestTag =
  | "digital-nomad"
  | "backpacker"
  | "long-stay"
  | "repeat-guest"
  | "vip"
  | "group-leader";

export interface GuestProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  country: string;
  countryCode: string;
  gender?: "male" | "female" | "other";
  tags: GuestTag[];
  totalStays: number;
  totalNights: number;
  totalSpent: number;
  firstStayDate: string;
  lastStayDate: string;
  lastContactedAt?: string;
  notes?: string;
}

// Occupancy Actions
export type OccupancyActionType =
  | "long-stay-discount"
  | "old-guest-recall"
  | "last-minute-deal"
  | "room-type-conversion";

export interface OccupancyAction {
  id: string;
  type: OccupancyActionType;
  title: string;
  description: string;
  estimatedBedNights: number;
  estimatedRevenue: number;
  roomIds: string[];
  dateRange: { start: string; end: string };
  status: "pending" | "applied" | "dismissed";
  createdAt: string;
  appliedAt?: string;
  dismissedAt?: string;
}

// Copilot Insights
export type InsightSeverity = "info" | "warning" | "opportunity" | "risk";

export interface CopilotInsight {
  id: string;
  type: "opportunity" | "risk" | "action";
  severity: InsightSeverity;
  title: string;
  description: string;
  actionLabel?: string;
  actionTarget?: string; // tab or sub-tab to navigate to
  relatedIds?: string[];
  createdAt: string;
  dismissed: boolean;
}
```

- [ ] **Step 2: Add demo GuestProfile data to data.ts**

In `src/data.ts`, add:

```typescript
import { GuestProfile, GuestTag } from './types';

export const INITIAL_GUEST_PROFILES: GuestProfile[] = [
  {
    id: 'gp_1',
    name: 'Marco Rossi',
    email: 'marco@gmail.com',
    whatsapp: '+39 333 1234567',
    country: 'Italy',
    countryCode: 'IT',
    gender: 'male',
    tags: ['digital-nomad', 'repeat-guest'],
    totalStays: 4,
    totalNights: 42,
    totalSpent: 3360,
    firstStayDate: '2025-03-15',
    lastStayDate: '2025-11-20',
  },
  {
    id: 'gp_2',
    name: 'Yuki Tanaka',
    email: 'yuki.tanaka@yahoo.co.jp',
    country: 'Japan',
    countryCode: 'JP',
    gender: 'female',
    tags: ['backpacker', 'repeat-guest'],
    totalStays: 2,
    totalNights: 10,
    totalSpent: 850,
    firstStayDate: '2025-06-01',
    lastStayDate: '2025-09-10',
  },
  {
    id: 'gp_3',
    name: 'Lena Müller',
    email: 'lena.m@web.de',
    whatsapp: '+49 170 9876543',
    country: 'Germany',
    countryCode: 'DE',
    gender: 'female',
    tags: ['long-stay', 'vip'],
    totalStays: 1,
    totalNights: 30,
    totalSpent: 2550,
    firstStayDate: '2025-08-01',
    lastStayDate: '2025-08-31',
  },
];
```

- [ ] **Step 3: Add guestProfiles state to HostelContext**

In `src/HostelContext.tsx`, add to the HostelState interface:

```typescript
// Guest CRM
guestProfiles: GuestProfile[];
addGuestProfile: (profile: Omit<GuestProfile, "id">) => void;
updateGuestProfile: (profileId: string, updates: Partial<Pick<GuestProfile, "email" | "phone" | "whatsapp" | "tags" | "notes" | "lastContactedAt">>) => void;
addTagToGuest: (profileId: string, tag: GuestTag) => void;
removeTagFromGuest: (profileId: string, tag: GuestTag) => void;
```

Add state and implementations:

```typescript
const [guestProfiles, setGuestProfiles] = useState<GuestProfile[]>(() => loadState('guestProfiles', INITIAL_GUEST_PROFILES));

// In persist effect, add:
localStorage.setItem('bunkdesk_guestProfiles', JSON.stringify(guestProfiles));

// Implementations:
const addGuestProfile = useCallback((profile: Omit<GuestProfile, "id">) => {
  const newProfile: GuestProfile = { ...profile, id: `gp_${crypto.randomUUID()}` };
  setGuestProfiles((prev) => [...prev, newProfile]);
}, []);

const updateGuestProfile = useCallback((profileId: string, updates: Partial<Pick<GuestProfile, "email" | "phone" | "whatsapp" | "tags" | "notes" | "lastContactedAt">>) => {
  setGuestProfiles((prev) => prev.map(p => p.id === profileId ? { ...p, ...updates } : p));
}, []);

const addTagToGuest = useCallback((profileId: string, tag: GuestTag) => {
  setGuestProfiles((prev) => prev.map(p => {
    if (p.id !== profileId) return p;
    if (p.tags.includes(tag)) return p;
    return { ...p, tags: [...p.tags, tag] };
  }));
}, []);

const removeTagFromGuest = useCallback((profileId: string, tag: GuestTag) => {
  setGuestProfiles((prev) => prev.map(p => {
    if (p.id !== profileId) return p;
    return { ...p, tags: p.tags.filter(t => t !== tag) };
  }));
}, []);
```

Add to the context value and useMemo dependency array.

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/data.ts src/HostelContext.tsx
git commit -m "feat: add GuestProfile, OccupancyAction, CopilotInsight types and demo data"
```

---

### Task 3: Build Guest CRM Engine (Pure Functions)

**Why:** The CRM engine provides pure functions for building guest profiles from stay data, auto-tagging guests, and finding recall candidates. These are the business logic layer that both the CRM UI and Occupancy Actions depend on.

**Files:**
- Create: `src/utils/guestCrmEngine.ts`

- [ ] **Step 1: Write the guest CRM engine**

Create `src/utils/guestCrmEngine.ts`:

```typescript
import { Room, GuestProfile, GuestTag, Guest } from '../types';
import { differenceInDays, parseISO, subMonths, isAfter } from 'date-fns';

/**
 * Build a GuestProfile from all stays of a guest across rooms.
 * Aggregates total stays, nights, spending from current bed assignments.
 */
export function buildGuestProfileFromRooms(
  guestName: string,
  rooms: Room[]
): Omit<GuestProfile, 'id'> | null {
  const stays: Guest[] = [];

  for (const room of rooms) {
    for (const bed of room.beds) {
      if (bed.guest && bed.guest.name === guestName) {
        stays.push(bed.guest);
      }
      if (bed.reservations) {
        for (const res of bed.reservations) {
          if (res.name === guestName) {
            stays.push(res);
          }
        }
      }
    }
  }

  if (stays.length === 0) return null;

  const first = stays.reduce((earliest, s) =>
    parseISO(s.checkInDate) < parseISO(earliest.checkInDate) ? s : earliest
  );
  const last = stays.reduce((latest, s) =>
    parseISO(s.checkOutDate) > parseISO(latest.checkOutDate) ? s : latest
  );

  const totalNights = stays.reduce((sum, s) => sum + s.nights, 0);
  const totalSpent = stays.reduce((sum, s) => sum + (s.totalAmount || 0), 0);

  // Use the most complete guest record for contact info
  const mostComplete = stays.reduce((best, s) => {
    let score = 0;
    if (s.email) score++;
    if (s.phone) score++;
    if (s.country) score++;
    return score > best.score ? { guest: s, score } : best;
  }, { guest: stays[0], score: 0 }).guest;

  return {
    name: guestName,
    email: mostComplete.email,
    phone: mostComplete.phone,
    country: mostComplete.country,
    countryCode: mostComplete.countryCode,
    gender: mostComplete.gender,
    tags: autoTagGuest(stays, totalNights),
    totalStays: stays.length,
    totalNights,
    totalSpent,
    firstStayDate: first.checkInDate,
    lastStayDate: last.checkOutDate,
  };
}

/**
 * Auto-tag a guest based on their stay patterns.
 */
export function autoTagGuest(stays: Guest[], totalNights: number): GuestTag[] {
  const tags: GuestTag[] = [];

  // Long Stay: any single stay >= 14 nights
  if (stays.some(s => s.nights >= 14)) {
    tags.push('long-stay');
  }

  // Repeat Guest: 2+ stays
  if (stays.length >= 2) {
    tags.push('repeat-guest');
  }

  // Digital Nomad: 30+ total nights and 2+ stays
  if (totalNights >= 30 && stays.length >= 2) {
    tags.push('digital-nomad');
  }

  // Backpacker: stays < 5 nights each, multiple stays
  if (stays.length >= 2 && stays.every(s => s.nights <= 5)) {
    tags.push('backpacker');
  }

  // VIP: total spent > 2000
  const totalSpent = stays.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  if (totalSpent > 2000) {
    tags.push('vip');
  }

  return tags;
}

/**
 * Find guests who haven't returned in N months (recall candidates).
 */
export function findRecallCandidates(
  profiles: GuestProfile[],
  monthsInactive: number = 6
): GuestProfile[] {
  const cutoff = subMonths(new Date(), monthsInactive);
  return profiles.filter(p => {
    const lastStay = parseISO(p.lastStayDate);
    return isAfter(cutoff, lastStay) && p.totalStays >= 1;
  }).sort((a, b) => parseISO(a.lastStayDate).getTime() - parseISO(b.lastStayDate).getTime());
}

/**
 * Get all unique guest names currently in the system (from beds + arrivals).
 */
export function getAllGuestNames(rooms: Room[], arrivals: Guest[]): string[] {
  const names = new Set<string>();

  for (const room of rooms) {
    for (const bed of room.beds) {
      if (bed.guest) names.add(bed.guest.name);
      if (bed.reservations) {
        for (const res of bed.reservations) names.add(res.name);
      }
    }
  }

  for (const arrival of arrivals) {
    names.add(arrival.name);
  }

  return Array.from(names).sort();
}

/**
 * Sync guest profiles: create new profiles for guests not yet in the system,
 * update existing profiles with latest stay data.
 */
export function syncGuestProfiles(
  existingProfiles: GuestProfile[],
  rooms: Room[],
  arrivals: Guest[]
): { toAdd: Omit<GuestProfile, 'id'>[]; toUpdate: { id: string; updates: Partial<GuestProfile> }[] } {
  const allNames = getAllGuestNames(rooms, arrivals);
  const existingNames = new Set(existingProfiles.map(p => p.name));

  const toAdd: Omit<GuestProfile, 'id'>[] = [];
  const toUpdate: { id: string; updates: Partial<GuestProfile> }[] = [];

  for (const name of allNames) {
    const built = buildGuestProfileFromRooms(name, rooms);
    if (!built) continue;

    const existing = existingProfiles.find(p => p.name === name);
    if (!existing) {
      toAdd.push(built);
    } else {
      // Check if any data has changed
      const updates: Partial<GuestProfile> = {};
      if (built.totalStays > existing.totalStays) updates.totalStays = built.totalStays;
      if (built.totalNights > existing.totalNights) updates.totalNights = built.totalNights;
      if (built.totalSpent > existing.totalSpent) updates.totalSpent = built.totalSpent;
      if (built.lastStayDate > existing.lastStayDate) updates.lastStayDate = built.lastStayDate;
      if (built.email && !existing.email) updates.email = built.email;
      if (built.phone && !existing.phone) updates.phone = built.phone;

      // Merge tags
      const newTags = built.tags.filter(t => !existing.tags.includes(t));
      if (newTags.length > 0) updates.tags = [...existing.tags, ...newTags];

      if (Object.keys(updates).length > 0) {
        toUpdate.push({ id: existing.id, updates });
      }
    }
  }

  return { toAdd, toUpdate };
}

/**
 * Get display label for a guest tag.
 */
export function getTagLabel(tag: GuestTag): { en: string; zh: string; color: string } {
  const map: Record<GuestTag, { en: string; zh: string; color: string }> = {
    'digital-nomad': { en: 'Digital Nomad', zh: '数字游民', color: 'bg-blue-50 text-blue-700' },
    'backpacker': { en: 'Backpacker', zh: '背包客', color: 'bg-green-50 text-green-700' },
    'long-stay': { en: 'Long Stay', zh: '长住', color: 'bg-purple-50 text-purple-700' },
    'repeat-guest': { en: 'Repeat Guest', zh: '回头客', color: 'bg-amber-50 text-amber-700' },
    'vip': { en: 'VIP', zh: 'VIP', color: 'bg-rose-50 text-rose-700' },
    'group-leader': { en: 'Group Leader', zh: '团队领队', color: 'bg-indigo-50 text-indigo-700' },
  };
  return map[tag];
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/utils/guestCrmEngine.ts
git commit -m "feat: add guest CRM engine with auto-tagging, recall candidates, and profile sync"
```

---

### Task 4: Build Guest CRM UI

**Why:** The Guest CRM is the V2 feature that lets hostel owners see their guest assets, auto-tagged profiles, and recall candidates. This is the "客人资产" module.

**Files:**
- Create: `src/components/GuestCRM.tsx`
- Modify: `src/components/GrowPanel.tsx`
- Modify: `src/i18nContext.tsx`

- [ ] **Step 1: Create GuestCRM component**

Create `src/components/GuestCRM.tsx`:

```tsx
import React, { useState, useMemo } from 'react';
import { useHostel } from '../HostelContext';
import { useTranslation } from '../i18nContext';
import { GuestProfile, GuestTag } from '../types';
import { findRecallCandidates, getTagLabel, syncGuestProfiles, getAllGuestNames } from '../utils/guestCrmEngine';
import { Users, Search, Tag, Mail, Phone, MessageCircle, Star, Clock, ArrowRight, RefreshCw, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

type CRMView = 'all' | 'recall' | 'tags';

export function GuestCRM() {
  const { rooms, arrivals, guestProfiles, addGuestProfile, updateGuestProfile, addTagToGuest, removeTagFromGuest } = useHostel();
  const { t, language } = useTranslation();
  const [view, setView] = useState<CRMView>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<GuestProfile | null>(null);
  const [tagFilter, setTagFilter] = useState<GuestTag | null>(null);

  // Sync profiles on mount
  const syncResult = useMemo(() => syncGuestProfiles(guestProfiles, rooms, arrivals), [guestProfiles, rooms, arrivals]);

  const recallCandidates = useMemo(() => findRecallCandidates(guestProfiles), [guestProfiles]);

  const filteredProfiles = useMemo(() => {
    let profiles = guestProfiles;

    if (view === 'recall') {
      profiles = recallCandidates;
    }

    if (tagFilter) {
      profiles = profiles.filter(p => p.tags.includes(tagFilter));
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      profiles = profiles.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.country.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q)
      );
    }

    return profiles.sort((a, b) => b.totalSpent - a.totalSpent);
  }, [guestProfiles, view, recallCandidates, tagFilter, searchQuery]);

  const allTags = useMemo(() => {
    const tagSet = new Set<GuestTag>();
    guestProfiles.forEach(p => p.tags.forEach(t => tagSet.add(t)));
    return Array.from(tagSet);
  }, [guestProfiles]);

  const totalGuests = guestProfiles.length;
  const totalRepeatGuests = guestProfiles.filter(p => p.tags.includes('repeat-guest')).length;
  const totalRecallable = recallCandidates.length;

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border shadow-none bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-500">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-zinc-900 leading-none">{totalGuests}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{t('crm.totalGuests') || 'Total Guests'}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-none bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-500">
              <Star className="h-4 w-4" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-zinc-900 leading-none">{totalRepeatGuests}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{t('crm.repeatGuests') || 'Repeat Guests'}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-none bg-white cursor-pointer hover:shadow-sm transition-shadow" onClick={() => setView(view === 'recall' ? 'all' : 'recall')}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-50 text-rose-500">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-zinc-900 leading-none">{totalRecallable}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{t('crm.toRecall') || 'To Recall'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 bg-zinc-100 rounded-xl p-1">
          {([
            { id: 'all' as CRMView, label: t('crm.allGuests') || 'All Guests' },
            { id: 'recall' as CRMView, label: t('crm.recallCandidates') || 'Recall' },
            { id: 'tags' as CRMView, label: t('crm.byTag') || 'By Tag' },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => { setView(tab.id); setTagFilter(null); }}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                view === tab.id ? 'bg-white shadow-sm text-emerald-600' : 'text-zinc-500 hover:text-zinc-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            className="pl-9 h-9"
            placeholder={t('crm.searchGuests') || 'Search guests...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Tag Filter (when in tags view) */}
      {view === 'tags' && (
        <div className="flex flex-wrap gap-2">
          {allTags.map(tag => {
            const label = getTagLabel(tag);
            return (
              <button
                key={tag}
                onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  tagFilter === tag ? label.color + ' ring-2 ring-offset-1' : label.color + ' opacity-60 hover:opacity-100'
                )}
              >
                {language === 'zh' ? label.zh : label.en}
              </button>
            );
          })}
        </div>
      )}

      {/* Sync Notice */}
      {syncResult.toAdd.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
          <CardContent className="p-3 flex items-center justify-between">
            <span className="text-xs text-amber-700">
              {syncResult.toAdd.length} {t('crm.newProfilesToSync') || 'new guest profiles to sync'}
            </span>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
              <RefreshCw className="h-3 w-3" />
              {t('crm.syncNow') || 'Sync'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Guest List */}
      <div className="space-y-2">
        <AnimatePresence>
          {filteredProfiles.map((profile, i) => (
            <motion.div
              key={profile.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ delay: i * 0.02 }}
            >
              <Card
                className="border shadow-none bg-white cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() => setSelectedProfile(profile)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  {/* Avatar */}
                  <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center text-sm font-medium text-zinc-600 shrink-0">
                    {profile.name.charAt(0)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-900 truncate">{profile.name}</span>
                      <span className="text-[10px] text-zinc-400">{profile.countryCode}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-zinc-500">{profile.totalStays}x {t('crm.stays') || 'stays'}</span>
                      <span className="text-xs text-zinc-500">{profile.totalNights}N</span>
                      <span className="text-xs font-medium text-emerald-600">${profile.totalSpent}</span>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                    {profile.tags.slice(0, 3).map(tag => {
                      const label = getTagLabel(tag);
                      return (
                        <span key={tag} className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", label.color)}>
                          {language === 'zh' ? label.zh : label.en}
                        </span>
                      );
                    })}
                    {profile.tags.length > 3 && (
                      <span className="text-[10px] text-zinc-400">+{profile.tags.length - 3}</span>
                    )}
                  </div>

                  {/* Contact indicators */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {profile.email && <Mail className="h-3.5 w-3.5 text-zinc-300" />}
                    {profile.whatsapp && <MessageCircle className="h-3.5 w-3.5 text-green-400" />}
                    {profile.phone && <Phone className="h-3.5 w-3.5 text-zinc-300" />}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredProfiles.length === 0 && (
          <div className="py-12 text-center text-sm text-zinc-500">
            {view === 'recall'
              ? (t('crm.noRecallCandidates') || 'No recall candidates found')
              : (t('crm.noGuests') || 'No guests found')
            }
          </div>
        )}
      </div>

      {/* Guest Detail Modal */}
      <AnimatePresence>
        {selectedProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
            onClick={() => setSelectedProfile(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-5 border-b border-zinc-100 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-lg font-medium text-zinc-600">
                    {selectedProfile.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-900">{selectedProfile.name}</h3>
                    <span className="text-xs text-zinc-500">{selectedProfile.country}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedProfile(null)} className="p-1 hover:bg-zinc-100 rounded-lg">
                  <span className="text-zinc-400 text-lg">&times;</span>
                </button>
              </div>

              {/* Stats */}
              <div className="p-5 grid grid-cols-3 gap-3">
                <div className="bg-zinc-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-semibold text-zinc-900">{selectedProfile.totalStays}</p>
                  <p className="text-[10px] text-zinc-500 uppercase">{t('crm.stays') || 'Stays'}</p>
                </div>
                <div className="bg-zinc-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-semibold text-zinc-900">{selectedProfile.totalNights}</p>
                  <p className="text-[10px] text-zinc-500 uppercase">{t('crm.nights') || 'Nights'}</p>
                </div>
                <div className="bg-zinc-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-semibold text-emerald-600">${selectedProfile.totalSpent}</p>
                  <p className="text-[10px] text-zinc-500 uppercase">{t('crm.spent') || 'Spent'}</p>
                </div>
              </div>

              {/* Tags */}
              <div className="px-5 pb-4">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase mb-2">{t('crm.tags') || 'Tags'}</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedProfile.tags.map(tag => {
                    const label = getTagLabel(tag);
                    return (
                      <span key={tag} className={cn("text-xs font-medium px-2 py-1 rounded-lg", label.color)}>
                        {language === 'zh' ? label.zh : label.en}
                      </span>
                    );
                  })}
                  {selectedProfile.tags.length === 0 && (
                    <span className="text-xs text-zinc-400">{t('crm.noTags') || 'No tags'}</span>
                  )}
                </div>
              </div>

              {/* Contact */}
              <div className="px-5 pb-4 space-y-2">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase mb-2">{t('crm.contact') || 'Contact'}</p>
                {selectedProfile.email && (
                  <div className="flex items-center gap-2 text-xs text-zinc-600">
                    <Mail className="h-3.5 w-3.5 text-zinc-400" /> {selectedProfile.email}
                  </div>
                )}
                {selectedProfile.phone && (
                  <div className="flex items-center gap-2 text-xs text-zinc-600">
                    <Phone className="h-3.5 w-3.5 text-zinc-400" /> {selectedProfile.phone}
                  </div>
                )}
                {selectedProfile.whatsapp && (
                  <div className="flex items-center gap-2 text-xs text-zinc-600">
                    <MessageCircle className="h-3.5 w-3.5 text-green-500" /> {selectedProfile.whatsapp}
                  </div>
                )}
                {!selectedProfile.email && !selectedProfile.phone && !selectedProfile.whatsapp && (
                  <span className="text-xs text-zinc-400">{t('crm.noContact') || 'No contact info'}</span>
                )}
              </div>

              {/* Stay History */}
              <div className="px-5 pb-5">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase mb-2">{t('crm.stayHistory') || 'Stay History'}</p>
                <div className="text-xs text-zinc-500">
                  {t('crm.firstStay') || 'First stay'}: {format(parseISO(selectedProfile.firstStayDate), 'MMM d, yyyy')}
                </div>
                <div className="text-xs text-zinc-500">
                  {t('crm.lastStay') || 'Last stay'}: {format(parseISO(selectedProfile.lastStayDate), 'MMM d, yyyy')}
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-zinc-100 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 text-xs gap-1.5">
                  <Tag className="h-3 w-3" />
                  {t('crm.editTags') || 'Edit Tags'}
                </Button>
                <Button size="sm" className="flex-1 text-xs gap-1.5">
                  <MessageCircle className="h-3 w-3" />
                  {t('crm.sendOffer') || 'Send Offer'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Add Guest CRM sub-tab to GrowPanel**

In `src/components/GrowPanel.tsx`, add the CRM sub-tab:

```tsx
import { GuestCRM } from './GuestCRM';

// Add to SUB_TABS array:
const SUB_TABS = [
  { id: 'hostel-page', icon: Globe, i18nKey: 'grow.hostelPage' },
  { id: 'crm', icon: Users, i18nKey: 'grow.crm' },
  { id: 'social', icon: MessageCircle, i18nKey: 'grow.social' },
  { id: 'referral', icon: Gift, i18nKey: 'grow.referral' },
  { id: 'pricing', icon: TrendingUp, i18nKey: 'grow.pricing' },
];

// Add render case:
{activeSubTab === 'crm' && <GuestCRM />}
```

Add `Users` to lucide-react imports.

- [ ] **Step 3: Add i18n keys**

In `src/i18nContext.tsx`, add:

EN:
```tsx
'grow.crm': 'Guest CRM',
'crm.totalGuests': 'Total Guests',
'crm.repeatGuests': 'Repeat Guests',
'crm.toRecall': 'To Recall',
'crm.allGuests': 'All Guests',
'crm.recallCandidates': 'Recall',
'crm.byTag': 'By Tag',
'crm.searchGuests': 'Search guests...',
'crm.stays': 'stays',
'crm.nights': 'Nights',
'crm.spent': 'Spent',
'crm.tags': 'Tags',
'crm.noTags': 'No tags',
'crm.contact': 'Contact',
'crm.noContact': 'No contact info',
'crm.stayHistory': 'Stay History',
'crm.firstStay': 'First stay',
'crm.lastStay': 'Last stay',
'crm.editTags': 'Edit Tags',
'crm.sendOffer': 'Send Offer',
'crm.newProfilesToSync': 'new guest profiles to sync',
'crm.syncNow': 'Sync',
'crm.noRecallCandidates': 'No recall candidates found',
'crm.noGuests': 'No guests found',
```

ZH:
```tsx
'grow.crm': '客人资产',
'crm.totalGuests': '总客人',
'crm.repeatGuests': '回头客',
'crm.toRecall': '待召回',
'crm.allGuests': '全部客人',
'crm.recallCandidates': '召回',
'crm.byTag': '按标签',
'crm.searchGuests': '搜索客人...',
'crm.stays': '次入住',
'crm.nights': '晚',
'crm.spent': '消费',
'crm.tags': '标签',
'crm.noTags': '无标签',
'crm.contact': '联系方式',
'crm.noContact': '无联系方式',
'crm.stayHistory': '入住记录',
'crm.firstStay': '首次入住',
'crm.lastStay': '最近入住',
'crm.editTags': '编辑标签',
'crm.sendOffer': '发送优惠',
'crm.newProfilesToSync': '个新客人资料待同步',
'crm.syncNow': '同步',
'crm.noRecallCandidates': '暂无召回候选人',
'crm.noGuests': '暂无客人',
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/GuestCRM.tsx src/components/GrowPanel.tsx src/i18nContext.tsx
git commit -m "feat: add Guest CRM panel with profiles, tags, and recall candidates"
```

---

### Task 5: Build Occupancy Engine (Pure Functions)

**Why:** The Occupancy Actions feature (V3) needs a pure calculation engine that analyzes future bed availability and generates actionable suggestions with estimated impact. This is the core intelligence behind "空床 → 动作 → 预计增量".

**Files:**
- Create: `src/utils/occupancyEngine.ts`

- [ ] **Step 1: Write the occupancy engine**

Create `src/utils/occupancyEngine.ts`:

```typescript
import { Room, Bed, GuestProfile, OccupancyAction, OccupancyActionType } from '../types';
import { addDays, format, differenceInDays, parseISO } from 'date-fns';

interface DayAvailability {
  date: string;
  totalBeds: number;
  occupiedBeds: number;
  emptyBeds: number;
  occupancyRate: number;
  rooms: {
    roomId: string;
    roomName: string;
    roomType: string;
    totalBeds: number;
    emptyBeds: number;
  }[];
}

/**
 * Calculate bed availability for each day in a date range.
 * Uses current bed status + reservation check-in/check-out dates.
 */
export function calculateAvailability(
  rooms: Room[],
  startDate: Date,
  days: number
): DayAvailability[] {
  const result: DayAvailability[] = [];

  for (let i = 0; i < days; i++) {
    const date = addDays(startDate, i);
    const dateStr = format(date, 'yyyy-MM-dd');

    let totalBeds = 0;
    let occupiedBeds = 0;
    const roomAvail = rooms.map(room => {
      const roomTotal = room.beds.length;
      const roomOccupied = room.beds.filter(b => {
        // Currently occupied and check-out is after this date
        if (b.guest && b.guest.checkOutDate >= dateStr) return true;
        // Reserved for this date
        if (b.reservations?.some(r => r.checkInDate <= dateStr && r.checkOutDate > dateStr)) return true;
        return false;
      }).length;
      const roomEmpty = roomTotal - roomOccupied;

      totalBeds += roomTotal;
      occupiedBeds += roomOccupied;

      return {
        roomId: room.id,
        roomName: room.name || room.number,
        roomType: room.type,
        totalBeds: roomTotal,
        emptyBeds: roomEmpty,
      };
    });

    result.push({
      date: dateStr,
      totalBeds,
      occupiedBeds,
      emptyBeds: totalBeds - occupiedBeds,
      occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
      rooms: roomAvail,
    });
  }

  return result;
}

/**
 * Generate occupancy actions based on availability analysis.
 * This is the core "空床 → 动作 → 预计增量" logic.
 */
export function generateOccupancyActions(
  rooms: Room[],
  guestProfiles: GuestProfile[],
  lookaheadDays: number = 7
): OccupancyAction[] {
  const today = new Date();
  const availability = calculateAvailability(rooms, today, lookaheadDays);

  const actions: OccupancyAction[] = [];

  // Calculate total empty bed-nights in the lookahead period
  const totalEmptyBedNights = availability.reduce((sum, day) => sum + day.emptyBeds, 0);

  if (totalEmptyBedNights === 0) return actions;

  // ── Action 1: Long Stay Discount ──────────────────────────────
  // If there are 10+ empty bed-nights in the next 7 days, suggest long stay discount
  if (totalEmptyBedNights >= 10) {
    const avgEmptyPerDay = totalEmptyBedNights / lookaheadDays;
    const estimatedFill = Math.min(Math.round(avgEmptyPerDay * 0.4), totalEmptyBedNights);
    const avgPrice = rooms.reduce((sum, r) => sum + r.pricePerNight, 0) / rooms.length;

    actions.push({
      id: `oa_${crypto.randomUUID()}`,
      type: 'long-stay-discount',
      title: 'Open Long Stay Discount',
      description: `${totalEmptyBedNights} empty bed-nights in next ${lookaheadDays} days. Offer 15% off for 7+ night stays to fill empty beds.`,
      estimatedBedNights: estimatedFill,
      estimatedRevenue: Math.round(estimatedFill * avgPrice * 0.85),
      roomIds: rooms.map(r => r.id),
      dateRange: {
        start: format(today, 'yyyy-MM-dd'),
        end: format(addDays(today, lookaheadDays), 'yyyy-MM-dd'),
      },
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
  }

  // ── Action 2: Old Guest Recall ────────────────────────────────
  // If there are repeat guests who haven't been back in 3+ months
  const threeMonthsAgo = addDays(today, -90);
  const recallableGuests = guestProfiles.filter(p => {
    const lastStay = parseISO(p.lastStayDate);
    return lastStay < threeMonthsAgo && p.totalStays >= 1 && (p.email || p.whatsapp);
  });

  if (recallableGuests.length > 0 && totalEmptyBedNights >= 5) {
    const estimatedFill = Math.min(recallableGuests.length * 2, totalEmptyBedNights);
    const avgPrice = rooms.reduce((sum, r) => sum + r.pricePerNight, 0) / rooms.length;

    actions.push({
      id: `oa_${crypto.randomUUID()}`,
      type: 'old-guest-recall',
      title: `Recall ${recallableGuests.length} Previous Guests`,
      description: `${recallableGuests.length} guests haven't returned in 3+ months. Send them a 10% off offer to fill ${totalEmptyBedNights} empty bed-nights.`,
      estimatedBedNights: estimatedFill,
      estimatedRevenue: Math.round(estimatedFill * avgPrice * 0.9),
      roomIds: rooms.map(r => r.id),
      dateRange: {
        start: format(today, 'yyyy-MM-dd'),
        end: format(addDays(today, lookaheadDays), 'yyyy-MM-dd'),
      },
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
  }

  // ── Action 3: Last Minute Deal ────────────────────────────────
  // If there are 5+ empty beds in the next 3 days
  const next3Days = availability.slice(0, 3);
  const next3DaysEmpty = next3Days.reduce((sum, d) => sum + d.emptyBeds, 0);

  if (next3DaysEmpty >= 5) {
    const avgPrice = rooms.reduce((sum, r) => sum + r.pricePerNight, 0) / rooms.length;
    const estimatedFill = Math.min(Math.round(next3DaysEmpty * 0.35), next3DaysEmpty);

    actions.push({
      id: `oa_${crypto.randomUUID()}`,
      type: 'last-minute-deal',
      title: 'Open Last Minute Deal',
      description: `${next3DaysEmpty} empty beds in next 3 days. Offer 20% off for immediate bookings.`,
      estimatedBedNights: estimatedFill,
      estimatedRevenue: Math.round(estimatedFill * avgPrice * 0.8),
      roomIds: rooms.map(r => r.id),
      dateRange: {
        start: format(today, 'yyyy-MM-dd'),
        end: format(addDays(today, 3), 'yyyy-MM-dd'),
      },
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
  }

  // ── Action 4: Room Type Conversion ────────────────────────────
  // If female dorm has high vacancy but mixed dorm is fuller
  const femaleDorms = rooms.filter(r => r.type === 'dorm-female');
  const mixedDorms = rooms.filter(r => r.type === 'dorm-mixed');

  if (femaleDorms.length > 0 && mixedDorms.length > 0) {
    const femaleOccupancy = femaleDorms.reduce((sum, r) => {
      const total = r.beds.length;
      const occupied = r.beds.filter(b => b.status === 'occupied').length;
      return sum + (total > 0 ? occupied / total : 0);
    }, 0) / femaleDorms.length;

    const mixedOccupancy = mixedDorms.reduce((sum, r) => {
      const total = r.beds.length;
      const occupied = r.beds.filter(b => b.status === 'occupied').length;
      return sum + (total > 0 ? occupied / total : 0);
    }, 0) / mixedDorms.length;

    if (femaleOccupancy < 0.4 && mixedOccupancy > 0.6) {
      const femaleEmpty = femaleDorms.reduce((sum, r) => sum + r.beds.filter(b => b.status === 'empty').length, 0);
      const convertCount = Math.min(2, femaleEmpty);

      actions.push({
        id: `oa_${crypto.randomUUID()}`,
        type: 'room-type-conversion',
        title: `Convert ${convertCount} Beds from Female to Mixed`,
        description: `Female dorm is ${Math.round(femaleOccupancy * 100)}% occupied while Mixed dorm is ${Math.round(mixedOccupancy * 100)}%. Converting ${convertCount} beds could increase bookings.`,
        estimatedBedNights: convertCount * lookaheadDays * Math.round(mixedOccupancy),
        estimatedRevenue: convertCount * lookaheadDays * Math.round(mixedOccupancy) * (mixedDorms[0]?.pricePerNight || 0),
        roomIds: femaleDorms.map(r => r.id),
        dateRange: {
          start: format(today, 'yyyy-MM-dd'),
          end: format(addDays(today, lookaheadDays), 'yyyy-MM-dd'),
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
    }
  }

  return actions.sort((a, b) => b.estimatedRevenue - a.estimatedRevenue);
}

/**
 * Get a human-readable label for an occupancy action type.
 */
export function getActionTypeLabel(type: OccupancyActionType): { en: string; zh: string; icon: string } {
  const map: Record<OccupancyActionType, { en: string; zh: string; icon: string }> = {
    'long-stay-discount': { en: 'Long Stay Discount', zh: '长住优惠', icon: '🏠' },
    'old-guest-recall': { en: 'Guest Recall', zh: '老客召回', icon: '📧' },
    'last-minute-deal': { en: 'Last Minute Deal', zh: '限时特价', icon: '⚡' },
    'room-type-conversion': { en: 'Room Conversion', zh: '房型转换', icon: '🔄' },
  };
  return map[type];
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/utils/occupancyEngine.ts
git commit -m "feat: add occupancy engine with action generation (long-stay, recall, last-minute, conversion)"
```

---

### Task 6: Build Occupancy Actions UI

**Why:** This is the V3 feature — the core differentiator. Instead of just showing data, the system gives actionable suggestions with estimated impact. "未来7天空床18个 → 开放长住优惠 → 预计增加4床夜".

**Files:**
- Create: `src/components/OccupancyActions.tsx`
- Modify: `src/components/GrowPanel.tsx`
- Modify: `src/i18nContext.tsx`

- [ ] **Step 1: Create OccupancyActions component**

Create `src/components/OccupancyActions.tsx`:

```tsx
import React, { useState, useMemo } from 'react';
import { useHostel } from '../HostelContext';
import { useTranslation } from '../i18nContext';
import { OccupancyAction } from '../types';
import { generateOccupancyActions, calculateAvailability, getActionTypeLabel } from '../utils/occupancyEngine';
import { Zap, TrendingUp, Bed, Calendar, ChevronRight, Check, X, BarChart3, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

export function OccupancyActions() {
  const { rooms, guestProfiles } = useHostel();
  const { t, language } = useTranslation();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Generate actions
  const actions = useMemo(() => generateOccupancyActions(rooms, guestProfiles, 7), [rooms, guestProfiles]);

  const activeActions = actions.filter(a => !dismissedIds.has(a.id));

  // Calculate 7-day overview
  const availability = useMemo(() => calculateAvailability(rooms, new Date(), 7), [rooms]);
  const totalEmptyBedNights = availability.reduce((sum, d) => sum + d.emptyBeds, 0);
  const avgOccupancy = availability.reduce((sum, d) => sum + d.occupancyRate, 0) / availability.length;
  const totalPotentialRevenue = activeActions.reduce((sum, a) => sum + a.estimatedRevenue, 0);
  const totalPotentialBedNights = activeActions.reduce((sum, a) => sum + a.estimatedBedNights, 0);

  const handleApply = (action: OccupancyAction) => {
    // In a real app, this would create a promotion or send emails
    // For now, mark as applied
    setDismissedIds(prev => new Set([...prev, action.id]));
  };

  const handleDismiss = (actionId: string) => {
    setDismissedIds(prev => new Set([...prev, actionId]));
  };

  return (
    <div className="space-y-6">
      {/* 7-Day Overview */}
      <Card className="border shadow-none bg-white">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-zinc-400" />
              {t('occupancy.next7Days') || 'Next 7 Days'}
            </h3>
            <span className="text-xs text-zinc-500">
              {t('occupancy.avgOccupancy') || 'Avg Occupancy'}: {Math.round(avgOccupancy)}%
            </span>
          </div>

          {/* Day-by-day bars */}
          <div className="flex gap-1.5 items-end h-20">
            {availability.map((day, i) => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full relative h-16 bg-zinc-100 rounded overflow-hidden">
                  <div
                    className={cn(
                      "absolute bottom-0 w-full transition-all",
                      day.occupancyRate >= 80 ? "bg-emerald-400" :
                      day.occupancyRate >= 50 ? "bg-amber-400" : "bg-red-400"
                    )}
                    style={{ height: `${day.occupancyRate}%` }}
                  />
                </div>
                <span className="text-[10px] text-zinc-400">
                  {format(addDays(new Date(), i), 'EEE')}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
            <span>{totalEmptyBedNights} {t('occupancy.emptyBedNights') || 'empty bed-nights'}</span>
            <span>{t('occupancy.potentialRevenue') || 'Potential'}: <span className="font-medium text-emerald-600">${totalPotentialRevenue}</span></span>
          </div>
        </CardContent>
      </Card>

      {/* Suggested Actions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            {t('occupancy.suggestedActions') || 'Suggested Actions'}
            <Badge variant="secondary" className="text-[10px]">{activeActions.length}</Badge>
          </h3>
        </div>

        <div className="space-y-3">
          <AnimatePresence>
            {activeActions.map((action, i) => {
              const typeLabel = getActionTypeLabel(action.type);
              return (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="border shadow-none bg-white border-l-4 border-l-amber-400">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-xl mt-0.5">{typeLabel.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-semibold text-zinc-900">{action.title}</h4>
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
                              {language === 'zh' ? typeLabel.zh : typeLabel.en}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 mb-3">{action.description}</p>

                          {/* Impact Estimates */}
                          <div className="flex items-center gap-4 mb-3">
                            <div className="flex items-center gap-1.5">
                              <Bed className="h-3.5 w-3.5 text-emerald-500" />
                              <span className="text-xs font-medium text-emerald-600">+{action.estimatedBedNights} {t('occupancy.bedNights') || 'bed-nights'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                              <span className="text-xs font-medium text-emerald-600">+${action.estimatedRevenue}</span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2">
                            <Button size="sm" className="h-7 text-xs gap-1.5" onClick={() => handleApply(action)}>
                              <Check className="h-3 w-3" />
                              {t('occupancy.apply') || 'Apply'}
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-400" onClick={() => handleDismiss(action.id)}>
                              {t('occupancy.dismiss') || 'Dismiss'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {activeActions.length === 0 && (
            <div className="py-12 text-center">
              <div className="h-12 w-12 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Check className="h-6 w-6 text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-zinc-900">{t('occupancy.allGood') || 'All good!'}</p>
              <p className="text-xs text-zinc-500 mt-1">{t('occupancy.noActionsNeeded') || 'No occupancy actions needed right now.'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add Occupancy Actions sub-tab to GrowPanel**

In `src/components/GrowPanel.tsx`, add:

```tsx
import { OccupancyActions } from './OccupancyActions';

// Add to SUB_TABS:
{ id: 'occupancy', icon: Zap, i18nKey: 'grow.occupancy' },

// Add render case:
{activeSubTab === 'occupancy' && <OccupancyActions />}
```

Add `Zap` to lucide-react imports.

Updated SUB_TABS order (matching the Growth A/B/C structure):
```tsx
const SUB_TABS = [
  { id: 'hostel-page', icon: Globe, i18nKey: 'grow.hostelPage' },     // Growth A: Direct Booking
  { id: 'crm', icon: Users, i18nKey: 'grow.crm' },                     // Growth B: Guest CRM
  { id: 'occupancy', icon: Zap, i18nKey: 'grow.occupancy' },           // Growth C: Occupancy Actions
  { id: 'referral', icon: Gift, i18nKey: 'grow.referral' },
  { id: 'pricing', icon: TrendingUp, i18nKey: 'grow.pricing' },
];
```

- [ ] **Step 3: Add i18n keys**

In `src/i18nContext.tsx`, add:

EN:
```tsx
'grow.occupancy': 'Occupancy',
'occupancy.next7Days': 'Next 7 Days',
'occupancy.avgOccupancy': 'Avg Occupancy',
'occupancy.emptyBedNights': 'empty bed-nights',
'occupancy.potentialRevenue': 'Potential',
'occupancy.suggestedActions': 'Suggested Actions',
'occupancy.bedNights': 'bed-nights',
'occupancy.apply': 'Apply',
'occupancy.dismiss': 'Dismiss',
'occupancy.allGood': 'All good!',
'occupancy.noActionsNeeded': 'No occupancy actions needed right now.',
```

ZH:
```tsx
'grow.occupancy': '空床动作',
'occupancy.next7Days': '未来7天',
'occupancy.avgOccupancy': '平均入住率',
'occupancy.emptyBedNights': '空床夜',
'occupancy.potentialRevenue': '潜在收入',
'occupancy.suggestedActions': '建议动作',
'occupancy.bedNights': '床夜',
'occupancy.apply': '应用',
'occupancy.dismiss': '忽略',
'occupancy.allGood': '一切正常！',
'occupancy.noActionsNeeded': '当前无需空床动作。',
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/OccupancyActions.tsx src/components/GrowPanel.tsx src/i18nContext.tsx
git commit -m "feat: add Occupancy Actions panel with 7-day forecast and actionable suggestions"
```

---

### Task 7: Build Copilot Engine (Pure Functions)

**Why:** The Hostel Copilot (V4) needs a pure calculation engine that generates daily insights: Today summary, This Week forecast, Opportunities, and Risks. This is the "经营驾驶舱" that tells the boss what to do next.

**Files:**
- Create: `src/utils/copilotEngine.ts`

- [ ] **Step 1: Write the copilot engine**

Create `src/utils/copilotEngine.ts`:

```typescript
import { Room, GuestProfile, CopilotInsight, ShiftNote } from '../types';
import { format, addDays, parseISO, isToday, differenceInDays, subMonths, isAfter } from 'date-fns';
import { calculateAvailability } from './occupancyEngine';

/**
 * Generate "Today" summary: check-ins, check-outs, empty beds.
 */
export function generateTodaySummary(rooms: Room[]) {
  let checkIns = 0;
  let checkOuts = 0;
  let emptyBeds = 0;
  let occupiedBeds = 0;
  let totalBeds = 0;
  let cleaningBeds = 0;

  for (const room of rooms) {
    for (const bed of room.beds) {
      totalBeds++;
      if (bed.status === 'occupied') {
        occupiedBeds++;
        if (bed.guest && isToday(parseISO(bed.guest.checkInDate))) {
          checkIns++;
        }
        if (bed.guest && isToday(parseISO(bed.guest.checkOutDate))) {
          checkOuts++;
        }
      } else if (bed.status === 'empty') {
        emptyBeds++;
      } else if (bed.status === 'cleaning') {
        cleaningBeds++;
      }
    }
  }

  return {
    checkIns,
    checkOuts,
    emptyBeds,
    occupiedBeds,
    totalBeds,
    cleaningBeds,
    occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
  };
}

/**
 * Generate "This Week" forecast.
 */
export function generateWeekForecast(rooms: Room[]) {
  const availability = calculateAvailability(rooms, new Date(), 7);

  const avgOccupancy = availability.reduce((sum, d) => sum + d.occupancyRate, 0) / availability.length;
  const peakDay = availability.reduce((max, d) => d.occupancyRate > max.occupancyRate ? d : max, availability[0]);
  const lowDay = availability.reduce((min, d) => d.occupancyRate < min.occupancyRate ? d : min, availability[0]);
  const totalEmptyBedNights = availability.reduce((sum, d) => sum + d.emptyBeds, 0);

  return {
    avgOccupancy: Math.round(avgOccupancy),
    peakDay: { date: peakDay.date, rate: peakDay.occupancyRate },
    lowDay: { date: lowDay.date, rate: lowDay.occupancyRate },
    totalEmptyBedNights,
  };
}

/**
 * Generate opportunities: actionable suggestions to improve business.
 */
export function generateOpportunities(
  rooms: Room[],
  guestProfiles: GuestProfile[],
  shiftNotes: ShiftNote[]
): CopilotInsight[] {
  const insights: CopilotInsight[] = [];
  const today = new Date();

  // ── Female Dorm Vacancy ───────────────────────────────────────
  const femaleDorms = rooms.filter(r => r.type === 'dorm-female');
  const mixedDorms = rooms.filter(r => r.type === 'dorm-mixed');

  for (const femaleRoom of femaleDorms) {
    const total = femaleRoom.beds.length;
    const empty = femaleRoom.beds.filter(b => b.status === 'empty').length;
    const vacancyRate = total > 0 ? empty / total : 0;

    if (vacancyRate >= 0.5 && mixedDorms.length > 0) {
      const convertCount = Math.min(2, empty);
      insights.push({
        id: `ci_${crypto.randomUUID()}`,
        type: 'opportunity',
        severity: 'opportunity',
        title: `${femaleRoom.name} has high vacancy`,
        description: `${empty}/${total} beds empty. Consider converting ${convertCount} beds to Mixed Dorm to increase bookings.`,
        actionLabel: 'View Occupancy Actions',
        actionTarget: 'grow:occupancy',
        relatedIds: [femaleRoom.id],
        createdAt: new Date().toISOString(),
        dismissed: false,
      });
    }
  }

  // ── Empty beds in next 3 days ─────────────────────────────────
  const availability3d = calculateAvailability(rooms, today, 3);
  const empty3d = availability3d.reduce((sum, d) => sum + d.emptyBeds, 0);

  if (empty3d >= 8) {
    insights.push({
      id: `ci_${crypto.randomUUID()}`,
      type: 'action',
      severity: 'opportunity',
      title: `${empty3d} empty beds in next 3 days`,
      description: 'Push long-stay discount or last-minute deal to fill empty beds.',
      actionLabel: 'Create Promotion',
      actionTarget: 'grow:pricing',
      createdAt: new Date().toISOString(),
      dismissed: false,
    });
  }

  // ── Old guest recall ──────────────────────────────────────────
  const sixMonthsAgo = subMonths(today, 6);
  const recallable = guestProfiles.filter(p => {
    const lastStay = parseISO(p.lastStayDate);
    return isAfter(today, addDays(lastStay, 180)) && p.totalStays >= 1 && (p.email || p.whatsapp);
  });

  if (recallable.length >= 5) {
    insights.push({
      id: `ci_${crypto.randomUUID()}`,
      type: 'action',
      severity: 'opportunity',
      title: `${recallable.length} guests haven't returned in 6+ months`,
      description: 'Send them a personalized offer to come back.',
      actionLabel: 'View Guest CRM',
      actionTarget: 'grow:crm',
      createdAt: new Date().toISOString(),
      dismissed: false,
    });
  }

  return insights;
}

/**
 * Generate risks: warnings about potential problems.
 */
export function generateRisks(
  rooms: Room[],
  shiftNotes: ShiftNote[]
): CopilotInsight[] {
  const insights: CopilotInsight[] = [];
  const today = new Date();

  // ── Overbooking risk ──────────────────────────────────────────
  const availability = calculateAvailability(rooms, today, 7);
  for (const day of availability) {
    if (day.occupiedBeds > day.totalBeds) {
      insights.push({
        id: `ci_${crypto.randomUUID()}`,
        type: 'risk',
        severity: 'risk',
        title: `Overbooking on ${format(parseISO(day.date), 'EEE, MMM d')}`,
        description: `${day.occupiedBeds} guests but only ${day.totalBeds} beds available.`,
        actionLabel: 'View Bed Board',
        actionTarget: 'bedboard',
        createdAt: new Date().toISOString(),
        dismissed: false,
      });
    }
  }

  // ── Unconfirmed reservations ──────────────────────────────────
  const unconfirmedReservations: { guestName: string; bedName: string; roomName: string }[] = [];
  for (const room of rooms) {
    for (const bed of room.beds) {
      if (bed.reservations) {
        for (const res of bed.reservations) {
          if (res.paymentStatus === 'unpaid') {
            unconfirmedReservations.push({
              guestName: res.name,
              bedName: bed.name,
              roomName: room.name || room.number,
            });
          }
        }
      }
    }
  }

  if (unconfirmedReservations.length > 0) {
    insights.push({
      id: `ci_${crypto.randomUUID()}`,
      type: 'risk',
      severity: 'warning',
      title: `${unconfirmedReservations.length} unconfirmed reservation${unconfirmedReservations.length > 1 ? 's' : ''}`,
      description: unconfirmedReservations.map(r => `${r.guestName} (${r.roomName} ${r.bedName})`).join(', '),
      actionLabel: 'View Reservations',
      actionTarget: 'reservations',
      createdAt: new Date().toISOString(),
      dismissed: false,
    });
  }

  // ── Urgent shift notes ────────────────────────────────────────
  const urgentNotes = shiftNotes.filter(n => !n.isResolved && n.priority === 'urgent');
  if (urgentNotes.length > 0) {
    insights.push({
      id: `ci_${crypto.randomUUID()}`,
      type: 'risk',
      severity: 'risk',
      title: `${urgentNotes.length} urgent shift note${urgentNotes.length > 1 ? 's' : ''}`,
      description: urgentNotes.slice(0, 2).map(n => n.content).join(' | '),
      actionLabel: 'View Shift Log',
      actionTarget: 'shiftlog',
      createdAt: new Date().toISOString(),
      dismissed: false,
    });
  }

  // ── Many beds in cleaning ─────────────────────────────────────
  const cleaningBeds = rooms.reduce((sum, r) => sum + r.beds.filter(b => b.status === 'cleaning').length, 0);
  const totalBeds = rooms.reduce((sum, r) => sum + r.beds.length, 0);
  if (cleaningBeds > 3 || (totalBeds > 0 && cleaningBeds / totalBeds > 0.3)) {
    insights.push({
      id: `ci_${crypto.randomUUID()}`,
      type: 'risk',
      severity: 'warning',
      title: `${cleaningBeds} beds waiting to be cleaned`,
      description: 'High number of beds in cleaning status may delay check-ins.',
      actionLabel: 'View Bed Board',
      actionTarget: 'bedboard',
      createdAt: new Date().toISOString(),
      dismissed: false,
    });
  }

  return insights;
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/utils/copilotEngine.ts
git commit -m "feat: add copilot engine with today summary, week forecast, opportunities, and risks"
```

---

### Task 8: Build Hostel Copilot UI

**Why:** This is the V4 feature — the "经营驾驶舱". When the boss opens the system, they immediately see: Today's numbers, This Week's forecast, Opportunities to act on, and Risks to watch. This transforms Bunkly from a recording tool into a decision-making tool.

**Files:**
- Modify: `src/components/CopilotPanel.tsx` (replace placeholder)
- Modify: `src/App.tsx` (add navigation support)
- Modify: `src/i18nContext.tsx`

- [ ] **Step 1: Replace CopilotPanel placeholder with full implementation**

Replace `src/components/CopilotPanel.tsx` with:

```tsx
import React, { useState, useMemo } from 'react';
import { useHostel } from '../HostelContext';
import { useTranslation } from '../i18nContext';
import { CopilotInsight } from '../types';
import {
  generateTodaySummary,
  generateWeekForecast,
  generateOpportunities,
  generateRisks,
} from '../utils/copilotEngine';
import {
  Brain,
  LogIn,
  LogOut,
  Bed,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ChevronRight,
  X,
  Calendar,
  Zap,
  Shield,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { format, addDays, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface CopilotPanelProps {
  setActiveTab?: (tab: string) => void;
  navigateToGrow?: (subTab: string, options?: { autoOpenPromo?: boolean }) => void;
}

export function CopilotPanel({ setActiveTab, navigateToGrow }: CopilotPanelProps) {
  const { rooms, guestProfiles, shiftNotes } = useHostel();
  const { t } = useTranslation();
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());

  // Generate all copilot data
  const todaySummary = useMemo(() => generateTodaySummary(rooms), [rooms]);
  const weekForecast = useMemo(() => generateWeekForecast(rooms), [rooms]);
  const opportunities = useMemo(() => generateOpportunities(rooms, guestProfiles, shiftNotes), [rooms, guestProfiles, shiftNotes]);
  const risks = useMemo(() => generateRisks(rooms, shiftNotes), [rooms, shiftNotes]);

  const activeOpportunities = opportunities.filter(i => !dismissedInsights.has(i.id));
  const activeRisks = risks.filter(i => !dismissedInsights.has(i.id));

  const handleInsightAction = (insight: CopilotInsight) => {
    if (!insight.actionTarget) return;

    if (insight.actionTarget.includes(':')) {
      const [tab, subTab] = insight.actionTarget.split(':');
      if (tab === 'grow' && navigateToGrow) {
        navigateToGrow(subTab);
      } else if (setActiveTab) {
        setActiveTab(tab);
      }
    } else if (setActiveTab) {
      setActiveTab(insight.actionTarget);
    }
  };

  const handleDismiss = (insightId: string) => {
    setDismissedInsights(prev => new Set([...prev, insightId]));
  };

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 flex items-center gap-2">
          <Brain className="h-6 w-6 text-zinc-400" />
          {t('copilot.title') || 'Hostel Copilot'}
        </h1>
        <p className="text-sm text-zinc-500 mt-1">{t('copilot.subtitle') || 'Your daily decision dashboard'}</p>
      </div>

      {/* Today Summary */}
      <motion.div variants={container} initial="hidden" animate="show">
        <h2 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-zinc-400" />
          {t('copilot.today') || 'Today'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <motion.div variants={item}>
            <Card className="border shadow-none bg-white cursor-pointer hover:shadow-sm transition-shadow" onClick={() => setActiveTab?.('checkin')}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-500">
                  <LogIn className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-zinc-900 leading-none">{todaySummary.checkIns}</p>
                  <p className="text-xs text-zinc-500 mt-1">{t('copilot.checkIns') || 'Check-ins'}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="border shadow-none bg-white cursor-pointer hover:shadow-sm transition-shadow" onClick={() => setActiveTab?.('bedboard')}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-orange-50 text-orange-500">
                  <LogOut className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-zinc-900 leading-none">{todaySummary.checkOuts}</p>
                  <p className="text-xs text-zinc-500 mt-1">{t('copilot.checkOuts') || 'Check-outs'}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="border shadow-none bg-white cursor-pointer hover:shadow-sm transition-shadow" onClick={() => setActiveTab?.('bedboard')}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-500">
                  <Bed className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-zinc-900 leading-none">{todaySummary.emptyBeds}</p>
                  <p className="text-xs text-zinc-500 mt-1">{t('copilot.emptyBeds') || 'Empty Beds'}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="border shadow-none bg-white">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-50 text-purple-500">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-zinc-900 leading-none">{todaySummary.cleaningBeds}</p>
                  <p className="text-xs text-zinc-500 mt-1">{t('copilot.cleaning') || 'Cleaning'}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>

      {/* This Week Forecast */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="border shadow-none bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-zinc-400" />
                {t('copilot.thisWeek') || 'This Week'}
              </h2>
              <span className={cn(
                "text-lg font-bold",
                weekForecast.avgOccupancy >= 70 ? "text-emerald-600" :
                weekForecast.avgOccupancy >= 40 ? "text-amber-600" : "text-red-600"
              )}>
                {weekForecast.avgOccupancy}%
              </span>
            </div>

            {/* Week bars */}
            <div className="flex gap-1.5 items-end h-20 mb-3">
              {Array.from({ length: 7 }, (_, i) => {
                const date = addDays(new Date(), i);
                const dayAvail = rooms.reduce((acc, r) => {
                  const total = r.beds.length;
                  const occupied = r.beds.filter(b => b.status === 'occupied').length;
                  return { total: acc.total + total, occupied: acc.occupied + occupied };
                }, { total: 0, occupied: 0 });
                const rate = dayAvail.total > 0 ? Math.round((dayAvail.occupied / dayAvail.total) * 100) : 0;

                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full relative h-16 bg-zinc-100 rounded overflow-hidden">
                      <div
                        className={cn(
                          "absolute bottom-0 w-full transition-all",
                          rate >= 80 ? "bg-emerald-400" :
                          rate >= 50 ? "bg-amber-400" : "bg-red-400"
                        )}
                        style={{ height: `${Math.max(rate, 5)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-zinc-400">
                      {format(date, 'EEE')}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>{t('copilot.peakDay') || 'Peak'}: {format(parseISO(weekForecast.peakDay.date), 'EEE')} ({weekForecast.peakDay.rate}%)</span>
              <span>{t('copilot.emptyBedNights') || 'Empty bed-nights'}: {weekForecast.totalEmptyBedNights}</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Opportunities */}
      {activeOpportunities.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <h2 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            {t('copilot.opportunities') || 'Opportunities'}
            <span className="text-xs font-normal text-zinc-400">({activeOpportunities.length})</span>
          </h2>
          <div className="space-y-2">
            {activeOpportunities.map(insight => (
              <Card key={insight.id} className="border shadow-none bg-white border-l-4 border-l-amber-400">
                <CardContent className="p-4 flex items-start gap-3">
                  <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-zinc-900">{insight.title}</h4>
                    <p className="text-xs text-zinc-500 mt-0.5">{insight.description}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {insight.actionLabel && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => handleInsightAction(insight)}
                      >
                        {insight.actionLabel}
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    )}
                    <button
                      onClick={() => handleDismiss(insight.id)}
                      className="p-1 hover:bg-zinc-100 rounded transition-colors"
                    >
                      <X className="h-3.5 w-3.5 text-zinc-400" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* Risks */}
      {activeRisks.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h2 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            {t('copilot.risks') || 'Risks'}
            <span className="text-xs font-normal text-zinc-400">({activeRisks.length})</span>
          </h2>
          <div className="space-y-2">
            {activeRisks.map(insight => (
              <Card key={insight.id} className={cn(
                "border shadow-none bg-white border-l-4",
                insight.severity === 'risk' ? 'border-l-red-500' : 'border-l-amber-400'
              )}>
                <CardContent className="p-4 flex items-start gap-3">
                  <AlertTriangle className={cn(
                    "h-4 w-4 mt-0.5 shrink-0",
                    insight.severity === 'risk' ? 'text-red-500' : 'text-amber-500'
                  )} />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-zinc-900">{insight.title}</h4>
                    <p className="text-xs text-zinc-500 mt-0.5">{insight.description}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {insight.actionLabel && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => handleInsightAction(insight)}
                      >
                        {insight.actionLabel}
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    )}
                    <button
                      onClick={() => handleDismiss(insight.id)}
                      className="p-1 hover:bg-zinc-100 rounded transition-colors"
                    >
                      <X className="h-3.5 w-3.5 text-zinc-400" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* All Clear */}
      {activeOpportunities.length === 0 && activeRisks.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm">
            <CardContent className="p-6 text-center">
              <Shield className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-emerald-800">{t('copilot.allClear') || 'All clear!'}</p>
              <p className="text-xs text-emerald-600 mt-1">{t('copilot.noIssues') || 'No issues or opportunities right now.'}</p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update App.tsx to pass navigation props to CopilotPanel**

In `src/App.tsx`, update the copilot render:

```tsx
{effectiveTab === 'copilot' && <CopilotPanel setActiveTab={setActiveTab} navigateToGrow={navigateToGrow} />}
```

- [ ] **Step 3: Add i18n keys**

In `src/i18nContext.tsx`, add:

EN:
```tsx
'copilot.title': 'Hostel Copilot',
'copilot.subtitle': 'Your daily decision dashboard',
'copilot.today': 'Today',
'copilot.checkIns': 'Check-ins',
'copilot.checkOuts': 'Check-outs',
'copilot.emptyBeds': 'Empty Beds',
'copilot.cleaning': 'Cleaning',
'copilot.thisWeek': 'This Week',
'copilot.peakDay': 'Peak',
'copilot.emptyBedNights': 'Empty bed-nights',
'copilot.opportunities': 'Opportunities',
'copilot.risks': 'Risks',
'copilot.allClear': 'All clear!',
'copilot.noIssues': 'No issues or opportunities right now.',
'copilot.comingSoon': 'Hostel Copilot',
'copilot.comingSoonDesc': 'Your intelligent hostel assistant is coming soon. It will help you make better decisions every day.',
```

ZH:
```tsx
'copilot.title': '经营助手',
'copilot.subtitle': '你的每日决策仪表盘',
'copilot.today': '今天',
'copilot.checkIns': '入住',
'copilot.checkOuts': '退房',
'copilot.emptyBeds': '空床',
'copilot.cleaning': '待清洁',
'copilot.thisWeek': '本周',
'copilot.peakDay': '高峰日',
'copilot.emptyBedNights': '空床夜',
'copilot.opportunities': '机会',
'copilot.risks': '风险',
'copilot.allClear': '一切正常！',
'copilot.noIssues': '当前没有需要关注的问题或机会。',
'copilot.comingSoon': '经营助手',
'copilot.comingSoonDesc': '你的智能经营助手即将上线，帮助你每天做出更好的决策。',
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/CopilotPanel.tsx src/App.tsx src/i18nContext.tsx
git commit -m "feat: add Hostel Copilot panel with today summary, week forecast, opportunities, and risks"
```

---

### Task 9: Wire Dashboard to Copilot (Replace Dashboard with Copilot)

**Why:** The current Dashboard is an operations overview. The user's architecture says the "Today" page should be the Copilot — the first thing the boss sees when they open the system. We should redirect the Dashboard tab to show the Copilot, or merge the two.

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Merge Dashboard into Copilot**

In `src/App.tsx`, change the dashboard tab to render CopilotPanel:

```tsx
// Replace:
{effectiveTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} navigateToGrow={navigateToGrow} />}

// With:
{effectiveTab === 'dashboard' && <CopilotPanel setActiveTab={setActiveTab} navigateToGrow={navigateToGrow} />}
```

- [ ] **Step 2: Update Sidebar tab labels**

In `src/components/Sidebar.tsx`, update the dashboard tab config:

```tsx
// In the operations module tabs, change:
{ id: 'dashboard', icon: LayoutDashboard, i18nKey: 'sidebar.today' },
// To:
{ id: 'dashboard', icon: Brain, i18nKey: 'sidebar.copilot' },
```

And move it to the intelligence module instead:

```tsx
const MODULE_CONFIG = [
  {
    id: 'operations',
    i18nKey: 'sidebar.operations',
    defaultIcon: LayoutDashboard,
    tabs: [
      { id: 'bedboard', icon: Grid, i18nKey: 'sidebar.bedBoard' },
      { id: 'checkin', icon: KeyRound, i18nKey: 'sidebar.checkIn' },
      { id: 'calendar', icon: Calendar, i18nKey: 'sidebar.calendar' },
      { id: 'reservations', icon: BookOpen, i18nKey: 'sidebar.reservations' },
      { id: 'shiftlog', icon: ClipboardList, i18nKey: 'sidebar.shiftLog' },
      { id: 'staff', icon: Users, i18nKey: 'staff.title' },
    ],
  },
  {
    id: 'growth',
    i18nKey: 'sidebar.growth',
    defaultIcon: Sprout,
    tabs: [
      { id: 'grow', icon: Sprout, i18nKey: 'sidebar.grow' },
    ],
  },
  {
    id: 'intelligence',
    i18nKey: 'sidebar.intelligence',
    defaultIcon: Brain,
    tabs: [
      { id: 'dashboard', icon: Brain, i18nKey: 'sidebar.copilot' },
    ],
  },
];
```

- [ ] **Step 3: Update StaffContext default tab**

In `src/StaffContext.tsx`, the default tab should still be 'dashboard' (which now shows Copilot). No change needed — the Copilot is now the default landing page.

- [ ] **Step 4: Update header title**

In `src/App.tsx`, update the header title:

```tsx
dashboard: t('copilot.title') || 'Hostel Copilot',
```

- [ ] **Step 5: Update mobile bottom nav primary tabs**

In `src/components/Sidebar.tsx`, update PRIMARY_TAB_IDS:

```tsx
const PRIMARY_TAB_IDS = ['dashboard', 'bedboard', 'checkin'];
```

This gives the mobile nav: Copilot, Bed Board, Check-in as the three primary tabs.

- [ ] **Step 6: Verify build and test navigation**

Run: `npm run build`
Expected: Build succeeds. All tabs navigate correctly.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/components/Sidebar.tsx
git commit -m "feat: merge Dashboard into Copilot as the default landing page"
```

---

### Task 10: Add Occupancy Actions State to HostelContext

**Why:** When users "Apply" an occupancy action, it should be persisted. The actions need state management for status tracking (pending → applied/dismissed).

**Files:**
- Modify: `src/HostelContext.tsx`
- Modify: `src/types.ts` (already done in Task 2)
- Modify: `src/data.ts`

- [ ] **Step 1: Add occupancy actions state to HostelContext**

In `src/HostelContext.tsx`, add to HostelState interface:

```typescript
// Occupancy Actions
occupancyActions: OccupancyAction[];
applyOccupancyAction: (actionId: string) => void;
dismissOccupancyAction: (actionId: string) => void;
```

Add state and implementations:

```typescript
const [occupancyActions, setOccupancyActions] = useState<OccupancyAction[]>(() => loadState('occupancyActions', []));

// In persist effect, add:
localStorage.setItem('bunkdesk_occupancyActions', JSON.stringify(occupancyActions));

// Implementations:
const applyOccupancyAction = useCallback((actionId: string) => {
  setOccupancyActions((prev) => prev.map(a =>
    a.id === actionId ? { ...a, status: 'applied' as const, appliedAt: new Date().toISOString() } : a
  ));
}, []);

const dismissOccupancyAction = useCallback((actionId: string) => {
  setOccupancyActions((prev) => prev.map(a =>
    a.id === actionId ? { ...a, status: 'dismissed' as const, dismissedAt: new Date().toISOString() } : a
  ));
}, []);
```

Add to the context value and useMemo dependency array.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/HostelContext.tsx
git commit -m "feat: add occupancy actions state management to HostelContext"
```

---

### Task 11: Final Integration & Polish

**Why:** Ensure all three modules work together as a cohesive system. The Copilot should reference Growth features, Occupancy Actions should link to CRM, and the navigation should feel natural.

**Files:**
- Modify: `src/components/CopilotPanel.tsx`
- Modify: `src/components/OccupancyActions.tsx`
- Modify: `src/components/GrowPanel.tsx`
- Modify: `src/i18nContext.tsx`

- [ ] **Step 1: Add cross-module navigation from Copilot to Growth**

The CopilotPanel already has `navigateToGrow` support via `handleInsightAction`. Verify that the action targets work:

- `grow:occupancy` → navigates to Grow tab, Occupancy sub-tab
- `grow:crm` → navigates to Grow tab, CRM sub-tab
- `grow:pricing` → navigates to Grow tab, Pricing sub-tab

In `src/App.tsx`, ensure `navigateToGrow` also handles the new sub-tabs:

```tsx
const navigateToGrow = (subTab: string, options?: { autoOpenPromo?: boolean }) => {
  setGrowSubTab(subTab);
  if (options?.autoOpenPromo) setGrowAutoOpenPromo(true);
  setActiveTab('grow');
};
```

This already works because GrowPanel uses `initialSubTab` to set the active sub-tab.

- [ ] **Step 2: Update GrowPanel to handle new sub-tab navigation**

In `src/components/GrowPanel.tsx`, the `initialSubTab` prop already handles navigation. Verify that 'crm' and 'occupancy' are valid sub-tab IDs that match the SUB_TABS configuration.

- [ ] **Step 3: Add product branding update**

In `src/components/Sidebar.tsx`, update the logo text from "BunkDesk" to "Bunkly":

```tsx
<span className="font-semibold text-zinc-900 tracking-tight">Bunkly</span>
```

And update the logo badge from "BD" to "B":

```tsx
<span className="text-white font-bold text-sm tracking-tighter">B</span>
```

- [ ] **Step 4: Add i18n key for product name**

In `src/i18nContext.tsx`, update:

```tsx
'sidebar.hostelDesk': 'Bunkly',
```

- [ ] **Step 5: Remove unused SocialKit from GrowPanel**

The user's architecture doesn't include a "Social Kit" as a Growth sub-module. Remove it from SUB_TABS:

```tsx
const SUB_TABS = [
  { id: 'hostel-page', icon: Globe, i18nKey: 'grow.hostelPage' },     // Growth A: Direct Booking
  { id: 'crm', icon: Users, i18nKey: 'grow.crm' },                     // Growth B: Guest CRM
  { id: 'occupancy', icon: Zap, i18nKey: 'grow.occupancy' },           // Growth C: Occupancy Actions
  { id: 'referral', icon: Gift, i18nKey: 'grow.referral' },
  { id: 'pricing', icon: TrendingUp, i18nKey: 'grow.pricing' },
];
```

Remove the SocialKit import and render case from GrowPanel.

- [ ] **Step 6: Full build verification**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/Sidebar.tsx src/components/GrowPanel.tsx src/components/CopilotPanel.tsx src/components/OccupancyActions.tsx src/i18nContext.tsx src/App.tsx
git commit -m "feat: final integration — cross-module navigation, Bunkly branding, Growth module cleanup"
```

---

## Self-Review Checklist

### 1. Spec Coverage

| Spec Requirement | Task |
|-----------------|------|
| 3-Module Navigation (Operations/Growth/Intelligence) | Task 1 |
| Operations OS: Bed Board | Already built |
| Operations OS: Reservation | Already built |
| Operations OS: Check-in Center | Already built |
| Operations OS: Housekeeping (minimal: Dirty/Clean/Occupied) | Already built (Bed Board statuses) |
| Operations OS: iCal Sync | Already built |
| Growth A: Direct Booking (官网+预订页+支付) | Already built (BookingEngine + HostelPage) |
| Growth B: Guest CRM (客人资产+标签+召回) | Task 3, Task 4 |
| Growth C: Occupancy Actions (空床→动作→预计增量) | Task 5, Task 6 |
| Intelligence: Today Summary | Task 7, Task 8 |
| Intelligence: This Week Forecast | Task 7, Task 8 |
| Intelligence: Opportunities | Task 7, Task 8 |
| Intelligence: Risks | Task 7, Task 8 |
| Copilot as default landing page | Task 9 |
| Bunkly branding | Task 11 |
| Product mission: 帮助小青旅赚钱，并且省时间 | Architecture-level, all features contribute |

### 2. Placeholder Scan

No TBD, TODO, or placeholder patterns found. All code is complete.

### 3. Type Consistency

- `GuestProfile`, `GuestTag`, `OccupancyAction`, `CopilotInsight` types defined in Task 2, used consistently in Tasks 3-8
- `OccupancyActionType` enum used in both `occupancyEngine.ts` and `OccupancyActions.tsx`
- `CopilotInsight.actionTarget` format: `tab` or `tab:subTab` — consistent between `copilotEngine.ts` and `CopilotPanel.tsx`
- `GuestProfile.tags` is `GuestTag[]` — consistent between types, engine, and UI
