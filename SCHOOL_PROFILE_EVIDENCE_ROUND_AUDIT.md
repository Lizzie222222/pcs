# School Profile Evidence Round Filtering Audit Report

**Date:** November 18, 2025  
**File Audited:** `client/src/pages/SchoolProfile.tsx`  
**Focus:** Evidence query and round filtering behavior

---

## Executive Summary

The SchoolProfile.tsx component has **incomplete round filtering implementation** for evidence. While the backend returns `roundNumber` for all evidence items, the frontend:
1. Does NOT filter evidence by round
2. Does NOT display round information to users
3. Has a type mismatch (Evidence interface missing `roundNumber` field)
4. Is inconsistent with other components that properly handle rounds

**Recommendation:** **FIX NEEDED** - Add round filtering and display capabilities

---

## Investigation Findings

### 1. Evidence Query Analysis (Lines 176-183)

**Query Implementation:**
```typescript
const { data: evidence = [], isLoading: evidenceLoading } = useQuery<Evidence[]>({
  queryKey: ['/api/admin/schools', id, 'evidence'],
  queryFn: async () => {
    const response = await fetch(`/api/admin/schools/${id}/evidence`, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch evidence');
    return response.json();
  },
  enabled: !!id && activeTab === 'evidence',
});
```

**Backend Endpoint:** `/api/admin/schools/:id/evidence` (server/routes.ts line 7055-7061)
```typescript
const evidence = await storage.getSchoolEvidence(schoolId);
res.json(evidence);
```

**Backend Storage Query:** `server/features/schools/storage.ts` (lines 701-738)
- Returns ALL evidence for the school
- **Does NOT filter by roundNumber**
- **DOES include roundNumber in response** (line 722: `roundNumber: evidence.roundNumber`)
- Returns evidence from all rounds, ordered by submission date (most recent first)

**Finding:** ❌ **No round filtering** - fetches and displays all evidence from all rounds

---

### 2. Type Definition Issues

**Frontend Interface** (Lines 94-109):
```typescript
interface Evidence {
  id: string;
  schoolId: string;
  title: string;
  description: string;
  stage: string;
  status: string;
  visibility: string;
  submittedAt: string;
  submittedBy: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  files: any[];
  videoLinks: string | null;
  // ❌ roundNumber is MISSING
}
```

**Database Schema** (`shared/schema.ts` line 416):
```typescript
roundNumber: integer("round_number").default(1),
```

**Backend Returns** (`server/features/schools/storage.ts` line 722):
```typescript
roundNumber: evidence.roundNumber,
```

**Finding:** ❌ **Type mismatch** - Backend returns `roundNumber` but frontend interface doesn't declare it

---

### 3. UI Display Analysis

**Evidence Card Display** (Lines 1136-1186):

**Currently Shows:**
- Title
- Visibility badge (Public/Private)
- Stage badge (Inspire/Investigate/Act)
- Status badge (Pending/Approved/Rejected)
- Submission date
- Description

**Does NOT Show:**
- ❌ Round number badge
- ❌ Any round indicator
- ❌ Which round the evidence belongs to

**Example from code:**
```typescript
<div className="flex items-center gap-2 flex-wrap">
  <Badge className={...}>{ev.stage}</Badge>
  <Badge className={...}>{ev.status}</Badge>
  <span className="text-sm text-gray-600">
    {format(new Date(ev.submittedAt), 'dd/MM/yyyy HH:mm')}
  </span>
  {/* ❌ No round badge here */}
</div>
```

**Finding:** ❌ **No round information displayed** to users

---

### 4. Filtering Capabilities

**Current Filters** (Lines 1068-1077):
```typescript
const [filterStatus, setFilterStatus] = useState<string>('all');
const [filterStage, setFilterStage] = useState<string>('all');

const filteredEvidence = evidence.filter(e => {
  if (filterStatus !== 'all' && e.status !== filterStatus) return false;
  if (filterStage !== 'all' && e.stage !== filterStage) return false;
  return true;
});
```

**Available Filters:**
- ✅ Status filter (All/Pending/Approved/Rejected)
- ✅ Stage filter (All/Inspire/Investigate/Act/Above and Beyond)
- ❌ Round filter (NOT IMPLEMENTED)

**Finding:** ❌ **No round selector or filter** - Users cannot filter evidence by round

---

### 5. Comparison with Other Components

#### ✅ **AuditsTab** (Same file, properly handles rounds):
- Lines 1755, 1779, 1793, 1897, 2004, 2039 all display round numbers
- Shows "Round X" badges
- Displays trend across rounds
- Properly includes `roundNumber` in interface (line 116)

#### ✅ **EvidenceReviewQueue** (`client/src/components/admin/reviews/EvidenceReviewQueue.tsx`):
- Has `evidenceRoundFilter` state (lines 132-133)
- Includes round filtering capability
- Counts active round filters (line 299)

#### ✅ **EvidenceGalleryTab** (`client/src/components/admin/EvidenceGalleryTab.tsx`):
- Query key includes round number parameters
- Supports round filtering

#### ✅ **Dashboard Evidence** (`server/routes.ts` lines 2524-2535):
```typescript
const recentEvidenceWithRounds = evidence.slice(0, 10).map(ev => ({
  // ...
  roundNumber: ev.roundNumber || 1, // Include round number
  // ...
}));
```

**Finding:** 🔴 **Inconsistency** - Other components properly handle rounds, but SchoolProfile doesn't

---

### 6. Backend Evidence Counts (Revealing Inconsistency)

**getSchoolEvidenceCounts** (`server/features/schools/storage.ts` lines 759-798):
```typescript
// Use provided roundNumber or fall back to school's current round
const currentRound = roundNumber ?? school.currentRound ?? 1;

const allEvidence = await db
  .select()
  .from(evidence)
  .where(
    and(
      eq(evidence.schoolId, schoolId),
      eq(evidence.roundNumber, currentRound) // ⚠️ Filters by round!
    )
  );
```

**Finding:** 🔴 **Critical Inconsistency** - Progress counting filters by current round, but evidence display shows all rounds

This creates a mismatch where:
- Progress tracking counts evidence from Round 2 only
- Evidence display shows evidence from Rounds 1, 2, 3, etc. all mixed together
- Users see evidence that isn't being counted toward their current progress

---

## Current Behavior Summary

### What Happens Now:
1. ❌ Evidence query fetches ALL evidence from ALL rounds (no filtering)
2. ❌ All rounds are mixed together in the display
3. ❌ No visual indicator showing which round each evidence belongs to
4. ❌ No way to filter/view specific rounds
5. ❌ Type definition doesn't match backend data (missing roundNumber)
6. ❌ Creates confusion - evidence from Round 1 appears alongside Round 2, but only Round 2 counts toward progress

### Example Scenario:
**School is in Round 2:**
- Evidence tab shows: 15 items (8 from Round 1, 7 from Round 2)
- Progress calculation uses: Only 7 items (Round 2)
- User sees: All 15 items mixed together with no distinction
- **Result:** Confusing - why are some items not counting?

---

## Expected Behavior

### Two Reasonable Approaches:

#### Option A: **Show All Rounds (Historical View)** ✅ Better for school profile
- Display ALL evidence from all rounds
- **BUT** add round badges/indicators to each item
- Add optional round filter to narrow view
- Useful for admins reviewing complete school history
- Aligns with profile page being a comprehensive view

#### Option B: **Show Current Round Only** 
- Filter to school's currentRound by default
- Add "View All Rounds" toggle/filter
- Matches progress tracking behavior
- Simpler, less overwhelming

### Recommended Approach: **Option A**

**Rationale:**
1. School profile is an admin/comprehensive view (not student-facing)
2. Admins need to see historical evidence for review/audit purposes
3. Matches the behavior of showing all teachers, all audits (with round indicators)
4. Evidence from previous rounds is still relevant (approved evidence stays approved)
5. Just needs proper labeling to avoid confusion

**Required Changes:**
1. ✅ Add `roundNumber: number` to Evidence interface
2. ✅ Display round badge on each evidence card (e.g., "Round 2")
3. ✅ Add round filter dropdown (All Rounds / Round 1 / Round 2 / etc.)
4. ✅ Consider adding round count summary (e.g., "5 items from Round 1, 7 from Round 2")

---

## Recommendation: FIX NEEDED

### Issues to Address:

1. **🔴 CRITICAL: Type Mismatch**
   - Add `roundNumber: number` to Evidence interface
   - This is causing silent data loss (roundNumber exists but TypeScript doesn't know)

2. **🔴 HIGH: Missing Round Indicators**
   - Add round badge to evidence cards
   - Users cannot tell which round evidence belongs to
   - Creates confusion about what counts toward current progress

3. **🟡 MEDIUM: Missing Round Filter**
   - Add round filter dropdown
   - Allow filtering to specific rounds or "All Rounds"
   - Improves usability when schools have multiple rounds

4. **🟡 MEDIUM: Inconsistent with Other Components**
   - AuditsTab properly shows rounds
   - Other evidence components have round filtering
   - SchoolProfile should match this pattern

5. **🟢 LOW: Backend Query Enhancement (Optional)**
   - Consider adding optional `roundNumber` query parameter to endpoint
   - Currently frontend filters client-side (acceptable for now)

---

## Implementation Priority

### Phase 1 (Must Fix):
1. Add `roundNumber` to Evidence interface
2. Display round badge on evidence cards
3. Test that roundNumber is properly received from backend

### Phase 2 (Should Add):
4. Add round filter dropdown
5. Add round count summary
6. Update tests to verify round handling

### Phase 3 (Nice to Have):
7. Backend API parameter for round filtering
8. Round-based evidence statistics

---

## Code Location Reference

**File:** `client/src/pages/SchoolProfile.tsx`

**Key Lines:**
- Lines 94-109: Evidence interface (missing roundNumber)
- Lines 176-183: Evidence query (no round filtering)
- Lines 1063-1186: EvidenceTab component (no round UI)
- Lines 1068-1077: Filter logic (no round filter)
- Lines 1136-1186: Evidence card display (no round badge)

**Related Files:**
- `shared/schema.ts` line 416: roundNumber field definition
- `server/routes.ts` line 7055-7061: Evidence endpoint
- `server/features/schools/storage.ts` line 701-738: getSchoolEvidence query
- `server/features/schools/storage.ts` line 759-798: getSchoolEvidenceCounts (filters by round!)

---

## Conclusion

The SchoolProfile evidence display has **incomplete round implementation**. While the underlying data includes roundNumber and other components properly handle it, this component:
- Fetches evidence from all rounds without distinction
- Doesn't display round information
- Lacks filtering capabilities
- Has a type mismatch

This creates **user confusion** because evidence from previous rounds appears alongside current round evidence, but only current round evidence counts toward progress.

**The fix is straightforward:** Add roundNumber to the interface, display it as a badge, and add a round filter. This will align SchoolProfile with the rest of the application and eliminate user confusion.

---

**Status:** 🔴 **NEEDS FIXING** - Not intentional design, incomplete implementation  
**Impact:** Medium-High (causes confusion about progress tracking)  
**Effort:** Low-Medium (interface update + UI badge + filter dropdown)  
**Risk:** Low (non-breaking, purely additive)
