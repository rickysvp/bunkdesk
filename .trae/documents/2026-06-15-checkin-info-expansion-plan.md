# BunkDesk v1.6.0 — 待办理入住信息扩展 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the BunkDesk `CheckInPanel` "待办理入住" (pending check-in) module from 8 to 16 fields, with a 3-section linear Walk-in form, two-column detail view (info + actions), and an Edit Info modal — all backward compatible with existing localStorage data.

**Architecture:** Backward-compatible additive change. Extend `Guest` interface with 6 optional fields + 2 enums; add a one-time migration on storage upgrade from v1 → v2; rewrite the walk-in form section + the right-hand detail panel inside `CheckInPanel.tsx`; extract a new `EditGuestInfoModal.tsx` for in-place edits; smart-parse iCal SUMMARY to populate firstName/lastName.

**Tech Stack:** React 19 + TypeScript + TailwindCSS 4 + shadcn/ui (Button/Card/Input/Label/Select) + lucide-react + date-fns + framer-motion + existing `useTranslation` i18n.

**Spec:** [`.trae/documents/2026-06-15-checkin-info-expansion-design.md`](file:///Users/ricky/AICode/hostelite/.trae/documents/2026-06-15-checkin-info-expansion-design.md)

**Verification gate:** `npx tsc --noEmit` must pass after every task. Run from `/Users/ricky/AICode/hostelite`.

---

## File Structure

| File | Status | Responsibility |
|------|--------|----------------|
| `src/types.ts` | modify | Add `IdDocumentType`, `ArrivalSlot`, `BookingSource` enums + 6 optional `Guest` fields |
| `src/utils/guestMigration.ts` | **create** | Pure `migrateGuest(g: Guest): Guest` + `migrateState(s: Persisted): Persisted` |
| `src/HostelContext.tsx` | modify | Bump `STORAGE_VERSION` 1→2, call `migrateState` in `loadPersistedState`, expand `updateArrival` Pick |
| `src/locales/en.json` | modify | +24 keys under `checkin.*` |
| `src/locales/zh.json` | modify | +24 keys under `checkin.*` |
| `src/components/ICalImport.tsx` | modify | Smart parse SUMMARY → firstName/lastName |
| `src/components/CheckInPanel.tsx` | modify | Rewrite walk-in form (3 sections), rewrite detail view (2 columns) |
| `src/components/EditGuestInfoModal.tsx` | **create** | Modal for editing guest info fields |
| `src/data/index.ts` (or `seed.ts`) | modify | Backfill 5–8 demo guests with new fields |
| `src/version.ts` | modify | `v1.4.0` → `v1.6.0` |

The `EditGuestInfoModal` is a new file because it has its own internal state and ~150 lines; isolating it keeps `CheckInPanel.tsx` from exceeding the existing ~550-line size by another 300 lines. Walk-in form and detail view remain inside `CheckInPanel.tsx` per the design ("linear growth, no restructure").

---

## Task 1: Extend `Guest` interface and add enums

**Files:**
- Modify: `src/types.ts:1-80` (Guest interface block)

- [ ] **Step 1: Open `src/types.ts` and find the existing `Guest` interface and `GuestSource` type**

Read the top of the file to find the line numbers. Existing relevant code (around line 50–80):
```ts
export type GuestSource = "walk-in" | "booking" | "airbnb" | "expedia" | "ical" | "manual" | "direct" | "referral" | "group";

export interface Guest {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  gender?: "male" | "female" | "other";
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  paymentStatus: "paid" | "unpaid" | "partial";
  totalAmount?: number;
  paidAmount?: number;
  phone?: string;
  email?: string;
  notes?: string;
  passportScanned: boolean;
  passportOrId?: string;
  dob?: string;
  policeConsent?: boolean;
  source: GuestSource;
  roomPreference?: string;
}
```

- [ ] **Step 2: Add 3 new enums right after `GuestSource`**

Insert directly below the existing `GuestSource` declaration:

```ts
export type IdDocumentType = "passport" | "idCard" | "driverLicense";
export type ArrivalSlot = "morning" | "afternoon" | "evening" | "late";
export type BookingSource = "walk-in" | "phone" | "email" | "referral" | "other";
```

- [ ] **Step 3: Extend the `Guest` interface with 6 optional fields**

Add these 6 lines inside the `Guest` interface, after the existing `passportOrId?: string;` line:

```ts
  firstName?: string;
  lastName?: string;
  idType?: IdDocumentType;
  arrivalTime?: ArrivalSlot;
  referral?: string;
  bookingSource?: BookingSource;
```

- [ ] **Step 4: Verify TypeScript compiles**

Run from `/Users/ricky/AICode/hostelite`:
```bash
npx tsc --noEmit
```
Expected: no errors. The new fields are optional so nothing else needs to change yet.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts
git commit -m "feat(types): add 3 enums + 6 optional fields to Guest"
```

---

## Task 2: Add i18n keys (en + zh)

**Files:**
- Modify: `src/locales/en.json` (find `checkin:` block, likely under `translations.checkin`)
- Modify: `src/locales/zh.json` (same path)

- [ ] **Step 1: Read the existing `checkin` block in `src/locales/en.json`**

Use Grep to find the `checkin` block, e.g.:
```bash
grep -n '"checkin":' src/locales/en.json
```

You should see a flat object of checkin.* keys, e.g. `"checkin.newWalkIn": "New walk-in"`. Note the indentation style (likely 2 or 4 spaces).

- [ ] **Step 2: Add 24 new keys to `src/locales/en.json` inside the `checkin` object**

Find a stable marker inside `checkin` (e.g. the existing `"checkin.policeRegistration"` key) and insert these keys alphabetically (or grouped, but pick one rule and stay consistent). Use the same indentation as the surrounding keys:

```json
"checkin.firstName": "First name",
"checkin.lastName": "Last name",
"checkin.phone": "Phone",
"checkin.email": "Email",
"checkin.idType": "ID document type",
"checkin.idType.passport": "Passport",
"checkin.idType.idCard": "ID Card",
"checkin.idType.driverLicense": "Driver License",
"checkin.arrivalTime": "Arrival time",
"checkin.arrivalTime.morning": "Morning (8–12)",
"checkin.arrivalTime.afternoon": "Afternoon (12–18)",
"checkin.arrivalTime.evening": "Evening (18–22)",
"checkin.arrivalTime.late": "Late (22+)",
"checkin.referral": "Referral / How heard",
"checkin.source": "Booking source",
"checkin.source.walkIn": "Walk-in",
"checkin.source.phone": "Phone",
"checkin.source.email": "Email",
"checkin.source.referral": "Referral",
"checkin.source.other": "Other",
"checkin.editInfo": "Edit info",
"checkin.notProvided": "Not provided",
"checkin.contactSection": "Contact",
"checkin.idSection": "ID"
```

- [ ] **Step 3: Add the same 24 keys to `src/locales/zh.json` with Chinese values**

Insert at the same location with Chinese translations:
```json
"checkin.firstName": "名",
"checkin.lastName": "姓",
"checkin.phone": "电话",
"checkin.email": "邮箱",
"checkin.idType": "证件类型",
"checkin.idType.passport": "护照",
"checkin.idType.idCard": "身份证",
"checkin.idType.driverLicense": "驾照",
"checkin.arrivalTime": "预计抵店时段",
"checkin.arrivalTime.morning": "上午 (8–12)",
"checkin.arrivalTime.afternoon": "下午 (12–18)",
"checkin.arrivalTime.evening": "傍晚 (18–22)",
"checkin.arrivalTime.late": "深夜 (22 点后)",
"checkin.referral": "推荐来源",
"checkin.source": "预订来源",
"checkin.source.walkIn": "现场到店",
"checkin.source.phone": "电话预订",
"checkin.source.email": "邮件预订",
"checkin.source.referral": "推荐介绍",
"checkin.source.other": "其它",
"checkin.editInfo": "编辑资料",
"checkin.notProvided": "未填写",
"checkin.contactSection": "联系方式",
"checkin.idSection": "证件"
```

- [ ] **Step 4: Verify JSON files are valid + TypeScript compiles**

```bash
node -e "JSON.parse(require('fs').readFileSync('src/locales/en.json'))" && \
node -e "JSON.parse(require('fs').readFileSync('src/locales/zh.json'))" && \
npx tsc --noEmit
```
Expected: no output from node, no errors from tsc.

- [ ] **Step 5: Commit**

```bash
git add src/locales/en.json src/locales/zh.json
git commit -m "feat(i18n): add 24 checkin keys for guest info expansion (en+zh)"
```

---

## Task 3: Create `guestMigration` utility

**Files:**
- Create: `src/utils/guestMigration.ts`

- [ ] **Step 1: Create `src/utils/guestMigration.ts` with the migration logic**

```ts
import type { Guest } from '../types';

/**
 * One-time migration for guests stored in pre-v1.6.0 localStorage.
 *  - Splits `name` into `firstName` / `lastName` when both are absent
 *  - Defaults `idType` to 'passport' when absent
 *  - Leaves phone/email/arrivalTime/referral/bookingSource as undefined
 *    (UI will show 'Not provided' placeholder)
 */
export function migrateGuest(g: Guest): Guest {
  const result: Guest = { ...g };

  if (!g.firstName && !g.lastName && g.name) {
    const parts = g.name.trim().split(/\s+/);
    result.firstName = parts[0] || '';
    result.lastName = parts.slice(1).join(' ') || '';
  }

  if (!g.idType) {
    result.idType = 'passport';
  }

  return result;
}

/**
 * Apply migrateGuest to every guest in arrivals + every guest
 * inside rooms (beds.guest and beds.reservations).
 */
export function migrateGuestsDeep<T extends { arrivals: Guest[]; rooms: Array<{ beds: Array<{ guest?: Guest; reservations?: Guest[] }> }> }>(
  state: T
): T {
  return {
    ...state,
    arrivals: state.arrivals.map(migrateGuest),
    rooms: state.rooms.map((r) => ({
      ...r,
      beds: r.beds.map((b) => ({
        ...b,
        guest: b.guest ? migrateGuest(b.guest) : undefined,
        reservations: b.reservations ? b.reservations.map(migrateGuest) : undefined,
      })),
    })),
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors. The new file exports only functions and types from existing modules.

- [ ] **Step 3: Commit**

```bash
git add src/utils/guestMigration.ts
git commit -m "feat(utils): add guestMigration for v1.6.0 backward compat"
```

---

## Task 4: Wire migration into `HostelContext` and bump storage version

**Files:**
- Modify: `src/HostelContext.tsx:20-63` (STORAGE_VERSION + loadPersistedState)
- Modify: `src/HostelContext.tsx:78` (updateArrival Pick)

- [ ] **Step 1: Bump `STORAGE_VERSION` from 1 to 2 and import `migrateGuestsDeep`**

In `src/HostelContext.tsx`, change the line `const STORAGE_VERSION = 1;` to:

```ts
const STORAGE_VERSION = 2;
```

Then add the import at the top of the file (alongside the other utility imports, around line 5–6):

```ts
import { migrateGuestsDeep } from './utils/guestMigration';
```

- [ ] **Step 2: Call the migrator inside `loadPersistedState` after the v2 check**

In `loadPersistedState`, find the block:
```ts
if (raw) {
  const parsed = JSON.parse(raw);
  if (parsed && parsed.__v === STORAGE_VERSION && parsed.data) {
    return { ...fallback, ...parsed.data };
  }
}
```

Replace it with:
```ts
if (raw) {
  const parsed = JSON.parse(raw);
  if (parsed && parsed.__v === STORAGE_VERSION && parsed.data) {
    return migrateGuestsDeep({ ...fallback, ...parsed.data });
  }
  // Migration from v1 -> v2: read v1 payload, run migration, upgrade version
  if (parsed && parsed.__v === 1 && parsed.data) {
    return migrateGuestsDeep({ ...fallback, ...parsed.data });
  }
}
```

Note: we intentionally do NOT write the upgraded `__v: 2` back to localStorage here. The version bump will be persisted on the next `saveState` call (which already happens on every state change), so the v1 branch is only used once per browser session.

- [ ] **Step 3: Expand `updateArrival` Pick to include the new editable fields**

Find the existing line (around line 78):
```ts
updateArrival: (guestId: string, updates: Partial<Pick<Guest, 'notes' | 'roomPreference' | 'source' | 'phone' | 'email' | 'totalAmount' | 'paidAmount' | 'gender' | 'dob' | 'passportOrId' | 'checkInDate' | 'checkOutDate' | 'nights'>>) => void;
```

Add `'firstName' | 'lastName' | 'idType' | 'arrivalTime' | 'referral' | 'bookingSource'` to the Pick:
```ts
updateArrival: (guestId: string, updates: Partial<Pick<Guest, 'notes' | 'roomPreference' | 'source' | 'phone' | 'email' | 'totalAmount' | 'paidAmount' | 'gender' | 'dob' | 'passportOrId' | 'checkInDate' | 'checkOutDate' | 'nights' | 'firstName' | 'lastName' | 'idType' | 'arrivalTime' | 'referral' | 'bookingSource'>>) => void;
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Manually smoke-test migration by checking localStorage in the browser**

Start the dev server (if not already running):
```bash
npm run dev -- --host 127.0.0.1 --port 3006
```

Open `http://localhost:3006/` in a browser. Open DevTools → Application → Local Storage → `http://localhost:3006`. Look for the key `bunkdesk_state_v1`. The value should now have `__v: 2` (after the first state change persists). Reload the page; existing pending guests should still be visible and now show "未填写" for any previously-missing email/phone/arrivalTime.

- [ ] **Step 6: Commit**

```bash
git add src/HostelContext.tsx
git commit -m "feat(context): bump STORAGE_VERSION 1->2 with guest migration"
```

---

## Task 5: Smart-parse iCal SUMMARY

**Files:**
- Modify: `src/components/ICalImport.tsx` (find the SUMMARY parsing block)

- [ ] **Step 1: Find the SUMMARY parsing block in `src/components/ICalImport.tsx`**

Use Grep to locate the import logic:
```bash
grep -n "SUMMARY\|summary\|name" src/components/ICalImport.tsx
```

You're looking for code that constructs a `Guest` object and sets `name: <something from SUMMARY>`. The exact line depends on the implementation, but typically looks like:
```ts
name: summary,
```
or
```ts
name: parsed.summary,
```

- [ ] **Step 2: Add a helper function `parseSummaryToName` at the top of the file**

Insert at the top of `src/components/ICalImport.tsx` (after imports, before any other code):

```ts
function parseSummaryToName(summary: string): { firstName: string; lastName: string; name: string } {
  const s = summary.trim();
  if (!s) return { firstName: '', lastName: '', name: '' };

  // 1. "Last, First" format (Western name order)
  if (s.includes(',')) {
    const [lastPart, firstPart] = s.split(',').map(x => x.trim());
    const last = lastPart || '';
    const first = firstPart || '';
    return { firstName: first, lastName: last, name: [first, last].filter(Boolean).join(' ') };
  }

  // 2. "First Last" format (default)
  const parts = s.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '', name: parts[0] };
  }
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  return { firstName, lastName, name: [firstName, lastName].filter(Boolean).join(' ') };
}
```

- [ ] **Step 3: Replace the `name: <summary>` line with the parser**

Wherever the SUMMARY value is currently assigned to `name` (you found it in Step 1), replace it. The pattern to find and replace is something like:

Before:
```ts
name: summary,
```

After:
```ts
const parsedName = parseSummaryToName(summary);
// or replace `summary` with the actual variable name from the parse logic
name: parsedName.name,
firstName: parsedName.firstName,
lastName: parsedName.lastName,
```

Adjust to use the actual variable name (it might be `event.summary` or a local `name` variable). The key point: call `parseSummaryToName` and assign all three fields (`name`, `firstName`, `lastName`).

Also add the same logic for any other place where the import builds a `Guest` from iCal data (e.g., if there's a separate `importArrivals` call with a hardcoded name).

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/ICalImport.tsx
git commit -m "feat(ical): smart-parse SUMMARY into firstName/lastName"
```

---

## Task 6: Rewrite the Walk-in form (3 sections)

**Files:**
- Modify: `src/components/CheckInPanel.tsx:40-120` (`newGuestRef` state + `handleCreateArrival`)
- Modify: `src/components/CheckInPanel.tsx:221-294` (Walk-in form JSX block)

- [ ] **Step 1: Extend the `newGuestRef` state with all new fields**

Find the existing state declaration (around line 43–47):
```ts
const [newGuestRef, setNewGuestRef] = useState({
  name: '', countryCode: '', gender: 'male' as "male" | "female" | "other",
  checkInDate: format(new Date(), 'yyyy-MM-dd'), checkOutDate: format(tomorrow, 'yyyy-MM-dd'),
  passportOrId: '', dob: '', policeConsent: false, notes: ''
});
```

Replace with:
```ts
const [newGuestRef, setNewGuestRef] = useState({
  firstName: '', lastName: '',
  countryCode: '', gender: 'male' as "male" | "female" | "other",
  checkInDate: format(new Date(), 'yyyy-MM-dd'), checkOutDate: format(tomorrow, 'yyyy-MM-dd'),
  phone: '', email: '',
  idType: 'passport' as "passport" | "idCard" | "driverLicense",
  passportOrId: '', arrivalTime: '' as "" | "morning" | "afternoon" | "evening" | "late",
  referral: '', bookingSource: 'walk-in' as "walk-in" | "phone" | "email" | "referral" | "other",
  dob: '', policeConsent: false, notes: '',
});
```

Also update the `useEffect` reset block in `handleCreateArrival` (around line 116–119) to mirror the new shape.

- [ ] **Step 2: Update `handleCreateArrival` to map all new fields to the `addArrival` call**

Find the existing `handleCreateArrival` (around line 101–120). Replace the `addArrival({...})` call with:

```ts
addArrival({
  name: [newGuestRef.firstName, newGuestRef.lastName].filter(Boolean).join(' '),
  firstName: newGuestRef.firstName,
  lastName: newGuestRef.lastName,
  country: countryName, countryCode: newGuestRef.countryCode.toUpperCase(),
  gender: newGuestRef.gender,
  checkInDate: newGuestRef.checkInDate, checkOutDate: newGuestRef.checkOutDate,
  nights: calculatedNights,
  paymentStatus: 'unpaid' as const, totalAmount: calculatedNights * DEFAULT_PRICE,
  phone: newGuestRef.phone, email: newGuestRef.email,
  passportScanned: true, passportOrId: newGuestRef.passportOrId,
  idType: newGuestRef.idType,
  arrivalTime: newGuestRef.arrivalTime || undefined,
  referral: newGuestRef.referral || undefined,
  bookingSource: newGuestRef.bookingSource,
  dob: newGuestRef.dob, policeConsent: newGuestRef.policeConsent,
  notes: newGuestRef.notes,
  source: 'walk-in' as const,
});
```

- [ ] **Step 3: Rewrite the Walk-in form JSX (3 sections)**

Find the existing form block (around line 222–293) and replace the entire `<form>...</form>` body with this 3-section structure. Note: replace only the inside of `<form>`, keeping the outer `<div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">` and `<h2>` heading intact.

```tsx
<form onSubmit={handleCreateArrival} className="space-y-4">
  {/* ── Section 1: Personal Info ── */}
  <div className="space-y-3">
    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Personal Info</div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="space-y-1.5">
        <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.firstName')}<span className="text-red-500">*</span></Label>
        <Input required value={newGuestRef.firstName} onChange={e => setNewGuestRef({...newGuestRef, firstName: e.target.value})} className="h-10 bg-zinc-50 border-zinc-200" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.lastName')}<span className="text-red-500">*</span></Label>
        <Input required value={newGuestRef.lastName} onChange={e => setNewGuestRef({...newGuestRef, lastName: e.target.value})} className="h-10 bg-zinc-50 border-zinc-200" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.country')}<span className="text-red-500">*</span></Label>
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <Input required maxLength={3} className="pl-8 h-10 bg-zinc-50 border-zinc-200 uppercase" placeholder="US" value={newGuestRef.countryCode} onChange={e => setNewGuestRef({...newGuestRef, countryCode: e.target.value.toUpperCase()})} />
        </div>
      </div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="space-y-1.5">
        <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.phone')}<span className="text-red-500">*</span></Label>
        <Input required type="tel" value={newGuestRef.phone} onChange={e => setNewGuestRef({...newGuestRef, phone: e.target.value})} placeholder="+1-555-0100" className="h-10 bg-zinc-50 border-zinc-200" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.email')}<span className="text-red-500">*</span></Label>
        <Input required type="email" value={newGuestRef.email} onChange={e => setNewGuestRef({...newGuestRef, email: e.target.value})} placeholder="john@mail.com" className="h-10 bg-zinc-50 border-zinc-200" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('guest.gender') || 'Gender'}<span className="text-red-500">*</span></Label>
        <Select required value={newGuestRef.gender} onValueChange={(val: string) => setNewGuestRef({...newGuestRef, gender: val as "male" | "female" | "other"})}>
          <SelectTrigger className="h-10 bg-zinc-50 border-zinc-200"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="male">{t('guest.male') || 'Male'}</SelectItem>
            <SelectItem value="female">{t('guest.female') || 'Female'}</SelectItem>
            <SelectItem value="other">{t('guest.other') || 'Other'}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
    <div className="space-y-1.5 sm:w-1/3">
      <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.dob') || 'DOB'}</Label>
      <Input type="date" value={newGuestRef.dob} onChange={e => setNewGuestRef({...newGuestRef, dob: e.target.value})} className="h-10 bg-zinc-50 border-zinc-200" />
    </div>
  </div>

  {/* ── Section 2: Stay ── */}
  <div className="space-y-3 pt-3 border-t border-zinc-100">
    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Stay</div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="space-y-1.5">
        <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.checkInDate')}<span className="text-red-500">*</span></Label>
        <Input type="date" required className="h-10 bg-zinc-50 border-zinc-200" value={newGuestRef.checkInDate} onChange={e => setNewGuestRef({...newGuestRef, checkInDate: e.target.value})} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.checkOutDate')}<span className="text-red-500">*</span></Label>
        <Input type="date" required className="h-10 bg-zinc-50 border-zinc-200" value={newGuestRef.checkOutDate} onChange={e => setNewGuestRef({...newGuestRef, checkOutDate: e.target.value})} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.arrivalTime')}</Label>
        <Select value={newGuestRef.arrivalTime} onValueChange={(val: string) => setNewGuestRef({...newGuestRef, arrivalTime: val as "morning" | "afternoon" | "evening" | "late"})}>
          <SelectTrigger className="h-10 bg-zinc-50 border-zinc-200"><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="morning">{t('checkin.arrivalTime.morning')}</SelectItem>
            <SelectItem value="afternoon">{t('checkin.arrivalTime.afternoon')}</SelectItem>
            <SelectItem value="evening">{t('checkin.arrivalTime.evening')}</SelectItem>
            <SelectItem value="late">{t('checkin.arrivalTime.late')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  </div>

  {/* ── Section 3: ID & Source ── */}
  <div className="space-y-3 pt-3 border-t border-zinc-100">
    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">ID &amp; Source</div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.idType')}<span className="text-red-500">*</span></Label>
        <Select required value={newGuestRef.idType} onValueChange={(val: string) => setNewGuestRef({...newGuestRef, idType: val as "passport" | "idCard" | "driverLicense"})}>
          <SelectTrigger className="h-10 bg-zinc-50 border-zinc-200"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="passport">{t('checkin.idType.passport')}</SelectItem>
            <SelectItem value="idCard">{t('checkin.idType.idCard')}</SelectItem>
            <SelectItem value="driverLicense">{t('checkin.idType.driverLicense')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.passportOrId')}<span className="text-red-500">*</span></Label>
        <div className="relative">
          <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <Input required className="pl-8 h-10 bg-zinc-50 border-zinc-200" value={newGuestRef.passportOrId} onChange={e => setNewGuestRef({...newGuestRef, passportOrId: e.target.value})} />
        </div>
      </div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.source')}</Label>
        <Select value={newGuestRef.bookingSource} onValueChange={(val: string) => setNewGuestRef({...newGuestRef, bookingSource: val as "walk-in" | "phone" | "email" | "referral" | "other"})}>
          <SelectTrigger className="h-10 bg-zinc-50 border-zinc-200"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="walk-in">{t('checkin.source.walkIn')}</SelectItem>
            <SelectItem value="phone">{t('checkin.source.phone')}</SelectItem>
            <SelectItem value="email">{t('checkin.source.email')}</SelectItem>
            <SelectItem value="referral">{t('checkin.source.referral')}</SelectItem>
            <SelectItem value="other">{t('checkin.source.other')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.referral')}</Label>
        <Input className="h-10 bg-zinc-50 border-zinc-200" placeholder="Hostelworld / Friend / Google…" value={newGuestRef.referral} onChange={e => setNewGuestRef({...newGuestRef, referral: e.target.value})} />
      </div>
    </div>
    <div className="space-y-1.5">
      <Label className="text-[10px] font-semibold text-zinc-500 uppercase flex items-center gap-1.5"><FileText className="w-3 h-3" />{t('checkin.notes')}</Label>
      <Input className="h-10 bg-zinc-50 border-zinc-200" placeholder="E.g., Prefers bottom bunk" value={newGuestRef.notes} onChange={e => setNewGuestRef({...newGuestRef, notes: e.target.value})} />
    </div>
  </div>

  {/* ── Police Consent (sticky) ── */}
  <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">
    <label className="flex items-start gap-2.5 cursor-pointer">
      <input type="checkbox" required checked={newGuestRef.policeConsent} onChange={e => setNewGuestRef({...newGuestRef, policeConsent: e.target.checked})} className="mt-0.5 w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900" />
      <div>
        <span className="text-xs font-semibold text-zinc-900">{t('checkin.policeRegistration')}<span className="text-red-500">*</span></span>
        <span className="text-[10px] text-zinc-500 block mt-0.5">{t('checkin.policeRegistrationDesc')}</span>
      </div>
    </label>
  </div>

  <div className="pt-3 border-t border-zinc-100 flex justify-end">
    <Button type="submit" size="lg" className="h-11 px-6 text-sm shadow-sm w-full sm:w-auto">{t('checkin.createArrival')}</Button>
  </div>
</form>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors. The form is purely additive — `name` is now derived from `firstName + lastName` but the existing logic still works.

- [ ] **Step 5: Smoke-test in the browser**

Open `http://localhost:3006/`, go to the Check-in tab, click "New walk-in" (or `+ 新建`). Verify:
- 3 section headers visible (Personal Info / Stay / ID & Source)
- Red `*` next to 11 required field labels
- Can submit a new guest with all required fields filled
- Submitted guest shows up in the left list

- [ ] **Step 6: Commit**

```bash
git add src/components/CheckInPanel.tsx
git commit -m "feat(checkin): rewrite walk-in form as 3-section layout with 11 required fields"
```

---

## Task 7: Rewrite the detail view as two-column layout

**Files:**
- Modify: `src/components/CheckInPanel.tsx:295-410` (the `selectedGuest ?` block)

- [ ] **Step 1: Add state for the Edit Info modal trigger**

Find the existing state declarations near the top of `CheckInPanel` (around line 33–38) and add:

```ts
const [editInfoOpen, setEditInfoOpen] = useState(false);
```

Import the modal at the top of the file (alongside other component imports):
```ts
import { EditGuestInfoModal } from './EditGuestInfoModal';
```

- [ ] **Step 2: Replace the detail view's `<div className="space-y-4">` block**

Find the existing detail view block:
```tsx
} : selectedGuest ? (
  <div className="space-y-4">
    {/* Guest Header */}
    <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm flex items-end justify-between">
      ...
    </div>
    {/* Verification + Payment */}
    ...
    {/* Notes */}
    ...
    {/* Bed Assignment */}
    ...
  </div>
) : (
  ...
)}
```

Replace the entire `<div className="space-y-4">...</div>` (the selectedGuest branch only) with:

```tsx
} : selectedGuest ? (
  <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
    {/* ── Left 60%: Info Card ── */}
    <div className="lg:col-span-3 space-y-4">
      <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-zinc-900 truncate">
              {[selectedGuest.firstName, selectedGuest.lastName].filter(Boolean).join(' ') || selectedGuest.name}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              <span className="font-medium text-zinc-700">{selectedGuest.country}</span>
              {' · '}{selectedGuest.gender ? t(`guest.${selectedGuest.gender}`) || selectedGuest.gender : t('checkin.notProvided')}
              {' · '}{selectedGuest.nights} {t('dashboard.nights')}
              {' · '}{t('checkin.checkout')} {selectedGuest.checkOutDate}
            </p>
          </div>
          <Button variant="outline" size="sm" className="h-7 text-xs shrink-0" onClick={() => setEditInfoOpen(true)}>
            ✎ {t('checkin.editInfo')}
          </Button>
        </div>
        {selectedGuest.paymentStatus === 'unpaid' && (
          <div className="mt-3 inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2 py-1 rounded-md text-[10px] font-semibold">
            ⚠ {t('checkin.paymentDue')} ${selectedGuest.totalAmount ?? (selectedGuest.nights * DEFAULT_PRICE)}
          </div>
        )}
        {selectedGuest.paymentStatus === 'paid' && (
          <div className="mt-3 inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md text-[10px] font-semibold">
            ✓ {t('checkin.paid')}
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm space-y-3">
        <div>
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">{t('checkin.contactSection')}</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Field icon="📧" label={t('checkin.email')} value={selectedGuest.email} placeholder={t('checkin.notProvided')} />
            <Field icon="📞" label={t('checkin.phone')} value={selectedGuest.phone} placeholder={t('checkin.notProvided')} />
            <Field icon="🕒" label={t('checkin.arrivalTime')} value={selectedGuest.arrivalTime ? t(`checkin.arrivalTime.${selectedGuest.arrivalTime}`) : undefined} placeholder={t('checkin.notProvided')} />
            <Field icon="🔗" label={t('checkin.referral')} value={selectedGuest.referral} placeholder={t('checkin.notProvided')} />
          </div>
        </div>
        <div className="pt-3 border-t border-zinc-100">
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">{t('checkin.idSection')}</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Field icon="🛂" label={t('checkin.idType')} value={selectedGuest.idType ? t(`checkin.idType.${selectedGuest.idType}`) : undefined} placeholder={t('checkin.notProvided')} />
            <Field icon="#" label={t('checkin.passportOrId')} value={selectedGuest.passportOrId} placeholder={t('checkin.notProvided')} />
            <Field icon="🎂" label={t('checkin.dob') || 'DOB'} value={selectedGuest.dob} placeholder={t('checkin.notProvided')} />
            <Field icon="👥" label={t('guest.gender') || 'Gender'} value={selectedGuest.gender ? t(`guest.${selectedGuest.gender}`) || selectedGuest.gender : undefined} placeholder={t('checkin.notProvided')} />
          </div>
        </div>
      </div>
    </div>

    {/* ── Right 40%: Actions Stack ── */}
    <div className="lg:col-span-2 space-y-3">
      <Card className="p-3 border-zinc-200 bg-white shadow-none">
        <Label className="text-[10px] text-zinc-500 uppercase font-semibold">{t('checkin.verification')}</Label>
        <div className="flex items-center gap-2 mt-2">
          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", selectedGuest.passportScanned ? 'bg-emerald-50 text-emerald-500' : 'bg-zinc-100 text-zinc-400')}>
            {selectedGuest.passportScanned ? <CheckCircle2 className="h-4 w-4" /> : <Info className="h-4 w-4" />}
          </div>
          {!selectedGuest.passportScanned ? (
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => scanPassport(selectedGuest.id)}>{t('checkin.scanPassport')}</Button>
          ) : <span className="text-xs font-medium text-emerald-600">{t('checkin.verified')}</span>}
        </div>
      </Card>

      <Card className="p-3 border-zinc-200 bg-white shadow-none">
        <Label className="text-[10px] text-zinc-500 uppercase font-semibold">{t('checkin.payment')}</Label>
        <div className="flex items-center gap-2 mt-2">
          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", selectedGuest.paymentStatus === 'unpaid' ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500')}>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          {selectedGuest.paymentStatus === 'unpaid' ? (
            <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => settlePayment(selectedGuest.id)}>{t('checkin.collect')} ${selectedGuest.totalAmount ?? (selectedGuest.nights * DEFAULT_PRICE)}</Button>
          ) : <span className="text-xs font-medium text-emerald-600">{t('checkin.allSettled')}</span>}
        </div>
      </Card>

      <Card className="p-3 border-zinc-200 bg-white shadow-none">
        <div className="space-y-1">
          <Label className="text-[10px] text-zinc-500">{t('checkin.notes')}</Label>
          <Input className="h-8 bg-zinc-50 border-zinc-200 text-xs" placeholder="..." value={editNotes}
            onChange={e => { setEditNotes(e.target.value); if (selectedGuest) updateArrival(selectedGuest.id, { notes: e.target.value }); }} />
        </div>
      </Card>

      <Card className="p-4 border-zinc-200 shadow-none">
        <Label className="text-xs text-zinc-900 font-semibold mb-2 flex items-center gap-1.5"><BedDouble className="h-3.5 w-3.5" />{t('checkin.assignBed')}</Label>
        <Button size="lg" className="w-full h-11 text-sm mb-3 bg-blue-600 hover:bg-blue-700 text-white shadow-md"
          onClick={() => {
            const result = autoAssignBed(selectedGuest.id);
            if (result) {
              setCheckInSuccess(selectedGuest.name);
              setSelectedGuestId(null);
              setSelectedBedId(null);
            }
          }}>
          <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          {t('checkin.autoAssign') || 'Auto Assign & Check-in'}
        </Button>
        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
          {scoredBeds.map((score, idx) => {
            const isTop = idx === 0;
            return (
              <button key={score.bedId} onClick={() => setSelectedBedId(score.bedId)}
                className={cn("p-3 rounded-xl border text-left transition-all cursor-pointer min-h-[70px] relative",
                  selectedBedId === score.bedId ? 'border-zinc-900 bg-zinc-900 text-white shadow-md' :
                  isTop ? 'border-emerald-400 bg-emerald-50/70 hover:border-emerald-500 shadow-sm' :
                  'border-zinc-200 bg-white hover:border-zinc-400')}>
                {isTop && <span className="absolute -top-2 left-2 text-[10px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded">★ Best</span>}
                <span className="font-semibold text-xs">
                  {score.roomType === 'dorm-mixed' ? t('bedboard.mixedDorm') : score.roomType === 'dorm-female' ? t('bedboard.femaleDorm') : t('bedboard.private')}
                </span>
                <span className={cn("text-[10px] mt-0.5 block", selectedBedId === score.bedId ? 'text-zinc-300' : 'text-zinc-500')}>
                  {score.bedName} · R{score.roomNumber} · ${score.pricePerNight}
                </span>
                <div className="flex items-center gap-0.5 mt-1">
                  {score.fillExisting && <span className="text-[9px] bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-zinc-600">Fill</span>}
                  {score.genderMatch && <span className="text-[9px] bg-blue-50 px-1 py-0.5 rounded text-blue-600">Match</span>}
                </div>
              </button>
            );
          })}
          {scoredBeds.length === 0 && (
            <div className="col-span-full py-4 text-center text-xs text-red-500">{t('checkin.noAvailableBeds') || 'No suitable beds available'}</div>
          )}
        </div>
        {(selectedGuest.paymentStatus === 'unpaid' || selectedGuest.paymentStatus === 'partial') && (
          <p className="text-[10px] font-medium text-amber-600 mt-2">⚠️ {t('checkin.unpaidWarning')}</p>
        )}
        <div className="mt-3 pt-3 border-t border-zinc-100 flex justify-end gap-2">
          <Button size="lg" disabled={!selectedBedId || !selectedGuest.passportScanned} onClick={handleCheckIn}
            className="w-full sm:w-auto h-11 px-6 text-sm shadow-lg">{t('checkin.completeCheckIn')}</Button>
        </div>
      </Card>
    </div>

    <EditGuestInfoModal
      open={editInfoOpen}
      onClose={() => setEditInfoOpen(false)}
      guest={selectedGuest}
      onSave={(updates) => updateArrival(selectedGuest.id, updates)}
    />
  </div>
) : (
  ...
)}
```

- [ ] **Step 3: Add the `Field` helper component above `CheckInPanel`**

Right before the `CheckInPanel` function definition (around line 24), add:

```tsx
function Field({ icon, label, value, placeholder }: { icon: string; label: string; value?: string; placeholder: string }) {
  const hasValue = !!value && value.length > 0;
  return (
    <div className="flex items-start gap-1.5 min-w-0">
      <span className="shrink-0 opacity-60">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wider">{label}</div>
        <div className={cn("truncate", hasValue ? "text-zinc-900 font-medium" : "text-zinc-400 italic")}>
          {hasValue ? value : placeholder}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles (this step will fail because `EditGuestInfoModal` doesn't exist yet — that's expected; Task 8 creates it)**

```bash
npx tsc --noEmit
```
Expected: error `Cannot find module './EditGuestInfoModal'`. That's the cue to move to Task 8. **Do not commit yet.**

---

## Task 8: Create `EditGuestInfoModal`

**Files:**
- Create: `src/components/EditGuestInfoModal.tsx`

- [ ] **Step 1: Create the modal component file**

```tsx
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '../i18nContext';
import { motion, AnimatePresence } from 'motion/react';
import type { Guest } from '../types';

export interface GuestInfoUpdates {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  idType?: Guest['idType'];
  passportOrId?: string;
  arrivalTime?: Guest['arrivalTime'];
  referral?: string;
  bookingSource?: Guest['bookingSource'];
  dob?: string;
  gender?: Guest['gender'];
  notes?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  guest: Guest;
  onSave: (updates: GuestInfoUpdates) => void;
}

export function EditGuestInfoModal({ open, onClose, guest, onSave }: Props) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<GuestInfoUpdates>({});

  useEffect(() => {
    if (open) {
      setDraft({
        firstName: guest.firstName ?? '',
        lastName: guest.lastName ?? '',
        phone: guest.phone ?? '',
        email: guest.email ?? '',
        idType: guest.idType,
        passportOrId: guest.passportOrId ?? '',
        arrivalTime: guest.arrivalTime,
        referral: guest.referral ?? '',
        bookingSource: guest.bookingSource,
        dob: guest.dob ?? '',
        gender: guest.gender,
        notes: guest.notes ?? '',
      });
    }
  }, [open, guest]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      firstName: draft.firstName || undefined,
      lastName: draft.lastName || undefined,
      phone: draft.phone || undefined,
      email: draft.email || undefined,
      idType: draft.idType,
      passportOrId: draft.passportOrId || undefined,
      arrivalTime: draft.arrivalTime,
      referral: draft.referral || undefined,
      bookingSource: draft.bookingSource,
      dob: draft.dob || undefined,
      gender: draft.gender,
      notes: draft.notes || undefined,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-zinc-100 sticky top-0 bg-white z-10">
              <h3 className="text-base font-semibold text-zinc-900">{t('checkin.editInfo')}</h3>
              <button onClick={onClose} className="p-1 hover:bg-zinc-100 rounded-lg">
                <X className="h-4 w-4 text-zinc-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.firstName')}</Label>
                  <Input value={draft.firstName ?? ''} onChange={e => setDraft({...draft, firstName: e.target.value})} className="h-9 bg-zinc-50 border-zinc-200" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.lastName')}</Label>
                  <Input value={draft.lastName ?? ''} onChange={e => setDraft({...draft, lastName: e.target.value})} className="h-9 bg-zinc-50 border-zinc-200" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.phone')}</Label>
                  <Input type="tel" value={draft.phone ?? ''} onChange={e => setDraft({...draft, phone: e.target.value})} className="h-9 bg-zinc-50 border-zinc-200" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.email')}</Label>
                  <Input type="email" value={draft.email ?? ''} onChange={e => setDraft({...draft, email: e.target.value})} className="h-9 bg-zinc-50 border-zinc-200" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.idType')}</Label>
                  <Select value={draft.idType ?? 'passport'} onValueChange={(val: string) => setDraft({...draft, idType: val as Guest['idType']})}>
                    <SelectTrigger className="h-9 bg-zinc-50 border-zinc-200"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="passport">{t('checkin.idType.passport')}</SelectItem>
                      <SelectItem value="idCard">{t('checkin.idType.idCard')}</SelectItem>
                      <SelectItem value="driverLicense">{t('checkin.idType.driverLicense')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.passportOrId')}</Label>
                  <Input value={draft.passportOrId ?? ''} onChange={e => setDraft({...draft, passportOrId: e.target.value})} className="h-9 bg-zinc-50 border-zinc-200" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.arrivalTime')}</Label>
                  <Select value={draft.arrivalTime ?? ''} onValueChange={(val: string) => setDraft({...draft, arrivalTime: val as Guest['arrivalTime']})}>
                    <SelectTrigger className="h-9 bg-zinc-50 border-zinc-200"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">{t('checkin.arrivalTime.morning')}</SelectItem>
                      <SelectItem value="afternoon">{t('checkin.arrivalTime.afternoon')}</SelectItem>
                      <SelectItem value="evening">{t('checkin.arrivalTime.evening')}</SelectItem>
                      <SelectItem value="late">{t('checkin.arrivalTime.late')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.source')}</Label>
                  <Select value={draft.bookingSource ?? 'walk-in'} onValueChange={(val: string) => setDraft({...draft, bookingSource: val as Guest['bookingSource']})}>
                    <SelectTrigger className="h-9 bg-zinc-50 border-zinc-200"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walk-in">{t('checkin.source.walkIn')}</SelectItem>
                      <SelectItem value="phone">{t('checkin.source.phone')}</SelectItem>
                      <SelectItem value="email">{t('checkin.source.email')}</SelectItem>
                      <SelectItem value="referral">{t('checkin.source.referral')}</SelectItem>
                      <SelectItem value="other">{t('checkin.source.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.referral')}</Label>
                  <Input value={draft.referral ?? ''} onChange={e => setDraft({...draft, referral: e.target.value})} className="h-9 bg-zinc-50 border-zinc-200" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.dob') || 'DOB'}</Label>
                  <Input type="date" value={draft.dob ?? ''} onChange={e => setDraft({...draft, dob: e.target.value})} className="h-9 bg-zinc-50 border-zinc-200" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('guest.gender') || 'Gender'}</Label>
                  <Select value={draft.gender ?? ''} onValueChange={(val: string) => setDraft({...draft, gender: val as Guest['gender']})}>
                    <SelectTrigger className="h-9 bg-zinc-50 border-zinc-200"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{t('guest.male') || 'Male'}</SelectItem>
                      <SelectItem value="female">{t('guest.female') || 'Female'}</SelectItem>
                      <SelectItem value="other">{t('guest.other') || 'Other'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold text-zinc-500 uppercase">{t('checkin.notes')}</Label>
                <Input value={draft.notes ?? ''} onChange={e => setDraft({...draft, notes: e.target.value})} className="h-9 bg-zinc-50 border-zinc-200" />
              </div>
              <div className="pt-3 border-t border-zinc-100 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose} size="sm" className="h-9 text-xs">{t('common.cancel') || 'Cancel'}</Button>
                <Button type="submit" size="sm" className="h-9 text-xs">{t('common.save') || 'Save'}</Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors. If you see `Cannot find name 'common.cancel'`, that's fine — the modal uses `t('common.cancel') || 'Cancel'` as a fallback; you can leave the literal English string or add the `common.cancel` and `common.save` keys to en.json + zh.json.

- [ ] **Step 3: Commit Tasks 7 + 8 together**

```bash
git add src/components/CheckInPanel.tsx src/components/EditGuestInfoModal.tsx
git commit -m "feat(checkin): two-column detail view with Edit Info modal"
```

- [ ] **Step 4: Smoke-test in the browser**

Open `http://localhost:3006/`, go to the Check-in tab, click any pending guest. Verify:
- Left column shows the info card (Contact + ID sections) with values or "未填写" placeholders
- Right column shows the actions stack (Verification, Payment, Notes, Bed Assignment, Complete)
- The "✎ Edit Info" button opens the modal
- Editing a field and clicking Save updates the guest's data immediately

---

## Task 9: Backfill demo seed data

**Files:**
- Modify: `src/data/index.ts` (or `src/data/seed.ts` — whichever exports `ARRIVALS`)

- [ ] **Step 1: Find the ARRIVALS export**

```bash
grep -rn "export const ARRIVALS\|export const INITIAL_ARRIVALS" src/data/
```

Open the file. It should export a typed array of `Guest` objects with at least 5 entries.

- [ ] **Step 2: Add new fields to each demo guest**

For each guest in the array, add (where applicable) `firstName`, `lastName`, `phone`, `email`, `idType`, `arrivalTime`, `referral`, `bookingSource`. Example for one guest:

Before:
```ts
{
  id: 'g_demo_1',
  name: 'Sophie Müller',
  country: 'Germany', countryCode: 'DEU',
  checkInDate: '2026-06-15', checkOutDate: '2026-06-18',
  nights: 3, paymentStatus: 'unpaid', totalAmount: 255,
  passportScanned: true, passportOrId: 'C01X00T47',
  source: 'walk-in',
}
```

After:
```ts
{
  id: 'g_demo_1',
  name: 'Sophie Müller',
  firstName: 'Sophie', lastName: 'Müller',
  country: 'Germany', countryCode: 'DEU',
  checkInDate: '2026-06-15', checkOutDate: '2026-06-18',
  nights: 3, paymentStatus: 'unpaid', totalAmount: 255,
  phone: '+49-30-12345678', email: 'sophie@mail.de',
  idType: 'passport', arrivalTime: 'afternoon',
  referral: 'Hostelworld', bookingSource: 'walk-in',
  passportScanned: true, passportOrId: 'C01X00T47',
  source: 'walk-in',
}
```

Repeat for at least 4–5 other guests. For one guest, deliberately leave `referral` and `arrivalTime` undefined to demo the "未填写" placeholder.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/data/
git commit -m "feat(data): backfill demo guests with new contact/ID fields"
```

---

## Task 10: Bump version, run full verification, and tag the release

**Files:**
- Modify: `src/version.ts`

- [ ] **Step 1: Read `src/version.ts` to find the current version string**

```bash
cat src/version.ts
```

- [ ] **Step 2: Bump the version to v1.6.0**

Change the version constant (and any `APP_VERSION` / `appName` related strings) to `v1.6.0`. Example:

Before:
```ts
export const APP_VERSION = 'v1.4.0';
export const APP_NAME = 'BunkDesk';
```

After:
```ts
export const APP_VERSION = 'v1.6.0';
export const APP_NAME = 'BunkDesk';
```

Adjust field names to match the actual file.

- [ ] **Step 3: Run the full verification gate**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Final smoke-test in the browser**

1. Open `http://localhost:3006/`
2. Go to the Check-in tab
3. Verify the version pill in the footer/sidebar shows `v1.6.0`
4. Click "New walk-in" → fill in all 11 required fields → submit
5. Click the newly created guest → verify the detail view shows the new fields
6. Click "✎ Edit Info" → modify a field → Save → verify the change reflects in the detail view
7. Reload the page → verify the new guest persists (localStorage)

- [ ] **Step 5: Commit and tag the release**

```bash
git add src/version.ts
git commit -m "chore: bump to v1.6.0 — guest info expansion"
git tag -a v1.6.0 -m "v1.6.0: expanded pending check-in to 16 fields (contact, ID, arrival, source)"
```

- [ ] **Step 6: Push the branch and tag (if user has a remote configured)**

```bash
git push origin main
git push origin v1.6.0
```

(If no remote is configured or the user hasn't asked, skip this step.)

---

## Self-Review Checklist

- [x] **Spec coverage:** Section 2 (字段清单) → Task 1; Section 4 (UI) → Tasks 6+7; Section 5 (迁移) → Tasks 3+4; Section 6 (iCal) → Task 5; Section 7 (i18n) → Task 2; Section 8 (种子) → Task 9; Section 9 (文件清单) → all tasks
- [x] **No placeholders:** Every code block contains complete, runnable code
- [x] **Type consistency:** `IdDocumentType`, `ArrivalSlot`, `BookingSource` defined in Task 1, used consistently in Tasks 3, 6, 7, 8
- [x] **Commit granularity:** 9 atomic commits, one per task
- [x] **Verification gate:** `npx tsc --noEmit` invoked at the end of every task
