# Raksa MVP for Olle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working Raksa app with Olle's real project data (Kesämökki Metsämäenranta), category-level hour tracking, and deploy to Vercel so he can open it on his phone.

**Architecture:** Existing Next.js 16 + Supabase app with working UI shells. Main changes: (1) seed real project data via Supabase REST API, (2) add `budget_category_id` to time_entries for category-level hour tracking, (3) update TimeTab and worker clock-in to support category selection, (4) add viite/reference field to costs, (5) deploy to Vercel.

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS v4, shadcn/ui, Supabase (REST API — no direct Postgres), Recharts

**Supabase access:** All DB operations via REST API or Supabase SQL Editor (corporate firewall blocks direct Postgres). Service role key in `.env.local`.

**Existing state:** DB migration already run. 3 demo projects + 28 demo costs + demo time entries exist. Need to add Olle's real project alongside or replace demo data.

---

## File Map

### Files to Modify
| File | Change |
|------|--------|
| `src/lib/types.ts` | Add `budget_category_id` to `TimeEntry`, add `reference` to `Cost` |
| `src/components/project/time-tab.tsx` | Show budget category per time entry, group hours by category |
| `src/app/worker/page.tsx` | Add budget category selector to clock-in flow |
| `src/components/project/costs-tab.tsx` | Add viite/reference field to cost form and table |
| `src/app/dashboard/costs/page.tsx` | Show reference column in global costs table |

### No New Files Needed
All changes are modifications to existing files + DB operations via Supabase REST API.

---

## Task 1: Seed Olle's Real Project

**Context:** Add "Kesämökki Metsämäenranta" with 5 budget categories via Supabase REST API. No code changes needed — just API calls.

- [ ] **Step 1: Insert the project**

```bash
curl -s -X POST "https://ccmpbrbpdgfinouhrkkb.supabase.co/rest/v1/projects" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  --data-raw '{
    "organization_id": "00000000-0000-0000-0000-000000000001",
    "name": "Kesamokki Metsamaenranta",
    "code": "MOK-001",
    "client": "Olle",
    "total_budget": 500000,
    "start_date": "2026-03-01",
    "status": "käynnissä",
    "description": "Kesamokin rakennus. Budjetti 500k. Perustukset, runko+katto, ikkunat+ovet, ulkovuoraus+terassi, sisatyo."
  }'
```
Save the returned `id` for the next step.

- [ ] **Step 2: Insert 5 budget categories**

Using the project ID from step 1, insert categories:

```bash
# Run 5 inserts with sort_order 1-5:
# 1. Perustukset — 100000
# 2. Runkotyö + katto — 100000
# 3. Ikkuna & ovi — 50000
# 4. Ulkovuoraus + terassi — 150000
# 5. Sisätyö — 100000
```

- [ ] **Step 3: Verify in browser**

Navigate to dashboard, confirm "Kesämökki Metsämäenranta" appears with 0% budget used and MOK-001 code. Click into it, confirm all 5 categories show in budget tab.

---

## Task 2: Add Category-Level Hour Tracking (Schema)

**Context:** Currently `time_entries` only links to `project_id`. Olle wants to see hours per budget category (e.g., "Perustukset: 120h, Runkotyö: 80h"). Add `budget_category_id` FK to `time_entries`.

**Files:**
- Modify: `src/lib/types.ts:69-83`

- [ ] **Step 1: Add column via Supabase SQL Editor or REST API**

```sql
ALTER TABLE public.time_entries
  ADD COLUMN budget_category_id uuid REFERENCES public.budget_categories(id) ON DELETE SET NULL;
```

- [ ] **Step 2: Update TypeScript types**

In `src/lib/types.ts`, add to `TimeEntry` interface:

```typescript
export interface TimeEntry {
  id: string;
  project_id: string;
  user_id: string;
  budget_category_id: string | null;  // NEW
  clock_in: string;
  clock_out: string | null;
  break_minutes: number;
  description: string | null;
  is_approved: boolean;
  approved_by: string | null;
  created_at: string;
  // Joined fields
  project?: Project;
  user?: Profile;
  budget_category?: BudgetCategory;  // NEW
}
```

- [ ] **Step 3: Verify build**

```bash
cd raksa-app && npm run build
```

Should compile without errors (new field is nullable, no breaking changes).

---

## Task 3: Add Category Selector to Worker Clock-In

**Context:** When a worker clocks in, they currently select only a project. Add a second dropdown for budget category so hours are tracked per category.

**Files:**
- Modify: `src/app/worker/page.tsx`

- [ ] **Step 1: Fetch budget categories for selected project**

After `projects` state, add:
```typescript
const [categories, setCategories] = useState<BudgetCategory[]>([]);
const [selectedCategoryId, setSelectedCategoryId] = useState("");
```

In `loadData`, after fetching projects, fetch categories for selected project:
```typescript
if (selectedProjectId) {
  const { data: catData } = await supabase
    .from("budget_categories")
    .select("*")
    .eq("project_id", selectedProjectId)
    .order("sort_order");
  if (catData) setCategories(catData);
}
```

- [ ] **Step 2: Add category dropdown to UI**

After the project `<select>`, add a second `<select>` for category:
```tsx
<label htmlFor="category-select" className="mb-2 block text-sm font-medium text-foreground">
  Työvaihe
</label>
<select
  id="category-select"
  value={selectedCategoryId}
  onChange={(e) => setSelectedCategoryId(e.target.value)}
  disabled={isClockedIn}
  className="w-full rounded-lg border border-input bg-white px-4 py-3 text-base text-foreground shadow-sm"
>
  <option value="">Ei valittu</option>
  {categories.map((c) => (
    <option key={c.id} value={c.id}>{c.name}</option>
  ))}
</select>
```

- [ ] **Step 3: Include category in clock-in insert**

In `handleClockIn`, add `budget_category_id` to the insert:
```typescript
.insert({
  project_id: selectedProjectId,
  user_id: user.id,
  clock_in: new Date().toISOString(),
  break_minutes: 0,
  budget_category_id: selectedCategoryId || null,  // NEW
})
```

- [ ] **Step 4: Reload categories when project changes**

Add `useEffect` to refetch categories when `selectedProjectId` changes:
```typescript
useEffect(() => {
  if (!selectedProjectId) { setCategories([]); return; }
  const supabase = createClient();
  supabase
    .from("budget_categories")
    .select("*")
    .eq("project_id", selectedProjectId)
    .order("sort_order")
    .then(({ data }) => {
      setCategories(data || []);
      setSelectedCategoryId("");
    });
}, [selectedProjectId]);
```

- [ ] **Step 5: Test in browser**

Navigate to worker view, select Kesämökki project, verify 5 categories appear in dropdown. Clock in with "Perustukset" selected, verify entry is created.

---

## Task 4: Show Hours Per Category in TimeTab

**Context:** The project detail TimeTab currently shows a flat list of time entries. Add a summary showing hours grouped by budget category.

**Files:**
- Modify: `src/components/project/time-tab.tsx`
- Modify: `src/app/dashboard/projects/[id]/page.tsx` (pass categories to TimeTab)

- [ ] **Step 1: Update TimeTab props and data fetching**

In `[id]/page.tsx`, update the time_entries query to include budget_category:
```typescript
const { data: timeEntries } = await supabase
  .from("time_entries")
  .select("*, user:profiles(full_name), budget_category:budget_categories(name)")
  .eq("project_id", id)
  .order("clock_in", { ascending: false })
  .limit(50);
```

Pass categories to TimeTab:
```tsx
<TimeTab projectId={id} entries={timeEntries || []} categories={categories || []} />
```

- [ ] **Step 2: Add category summary to TimeTab**

Update TimeTabProps to accept categories. Before the table, add a summary card:
```tsx
// Group hours by category
const hoursByCategory = entries.reduce((acc, e) => {
  if (!e.clock_out) return acc;
  const catName = (e as any).budget_category?.name || "Ei kategoriaa";
  const ms = new Date(e.clock_out).getTime() - new Date(e.clock_in).getTime();
  const hours = (ms / 1000 / 60 - e.break_minutes) / 60;
  acc[catName] = (acc[catName] || 0) + hours;
  return acc;
}, {} as Record<string, number>);
```

Render as a grid of cards above the table.

- [ ] **Step 3: Add category column to time entries table**

Add `Työvaihe` column header and cell showing `budget_category?.name`.

- [ ] **Step 4: Test in browser**

Navigate to Kesämökki project → Tunnit tab. Should show category summary + category column in table.

---

## Task 5: Add Reference/Viite Field to Costs

**Context:** Olle wants invoices linked to projects by reference number (viite/märke). Add a `reference` text field to costs.

**Files:**
- Modify: `src/lib/types.ts` (Cost interface)
- Modify: `src/components/project/costs-tab.tsx` (form + table)
- Modify: `src/app/dashboard/costs/page.tsx` (global costs table)

- [ ] **Step 1: Add column to DB**

```sql
ALTER TABLE public.costs ADD COLUMN reference text;
```

- [ ] **Step 2: Update TypeScript types**

Add `reference: string | null;` to `Cost` interface in `types.ts`.

- [ ] **Step 3: Add reference field to cost entry form**

In `costs-tab.tsx`, add a field after vendor:
```tsx
<div className="space-y-2">
  <Label>Viite / märke</Label>
  <Input name="reference" placeholder="esim. MOK-001-PER" />
</div>
```

Include in the insert: `reference: (form.get("reference") as string) || null,`

- [ ] **Step 4: Add reference column to project cost table**

Add `Viite` column between `Toimittaja` and `Summa`.

- [ ] **Step 5: Add reference column to global costs page**

In `src/app/dashboard/costs/page.tsx`, add `Viite` column.

- [ ] **Step 6: Test**

Add a cost with reference "MOK-001-PER", verify it shows in both project and global cost views.

---

## Task 6: Fix Finnish Encoding

**Context:** Project status "käynnissä" is garbled in the DB (UTF-8 encoding issue from seed data). The Olle project insert must use correct encoding.

- [ ] **Step 1: Verify Olle's project has correct status**

Query the project and check that `status` displays correctly. If garbled, update:
```sql
UPDATE public.projects SET status = 'käynnissä' WHERE code = 'MOK-001';
```

- [ ] **Step 2: Fix existing demo projects if needed**

```sql
UPDATE public.projects SET status = 'käynnissä' WHERE status != 'suunnittelu' AND status != 'valmis' AND status != 'keskeytetty';
```

---

## Task 7: Deploy to Vercel

**Context:** Get the app live so Olle can access it on his phone.

- [ ] **Step 1: Initialize git repo (if not already)**

```bash
cd raksa-app
git init
git add .
git commit -m "feat: Raksa MVP — construction project budget tracker"
```

- [ ] **Step 2: Create GitHub repo and push**

```bash
gh repo create Kris-97/raksa-app --private --source=. --push
```

- [ ] **Step 3: Deploy to Vercel**

```bash
npx vercel --yes
```

Set environment variables in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` (if available, for OCR)

- [ ] **Step 4: Verify production**

Open the Vercel URL, log in with `olle@raksa-test.fi` / `TestPassword123`, verify:
1. Dashboard shows Kesämökki project
2. Project detail shows 5 budget categories
3. Worker view shows category selector
4. Cost entry form has viite field

- [ ] **Step 5: Share URL with Olle**

Send the Vercel URL to Olle via the existing chat thread.

---

## Task Order & Dependencies

```
Task 1 (seed data) → can start immediately
Task 2 (schema) → can start immediately (parallel with Task 1)
Task 3 (worker clock-in) → depends on Task 2
Task 4 (TimeTab) → depends on Task 2
Task 5 (viite field) → can start immediately (parallel)
Task 6 (encoding fix) → can start immediately (parallel)
Task 7 (deploy) → depends on all above
```

**Parallelizable groups:**
- Group A: Tasks 1, 2, 5, 6 (all independent)
- Group B: Tasks 3, 4 (depend on Task 2)
- Group C: Task 7 (final)
