# CheckIn Detail Card Layout Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Optimize the CheckInPanel detail card's information layout, visual hierarchy, and bed recommendation tags — keeping the dual-column structure and 2-col bed grid unchanged.

**Architecture:** Single-file refactor of `src/components/CheckInPanel.tsx`. Replace the `Field` helper with a richer `FieldRow` component (colored icon background + divider). Compress 3 right-column cards into 1 status bar. Add inline Source dropdown. Map `BedScore` reason fields to 4 tag types. No new files, no new dependencies.

**Tech Stack:** React 19 + TypeScript + TailwindCSS 4 + shadcn/ui (Select/Label) + existing `cn` util + existing `scoreBeds` from `bedAllocator.ts`.

**Spec:** [`.trae/documents/2026-06-15-checkin-detail-layout-optimization-design.md`](file:///Users/ricky/AICode/hostelite/.trae/documents/2026-06-15-checkin-detail-layout-optimization-design.md)

**Verification gate:** `npx tsc --noEmit` must pass after every task. Run from `/Users/ricky/AICode/hostelite`.

---

## File Structure

| File | Status | Responsibility |
|------|--------|----------------|
| `src/components/CheckInPanel.tsx` | modify | All UI changes: FieldRow, header badges, status bar, source dropdown, bed tags |

Only 1 file changes. The `Field` helper (line 27-40) gets replaced. The detail view (line 405-551) gets rewritten. Everything else stays.

---

## Task 1: Replace `Field` with `FieldRow` component

**Files:**
- Modify: `src/components/CheckInPanel.tsx:27-40` (Field function)

- [ ] **Step 1: Read the current `Field` function**

Open `/Users/ricky/AICode/hostelite/src/components/CheckInPanel.tsx` lines 27-40. The current `Field` is:

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

- [ ] **Step 2: Replace `Field` with `FieldRow`**

Replace the entire `Field` function (lines 27-40) with:

```tsx
function FieldRow({ icon, iconBg, label, value, placeholder, children }: {
  icon: string; iconBg: string; label: string; value?: string; placeholder: string; children?: React.ReactNode;
}) {
  const hasValue = !!value && value.length > 0;
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-zinc-50 last:border-b-0">
      <div className={cn("w-6 h-6 rounded-md flex items-center justify-center text-[11px] shrink-0", iconBg)}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">{label}</div>
        {children ? children : (
          <div className={cn("truncate text-xs", hasValue ? "text-zinc-900 font-semibold" : "text-zinc-300 italic font-normal")}>
            {hasValue ? value : placeholder}
          </div>
        )}
      </div>
    </div>
  );
}
```

Key differences from old `Field`:
- `iconBg` prop: colored background class (e.g., `"bg-blue-50"`)
- `children` prop: allows inline dropdown instead of plain text
- `border-b border-zinc-50` for visual separation
- Larger icon (24px) with colored background
- Value text is `text-xs font-semibold` (was `text-zinc-900 font-medium`)

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/ricky/AICode/hostelite && npx tsc --noEmit
```

Expected: errors because `Field` is no longer defined and old usages reference it. That's expected — Task 2 fixes the usages.

- [ ] **Step 4: Do NOT commit yet — Task 2 will fix the usages**

---

## Task 2: Rewrite the left-column detail view (Header + Contact + ID)

**Files:**
- Modify: `src/components/CheckInPanel.tsx:405-457` (the `lg:col-span-3` left column)

- [ ] **Step 1: Read the current left-column code**

Open `/Users/ricky/AICode/hostelite/src/components/CheckInPanel.tsx` lines 405-457. This is the `lg:col-span-3` div containing the header card and the contact+ID card.

- [ ] **Step 2: Replace the entire left-column block**

Find the block starting at `) : selectedGuest ? (` and replace the `<div className="lg:col-span-3 space-y-4">` ... `</div>` (the left column only, NOT the right column) with:

```tsx
<div className="lg:col-span-3 space-y-3">
  {/* Header Card */}
  <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <h2 className="text-[17px] font-extrabold text-zinc-900 truncate">
          {[selectedGuest.firstName, selectedGuest.lastName].filter(Boolean).join(' ') || selectedGuest.name}
        </h2>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold">
            {selectedGuest.countryCode || selectedGuest.country}
          </span>
          {selectedGuest.gender && (
            <span className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold",
              selectedGuest.gender === 'female' ? 'bg-pink-50 text-pink-700' :
              selectedGuest.gender === 'male' ? 'bg-sky-50 text-sky-700' :
              'bg-zinc-100 text-zinc-600'
            )}>
              {selectedGuest.gender === 'female' ? '♀' : selectedGuest.gender === 'male' ? '♂' : '○'} {t(`guest.${selectedGuest.gender}`) || selectedGuest.gender}
            </span>
          )}
          <span className="text-[10px] text-zinc-400">{selectedGuest.nights} {t('dashboard.nights')} · {t('checkin.checkout')} {selectedGuest.checkOutDate}</span>
        </div>
      </div>
      <Button variant="outline" size="sm" className="h-7 text-xs shrink-0" onClick={() => setEditInfoOpen(true)}>
        ✎ {t('checkin.editInfo')}
      </Button>
    </div>
    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
      {selectedGuest.paymentStatus === 'unpaid' && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-bold">
          ⚠ {t('checkin.paymentDue')} ${selectedGuest.totalAmount ?? (selectedGuest.nights * DEFAULT_PRICE)}
        </span>
      )}
      {selectedGuest.paymentStatus === 'paid' && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold">
          ✓ {t('checkin.paid')}
        </span>
      )}
      {selectedGuest.arrivalTime && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold">
          🕒 {t(`checkin.arrivalTime.${selectedGuest.arrivalTime}`)}
        </span>
      )}
    </div>
  </div>

  {/* Contact + ID Card */}
  <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
    {/* Contact Section */}
    <div className="flex items-center gap-1.5 mb-2">
      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
      <div className="text-[9px] font-extrabold text-blue-500 uppercase tracking-wider">{t('checkin.contactSection')}</div>
    </div>
    <div className="grid grid-cols-2 gap-x-3">
      <FieldRow icon="📧" iconBg="bg-blue-50" label={t('checkin.email')} value={selectedGuest.email} placeholder={t('checkin.notProvided')} />
      <FieldRow icon="📞" iconBg="bg-blue-50" label={t('checkin.phone')} value={selectedGuest.phone} placeholder={t('checkin.notProvided')} />
      <FieldRow icon="🕒" iconBg="bg-blue-50" label={t('checkin.arrivalTime.label')} value={selectedGuest.arrivalTime ? t(`checkin.arrivalTime.${selectedGuest.arrivalTime}`) : undefined} placeholder={t('checkin.notProvided')} />
      <FieldRow icon="🔗" iconBg="bg-blue-50" label={t('checkin.referral')} value={selectedGuest.referral} placeholder={t('checkin.notProvided')} />
      <div className="col-span-2">
        <FieldRow icon="📋" iconBg="bg-blue-50" label={t('checkin.source.label')} value="" placeholder="">
          <Select value={selectedGuest.bookingSource ?? 'walk-in'} onValueChange={(val: string) => updateArrival(selectedGuest.id, { bookingSource: val as Guest['bookingSource'] })}>
            <SelectTrigger className="h-6 text-[11px] bg-zinc-100 border-zinc-200 w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="walk-in">{t('checkin.source.walkIn')}</SelectItem>
              <SelectItem value="phone">{t('checkin.source.phone')}</SelectItem>
              <SelectItem value="email">{t('checkin.source.email')}</SelectItem>
              <SelectItem value="referral">{t('checkin.source.referral')}</SelectItem>
              <SelectItem value="other">{t('checkin.source.other')}</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
      </div>
    </div>

    {/* ID Section */}
    <div className="border-t border-zinc-100 mt-2 pt-2">
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
        <div className="text-[9px] font-extrabold text-violet-500 uppercase tracking-wider">{t('checkin.idSection')}</div>
      </div>
      <div className="grid grid-cols-2 gap-x-3">
        <FieldRow icon="🛂" iconBg="bg-violet-50" label={t('checkin.idType.label')} value={selectedGuest.idType ? t(`checkin.idType.${selectedGuest.idType}`) : undefined} placeholder={t('checkin.notProvided')}>
          {selectedGuest.passportScanned && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-zinc-900">{selectedGuest.idType ? t(`checkin.idType.${selectedGuest.idType}`) : t('checkin.notProvided')}</span>
              <span className="inline-flex items-center px-1 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[8px] font-bold">✓</span>
            </div>
          )}
        </FieldRow>
        <FieldRow icon="#" iconBg="bg-violet-50" label={t('checkin.passportOrId')} value={selectedGuest.passportOrId} placeholder={t('checkin.notProvided')} />
        <FieldRow icon="🎂" iconBg="bg-violet-50" label={t('checkin.dob') || 'DOB'} value={selectedGuest.dob} placeholder={t('checkin.notProvided')} />
        <FieldRow icon="👥" iconBg="bg-violet-50" label={t('guest.gender') || 'Gender'} value={selectedGuest.gender ? t(`guest.${selectedGuest.gender}`) || selectedGuest.gender : undefined} placeholder={t('checkin.notProvided')} />
      </div>
    </div>
  </div>
</div>
```

Note: The `FieldRow` for ID Type uses `children` to conditionally show the scanned badge. When `passportScanned` is true, it renders the type name + a green ✓ badge instead of the plain value. When false, it falls through to the normal value rendering.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/ricky/AICode/hostelite && npx tsc --noEmit
```

Expected: exit code 0 (the old `Field` usages in the left column are now replaced with `FieldRow`; the right column still uses old code but doesn't call `Field`).

- [ ] **Step 4: Commit Tasks 1 + 2 together**

```bash
cd /Users/ricky/AICode/hostelite && git add src/components/CheckInPanel.tsx
git commit -m "feat(checkin): optimize left-column detail view with FieldRow + Source dropdown

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Compress right-column Verification/Payment/Notes into 1 status bar

**Files:**
- Modify: `src/components/CheckInPanel.tsx:460-492` (the 3 right-column cards: Verification, Payment, Notes)

- [ ] **Step 1: Read the current right-column top 3 cards**

Open `/Users/ricky/AICode/hostelite/src/components/CheckInPanel.tsx` lines 460-492. These are the 3 `<Card>` elements for Verification, Payment, and Notes.

- [ ] **Step 2: Replace the 3 cards with 1 status bar**

Find the block from `<Card className="p-3 border-zinc-200 bg-white shadow-none">` (Verification) through the Notes card (ending around line 492). Replace all 3 cards with this single card:

```tsx
<Card className="p-3 border-zinc-200 bg-white shadow-none">
  <div className="flex flex-col gap-0">
    {/* Verification */}
    <div className="flex items-center justify-between py-1.5 border-b border-zinc-50">
      <div className="flex items-center gap-2">
        <div className={cn("w-5 h-5 rounded-md flex items-center justify-center text-[10px]",
          selectedGuest.passportScanned ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-400')}>
          {selectedGuest.passportScanned ? '✓' : '○'}
        </div>
        <span className={cn("text-[11px] font-semibold", selectedGuest.passportScanned ? 'text-emerald-600' : 'text-zinc-500')}>
          {selectedGuest.passportScanned ? t('checkin.verified') : t('checkin.scanPassport')}
        </span>
      </div>
      {!selectedGuest.passportScanned && (
        <Button variant="outline" size="sm" className="h-5 text-[9px] px-2" onClick={() => scanPassport(selectedGuest.id)}>{t('checkin.scanPassport')}</Button>
      )}
    </div>
    {/* Payment */}
    <div className="flex items-center justify-between py-1.5 border-b border-zinc-50">
      <div className="flex items-center gap-2">
        <div className={cn("w-5 h-5 rounded-md flex items-center justify-center text-[10px]",
          selectedGuest.paymentStatus === 'unpaid' ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500')}>
          {selectedGuest.paymentStatus === 'unpaid' ? '⚠' : '✓'}
        </div>
        <span className={cn("text-[11px] font-semibold", selectedGuest.paymentStatus === 'unpaid' ? 'text-red-600' : 'text-emerald-600')}>
          {selectedGuest.paymentStatus === 'unpaid'
            ? `$${selectedGuest.totalAmount ?? (selectedGuest.nights * DEFAULT_PRICE)} unpaid`
            : t('checkin.allSettled')}
        </span>
      </div>
      {selectedGuest.paymentStatus === 'unpaid' && (
        <Button size="sm" variant="destructive" className="h-5 text-[9px] px-2" onClick={() => settlePayment(selectedGuest.id)}>{t('checkin.collect')}</Button>
      )}
    </div>
    {/* Notes */}
    <div className="flex items-center gap-2 py-1.5">
      <div className="w-5 h-5 rounded-md bg-amber-50 flex items-center justify-center text-[10px] text-amber-600">📝</div>
      <Input className="h-5 bg-zinc-50 border-zinc-200 text-[10px] flex-1" placeholder="..." value={editNotes}
        onChange={e => { setEditNotes(e.target.value); if (selectedGuest) updateArrival(selectedGuest.id, { notes: e.target.value }); }} />
    </div>
  </div>
</Card>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/ricky/AICode/hostelite && npx tsc --noEmit
```

Expected: exit code 0.

- [ ] **Step 4: Commit**

```bash
cd /Users/ricky/AICode/hostelite && git add src/components/CheckInPanel.tsx
git commit -m "feat(checkin): compress Verification/Payment/Notes into 1 status bar

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Improve Bed Assignment card with green border + recommendation context + reason tags

**Files:**
- Modify: `src/components/CheckInPanel.tsx:494-542` (the Bed Assignment card)

- [ ] **Step 1: Read the current Bed Assignment card**

Open `/Users/ricky/AICode/hostelite/src/components/CheckInPanel.tsx` lines 494-542. This is the `<Card>` with `BedDouble` icon, Auto-Assign button, bed grid, and Complete Check-in button.

- [ ] **Step 2: Replace the Bed Assignment card**

Find the `<Card className="p-4 border-zinc-200 shadow-none">` block (the Bed Assignment card) and replace it with:

```tsx
<Card className="p-3 border-emerald-200 shadow-none">
  <Label className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-wider mb-1 flex items-center gap-1.5">
    <BedDouble className="h-3.5 w-3.5" />{t('checkin.assignBed')}
  </Label>
  <div className="text-[9px] text-zinc-500 mb-2">
    {t('checkin.recommendationFor') || 'For'}
    <span className="font-bold text-pink-600">{selectedGuest.gender === 'female' ? ' ♀ Female' : selectedGuest.gender === 'male' ? ' ♂ Male' : ''}</span>
    {selectedGuest.roomPreference && (
      <> · <span className="font-bold text-indigo-600">{t('checkin.prefers') || 'prefers'} {selectedGuest.roomPreference}</span></>
    )}
  </div>
  <Button size="lg" className="w-full h-9 text-xs mb-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md"
    onClick={() => {
      const result = autoAssignBed(selectedGuest.id);
      if (result) {
        setCheckInSuccess(selectedGuest.name);
        setSelectedGuestId(null);
        setSelectedBedId(null);
      }
    }}>
    <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
    {t('checkin.autoAssign') || 'Auto Assign & Check-in'}
  </Button>
  <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
    {scoredBeds.map((score, idx) => {
      const isTop = idx === 0;
      return (
        <button key={score.bedId} onClick={() => setSelectedBedId(score.bedId)}
          className={cn("p-2.5 rounded-xl border text-left transition-all cursor-pointer min-h-[60px] relative",
            selectedBedId === score.bedId ? 'border-zinc-900 bg-zinc-900 text-white shadow-md' :
            isTop ? 'border-emerald-400 bg-emerald-50/70 hover:border-emerald-500 shadow-sm' :
            'border-zinc-200 bg-white hover:border-zinc-400')}>
          {isTop && <span className="absolute -top-1.5 left-2 text-[8px] font-extrabold bg-emerald-500 text-white px-1.5 py-0.5 rounded">★ BEST</span>}
          <span className="font-bold text-[11px]">
            {score.roomType === 'dorm-mixed' ? t('bedboard.mixedDorm') : score.roomType === 'dorm-female' ? t('bedboard.femaleDorm') : t('bedboard.private')}
          </span>
          <span className={cn("text-[9px] mt-0.5 block", selectedBedId === score.bedId ? 'text-zinc-300' : 'text-zinc-500')}>
            {score.bedName} · R{score.roomNumber} · ${score.pricePerNight}
          </span>
          <div className="flex items-center gap-0.5 mt-1 flex-wrap">
            {score.genderMatch && <span className="text-[8px] font-bold bg-blue-50 text-blue-700 px-1 py-0.5 rounded">♀ Gender</span>}
            {score.preferenceMatch && <span className="text-[8px] font-bold bg-violet-50 text-violet-700 px-1 py-0.5 rounded">✓ Pref</span>}
            {score.fillExisting && <span className="text-[8px] font-bold bg-zinc-100 text-zinc-600 px-1 py-0.5 rounded">Fill</span>}
            {score.fragmentationScore >= 7 && <span className="text-[8px] font-bold bg-amber-50 text-amber-700 px-1 py-0.5 rounded">Low frag</span>}
          </div>
        </button>
      );
    })}
    {scoredBeds.length === 0 && (
      <div className="col-span-full py-3 text-center text-xs text-red-500">{t('checkin.noAvailableBeds') || 'No suitable beds available'}</div>
    )}
  </div>
  {(selectedGuest.paymentStatus === 'unpaid' || selectedGuest.paymentStatus === 'partial') && (
    <p className="text-[9px] font-medium text-amber-600 mt-1.5">⚠️ {t('checkin.unpaidWarning')}</p>
  )}
  <div className="mt-2 pt-2 border-t border-zinc-100 flex justify-end gap-2">
    <Button size="lg" disabled={!selectedBedId || !selectedGuest.passportScanned} onClick={handleCheckIn}
      className="w-full sm:w-auto h-9 px-5 text-xs shadow-lg">{t('checkin.completeCheckIn')}</Button>
  </div>
</Card>
```

Key changes from current:
- Card border: `border-zinc-200` → `border-emerald-200`
- Label: `text-xs text-zinc-900 font-semibold` → `text-[10px] text-emerald-600 font-extrabold uppercase tracking-wider`
- New: recommendation context line (`For ♀ Female · prefers Mixed`)
- Bed tags: `Fill` / `Match` → `♀ Gender` / `✓ Pref` / `Fill` / `Low frag` (4 types with distinct colors)
- Slightly tighter padding (p-3, p-2.5) to save vertical space

- [ ] **Step 3: Add missing i18n keys if needed**

Check if `checkin.recommendationFor` and `checkin.prefers` exist in `src/i18nContext.tsx`. If not, add them:

English:
```ts
recommendationFor: "For",
prefers: "prefers",
```

Chinese:
```ts
recommendationFor: "推荐给",
prefers: "偏好",
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/ricky/AICode/hostelite && npx tsc --noEmit
```

Expected: exit code 0.

- [ ] **Step 5: Commit**

```bash
cd /Users/ricky/AICode/hostelite && git add src/components/CheckInPanel.tsx src/i18nContext.tsx
git commit -m "feat(checkin): improve Bed Assignment card with green border + recommendation context + reason tags

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Bump version to v1.6.1 and final verification

**Files:**
- Modify: `src/version.ts`

- [ ] **Step 1: Bump version**

Change `APP_VERSION` from `'1.6.0'` to `'1.6.1'`.

- [ ] **Step 2: Run full verification**

```bash
cd /Users/ricky/AICode/hostelite && npx tsc --noEmit
```

Expected: exit code 0.

- [ ] **Step 3: Smoke-test in browser**

1. Open `http://localhost:3006/`
2. Go to Check-in tab → click a pending guest
3. Verify left column: colored icon backgrounds, Source dropdown, blue/purple section dots
4. Verify right column: single status bar (not 3 cards), green-bordered Bed card with recommendation context
5. Verify bed tags show `♀ Gender` / `✓ Pref` / `Fill` / `Low frag`

- [ ] **Step 4: Commit and tag**

```bash
cd /Users/ricky/AICode/hostelite && git add src/version.ts
git commit -m "chore: bump to v1.6.1 — detail card layout optimization

Co-Authored-By: Claude <noreply@anthropic.com>"
git tag -a v1.6.1 -m "v1.6.1: detail card layout optimization (FieldRow, Source dropdown, bed reason tags)"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** Section 2.1 (Header) → Task 2; Section 2.2 (Contact+ID) → Task 2; Section 2.3 (Status bar) → Task 3; Section 2.4 (Bed) → Task 4; Section 2.5 (Source dropdown) → Task 2; Section 2.6 (Reason tags) → Task 4
- [x] **No placeholders:** Every step contains complete code
- [x] **Type consistency:** `FieldRow` props defined in Task 1, used consistently in Tasks 2-4; `BedScore` fields (`genderMatch`, `preferenceMatch`, `fillExisting`, `fragmentationScore`) match `bedAllocator.ts` output
- [x] **Single file:** Only `CheckInPanel.tsx` changes (plus version bump + optional i18n keys)
