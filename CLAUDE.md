# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Identity

- **Product name**: BunkDesk (branded as "Bunkly" in the sidebar)
- **Package name**: `bunkly` (in package.json)
- **Purpose**: Visual bed management system for small independent hostels (hostel PMS)
- **Deployed on**: Google AI Studio (app ID: `08315f93-cd37-4728-9367-a4a80c6a32b1`)
- **Runtime**: Browser-only SPA — no backend server, all state in localStorage

## Commands

```bash
npm install              # Install dependencies
npm run dev              # Dev server on port 3000 (binds to 0.0.0.0)
npm run build            # Production build to dist/
npm run lint             # TypeScript type-checking (tsc --noEmit)
npm run clean            # Remove dist/
```

Environment: copy `.env.example` to `.env.local` and set `GEMINI_API_KEY` for the AI Copilot features.

## Tech Stack

- **React 19** with TypeScript 5.8 (strict-ish, `allowJs: true`, `jsx: "react-jsx"`)
- **Vite 6** with `@vitejs/plugin-react` and `@tailwindcss/vite` (Tailwind CSS v4)
- **shadcn/ui** (base-nova style, neutral base color) — UI primitives in `components/ui/`
- **@dnd-kit** for drag-and-drop (used in BedBoard and CalendarView)
- **motion** (framer-motion) for animations via `AnimatePresence` / `motion.div`
- **date-fns** for all date manipulation
- **@google/genai** for Gemini AI integration (Copilot features)
- **lucide-react** for icons
- **class-variance-authority + clsx + tailwind-merge** for component styling
- Path alias: `@/*` maps to `./*` (project root)

## Architecture

### Context hierarchy (outer to inner)

```
I18nProvider → StaffProvider → HostelProvider → AppContent
```

- **I18nContext** (`src/i18nContext.tsx`): Translations in `en` and `zh` (Chinese default). Use `useTranslation()` for the `t()` function. Translations are a single large nested object.
- **StaffContext** (`src/StaffContext.tsx`): Authentication (staff list, login by staff ID + PIN, logout), role-based tab visibility. Three roles: `manager`, `reception`, `cleaning` — each sees a different subset of sidebar tabs defined in `ROLE_TABS`.
- **HostelContext** (`src/HostelContext.tsx`): The central data store. Holds **rooms** (with nested beds and guests), **arrivals** (unassigned guests), **shiftNotes**, **tasks**, **activities**, **groupBookings**, **referrals**, **hostelPage**, **promotions**, **guestProfiles**, and **occupancyActions**. All state is loaded from localStorage on mount and persisted with a 300ms debounce. Keys are prefixed `bunkdesk_`.

### Tab-based navigation

`AppContent` renders a sidebar + tab panel. The `activeTab` state drives which component renders:

| Tab ID | Component | Description |
|--------|-----------|-------------|
| `dashboard` | CopilotPanel | AI-powered daily ops overview |
| `bedboard` | BedBoard | Visual drag-and-drop bed grid with filters |
| `calendar` | CalendarView | Gantt-like timeline with DnD booking blocks |
| `checkin` | CheckInPanel | Guest check-in workflow |
| `shiftlog` | ShiftLog | Shift handover notes |
| `staff` | StaffPanel | Staff management |
| `grow` | GrowPanel | Growth hub (hostel page, CRM, social, referral, pricing, occupancy) |
| `migrate` | MigrationHub | CSV/iCal import from other PMS |

### Data model (`src/types.ts`)

Core entities form a tree: **Room** → **Bed** → **Guest**. A bed has one `guest` (currently occupying) and optionally multiple `reservations` (future bookings). Other first-class entities: **ShiftNote**, **Task** (with comments), **Activity** (with participants), **GroupBooking**, **Referral**, **HostelPage**, **Promotion**, **GuestProfile** (CRM), **OccupancyAction**.

Bed statuses: `empty`, `occupied`, `cleaning`, `reserved`, `late-arrival`.

### Utility engines (`src/utils/`)

These are pure functions that operate on the data model, consumed by HostelContext or components:

- **`bedAllocator.ts`**: Auto-assignment scoring engine. Ranks beds by: fill-existing room (40%), gender match (30%), room preference match (20%), fragmentation avoidance (10%). Gender is a hard constraint (male → female dorm blocked).
- **`bedPricing.ts`**: Price calculation (base + bottom bunk premium).
- **`bedRules.ts`**: Gender constraint check and date range overlap utility.
- **`occupancyEngine.ts`**: Forward-looking availability calculation and occupancy action generation (long-stay discount, guest recall, last-minute deal, room type conversion).
- **`copilotEngine.ts`**: Today summary + week forecast + opportunity/risk insight generation.
- **`guestCrmEngine.ts`**: Guest profile building from stays, auto-tagging, recall candidate detection, profile sync.
- **`guestDisplay.tsx`**: Source config and payment status CSS helpers.
- **`icalParser.ts`**: iCal feed parsing for import.

### localStorage keys

All data is stored under `bunkdesk_<key>`:
`rooms`, `arrivals`, `shiftNotes`, `tasks`, `activities`, `groupBookings`, `referrals`, `hostelPage`, `promotions`, `guestProfiles`, `occupancyActions`, `staffList`

### Styling conventions

- Tailwind CSS v4 with `@tailwindcss/vite` plugin (no PostCSS config needed)
- Colors use zinc/gray palette with `#F7F7F7` page background
- `lib/utils.ts` exports `cn()` for merging Tailwind classes
- Scrollbars hidden via `[scrollbar-width:none]` and `[&::-webkit-scrollbar]:hidden`

## Key patterns

- **No routing library** — navigation is tab-based via React state (`activeTab`)
- **No API calls** — everything is client-side. The only external calls are to Gemini API (via `@google/genai`) and iCal URL fetching
- **Crypto.randomUUID()** for all ID generation (not a UUID library)
- **Auto-generated shift notes**: HostelContext's `addAutoNote()` fires on check-in, check-out, cleaning, and task completion — these appear in the ShiftLog marked as `autoGenerated: true`
- **Drag and drop**: CalendarView uses @dnd-kit for resizing/reordering booking blocks; BedBoard uses it for bed-to-bed guest moves
- **Landing page**: First-time visitors see `LandingPage` (marketing site). After clicking "Enter App", `showLanding` state flips to false and the auth flow begins
