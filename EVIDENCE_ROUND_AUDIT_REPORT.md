# Evidence Round Filtering Audit Report
**Date**: November 18, 2025  
**Purpose**: Audit admin review queues and evidence galleries to confirm round filtering behavior is clear and consistent

---

## Executive Summary

This audit reveals **significant inconsistencies** in round filtering implementation across admin evidence components:

- ✅ **SchoolProfile Evidence Tab**: Excellent implementation with clear filtering and round display
- ⚠️ **EvidenceReviewQueue**: Has filtering but **NO round number display** on cards/table
- ❌ **EvidenceGalleryTab**: **NO round filtering** and **NO round display**
- ⚠️ **Type Definition Issue**: `PendingEvidence` type missing `roundNumber` field

---

## Detailed Component Analysis

### 1. EvidenceReviewQueue / ReviewsSection
**Location**: `client/src/components/admin/reviews/ReviewsSection.tsx` & `EvidenceReviewQueue.tsx`

#### Round Filtering Implementation
- ✅ **Has round filtering**: Yes
- **Filter Location**: Advanced Filters (collapsible section, lines 828-848 in EvidenceReviewQueue.tsx)
- **Filter State**: `evidenceRoundFilter` (string, default: 'all')
- **Filter Options**: "All Rounds", "Round 1", "Round 2", "Round 3", "Round 4", "Round 5"
- **API Integration**: Properly sends `roundNumber` parameter to `/api/admin/evidence` endpoint (line 110 in ReviewsSection.tsx)

```typescript
// From ReviewsSection.tsx
if (evidenceRoundFilter && evidenceRoundFilter !== 'all') {
  params.append('roundNumber', evidenceRoundFilter);
}
```

#### UI Visibility
- ⚠️ **Filter Visibility**: Hidden in collapsible "Advanced Filters" section
  - Not immediately visible to users
  - Requires clicking "Advanced Filters" button to access
  - Grouped with Country, Visibility, and Date Range filters

#### Round Number Display on Cards
- ❌ **Card View**: Round numbers NOT displayed (lines 956-1098)
  - Shows: title, stage badge, status badge, visibility badge, photo consent status
  - Missing: round number badge
  
- ❌ **Table View**: Round numbers NOT displayed (lines 336-482)
  - Columns: Preview, School, Stage, Title, Status, Submitted Date, Assigned To, Actions
  - Missing: Round number column

#### Active Filters Counter
- ✅ Round filter IS included in `activeFiltersCount` calculation (line 299)
- Shows "Clear X filters" button when round filter is active

---

### 2. EvidenceGalleryTab
**Location**: `client/src/components/admin/EvidenceGalleryTab.tsx`

#### Round Filtering Implementation
- ❌ **Has round filtering**: NO
- **Filter State**: Only includes `status`, `stage`, `country`, `visibility`, `evidenceRequirementId` (lines 42-48)
- **Missing**: No `roundFilter` state variable
- **API Query**: Does NOT send `roundNumber` parameter (lines 60-66)

```typescript
// Current filters - NO roundNumber
const params = new URLSearchParams();
if (filters.status) params.append('status', filters.status);
if (filters.stage) params.append('stage', filters.stage);
if (filters.country) params.append('country', filters.country);
if (filters.visibility) params.append('visibility', filters.visibility);
if (filters.evidenceRequirementId) params.append('evidenceRequirementId', filters.evidenceRequirementId);
```

#### Round Number Display on Cards
- ❌ **Not displayed**: Round numbers are NOT shown on evidence cards (lines 346-480)
  - Shows: thumbnail, title, school name, country, stage badge, status badge, visibility badge, permission status
  - Missing: round number badge

#### UI Filters Section
- **Visible Filters** (lines 210-322):
  1. Stage (Select dropdown)
  2. Step/Requirement (Select dropdown, depends on stage)
  3. Country (Select dropdown)
  4. Status (Select dropdown)
  5. Visibility (Select dropdown)
  6. Clear Filters button
  
- **Missing**: Round filter dropdown

---

### 3. SchoolProfile Evidence Tab ✅ BEST PRACTICE EXAMPLE
**Location**: `client/src/pages/SchoolProfile.tsx` (lines 1070-1267)

#### Round Filtering Implementation
- ✅ **Has round filtering**: YES
- **Filter State**: `roundFilter` (string, passed as prop)
- **Filter Location**: Primary filters bar (prominently displayed, line 1123-1135)
- **Filter Options**: "All Rounds" + dynamically generated from available rounds
- **API Integration**: Properly filters via query parameter (lines 179-189)

```typescript
const url = roundFilter === 'all' 
  ? `/api/admin/schools/${id}/evidence`
  : `/api/admin/schools/${id}/evidence?roundNumber=${roundFilter}`;
```

#### Round Number Display on Cards
- ✅ **Prominently Displayed**: Round badge on every card (lines 1196-1202)

```tsx
<Badge 
  variant="outline" 
  className="border-navy text-navy bg-blue-50"
  data-testid={`badge-round-${ev.id}`}
>
  Round {ev.roundNumber}
</Badge>
```

#### UI Clarity
- ✅ **Clear header text** showing current filter state (lines 1105-1110):
  ```tsx
  {roundFilter === 'all' ? (
    <>Showing all rounds ({evidence.length} total)</>
  ) : (
    <>Showing Round {roundFilter} ({filteredEvidence.length} of {evidence.length} total)</>
  )}
  ```

---

### 4. SchoolQuickViewDialog
**Location**: `client/src/components/admin/SchoolQuickViewDialog.tsx`

#### Round Filtering Implementation
- ✅ **Has round filtering**: YES
- **Filter Options**: "All", "Current Round", dynamic rounds
- **API Integration**: Properly includes `roundNumber` in query (line 123)

#### Round Number Display
- ✅ **Displayed**: Shows round badge on evidence cards (line 960)
  ```tsx
  <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" 
         data-testid={`badge-evidence-round-${evidence.id}`}>
    Round {evidence.roundNumber || 1}
  </Badge>
  ```

---

## Type Definition Issues

### PendingEvidence Type
**Location**: `client/src/components/admin/shared/types.ts` (lines 11-33)

#### Current Definition
```typescript
export interface PendingEvidence {
  id: string;
  title: string;
  description: string;
  stage: string;
  status: string;
  visibility: string;
  submittedAt: string;
  schoolId: string;
  submittedBy: string;
  assignedTo: string | null;
  files: any[];
  videoLinks: string | null;
  school?: {
    id: string;
    name: string;
    country: string;
    photoConsent?: {
      status: 'pending' | 'approved' | 'rejected' | null;
      documentUrl: string | null;
    } | null;
  };
}
```

#### Issue
- ❌ **Missing Field**: `roundNumber: number` is NOT defined
- This causes TypeScript errors when trying to access `evidence.roundNumber`
- Backend data DOES include `roundNumber` field

---

## Consistency Analysis

### What Works Well ✅
1. **SchoolProfile Evidence Tab**:
   - Clear round filtering in primary UI
   - Round numbers prominently displayed
   - Clear text indicating which rounds are shown
   - Proper API integration

2. **SchoolQuickViewDialog**:
   - Has round filtering
   - Displays round numbers
   - Good UX

3. **API/Backend**:
   - All endpoints properly support `roundNumber` filtering
   - Data includes round numbers

### Critical Issues ❌

#### Issue #1: No Round Display in EvidenceReviewQueue
**Impact**: HIGH  
**Components**: EvidenceReviewQueue (Card & Table views)

Admins reviewing evidence cannot see which round the evidence belongs to. This is problematic because:
- Evidence from different rounds may have different requirements
- Schools can be in different rounds simultaneously
- No visual indicator of round number makes it impossible to verify round-specific submissions

**Example**: An admin filtering for "Round 2" evidence sees cards but has no visual confirmation that the displayed evidence is actually from Round 2.

#### Issue #2: No Round Filtering in EvidenceGalleryTab
**Impact**: HIGH  
**Components**: EvidenceGalleryTab

The evidence gallery mixes evidence from all rounds with no way to filter:
- Cannot focus on current round evidence
- Cannot compare evidence across specific rounds
- Difficult to manage evidence from multi-round schools

#### Issue #3: Round Filter Hidden in Advanced Filters
**Impact**: MEDIUM  
**Components**: EvidenceReviewQueue

Round filtering is buried in a collapsible "Advanced Filters" section:
- Not discoverable by users
- Requires extra clicks to access
- Treated as secondary filter when it's critical for multi-round programs

#### Issue #4: Missing TypeScript Type
**Impact**: MEDIUM  
**Components**: All components using PendingEvidence type

The `roundNumber` field is missing from the `PendingEvidence` type definition:
- Type safety compromised
- Potential runtime errors
- Inconsistent with actual API data

---

## Comparison with Recent Fixes

### Recent Work (from SCHOOL_PROFILE_EVIDENCE_ROUND_AUDIT.md)
The SchoolProfile page was recently audited and found to have:
- ✅ Round filtering implemented
- ✅ Round numbers displayed on cards
- ✅ Clear UI showing which rounds are displayed

### Current Findings
The admin review components have NOT received the same treatment:
- ⚠️ EvidenceReviewQueue has filtering but NO display
- ❌ EvidenceGalleryTab has neither filtering NOR display

**Conclusion**: The recent fixes to SchoolProfile demonstrate the correct pattern, but these improvements have not been applied consistently across all evidence display components.

---

## Recommendations

### Priority 1: CRITICAL (Must Fix)
1. **Add round number display to EvidenceReviewQueue cards**
   - Add round badge similar to SchoolProfile implementation
   - Show badge next to stage/status badges
   - Include in both card and table views

2. **Add round number column to EvidenceReviewQueue table view**
   - Insert column between "Stage" and "Title"
   - Display "Round X" badge
   - Allow sorting by round number

3. **Fix PendingEvidence type definition**
   - Add `roundNumber: number` field
   - Ensures type safety

### Priority 2: HIGH (Should Fix)
4. **Add round filtering to EvidenceGalleryTab**
   - Add round filter dropdown to filters section
   - Include in API query parameters
   - Update header text to show active round filter

5. **Promote round filter in EvidenceReviewQueue**
   - Move from "Advanced Filters" to primary filter bar
   - Place next to Stage/Requirement filters
   - Make it a first-class filter like Stage and Status

### Priority 3: MEDIUM (Nice to Have)
6. **Add round number display to EvidenceGalleryTab cards**
   - Include round badge on each card
   - Consistent with other components

7. **Standardize round badge styling**
   - Create consistent color scheme for round badges
   - Example: SchoolProfile uses `border-navy text-navy bg-blue-50`
   - Apply same styling across all components

8. **Add "showing round X" text to EvidenceReviewQueue**
   - Similar to SchoolProfile's clear header text
   - Shows "Showing Round X (Y items)" when round filter is active

---

## Implementation Notes

### For EvidenceReviewQueue Card View
Add round badge in the badges section (around line 980-1020):

```tsx
<div className="flex items-center gap-2 mb-2">
  <h3 className="font-semibold text-navy">{evidence.title}</h3>
  
  {/* ADD THIS: Round badge */}
  <Badge variant="outline" className="border-navy text-navy bg-blue-50">
    Round {evidence.roundNumber || 1}
  </Badge>
  
  <Badge className={getStageColor(evidence.stage)}>
    {evidence.stage}
  </Badge>
  {/* ... other badges ... */}
</div>
```

### For EvidenceReviewQueue Table View
Add round column (around line 350):

```tsx
<TableHead>Round</TableHead>

{/* In table body: */}
<TableCell>
  <Badge variant="outline" className="border-navy text-navy bg-blue-50">
    Round {item.roundNumber || 1}
  </Badge>
</TableCell>
```

### For EvidenceGalleryTab
Add round filter (around line 210-320):

```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Round</label>
  <Select 
    value={filters.roundNumber || 'all'} 
    onValueChange={(value) => setFilters(prev => ({ 
      ...prev, 
      roundNumber: value === 'all' ? '' : value 
    }))}
  >
    <SelectTrigger data-testid="select-round-filter">
      <SelectValue placeholder="All Rounds" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Rounds</SelectItem>
      <SelectItem value="1">Round 1</SelectItem>
      <SelectItem value="2">Round 2</SelectItem>
      <SelectItem value="3">Round 3</SelectItem>
      <SelectItem value="4">Round 4</SelectItem>
      <SelectItem value="5">Round 5</SelectItem>
    </SelectContent>
  </Select>
</div>
```

---

## Summary Table

| Component | Round Filter? | Filter Visibility | Round Display | Consistency with SchoolProfile |
|-----------|--------------|-------------------|---------------|-------------------------------|
| **EvidenceReviewQueue** | ✅ Yes | ⚠️ Hidden (Advanced) | ❌ No | ❌ Inconsistent |
| **EvidenceGalleryTab** | ❌ No | N/A | ❌ No | ❌ Inconsistent |
| **SchoolProfile** | ✅ Yes | ✅ Primary UI | ✅ Yes | ✅ **Reference Implementation** |
| **SchoolQuickViewDialog** | ✅ Yes | ✅ Visible | ✅ Yes | ✅ Consistent |

---

## Conclusion

The audit reveals **significant inconsistencies** in how round filtering and display are handled across admin evidence components:

1. **EvidenceReviewQueue**: Has filtering capability but critically lacks round number display, making it impossible for admins to verify which round evidence belongs to
2. **EvidenceGalleryTab**: Completely missing round filtering and display functionality
3. **Type Definitions**: `PendingEvidence` type missing `roundNumber` field

**Best Practice Reference**: The **SchoolProfile Evidence Tab** demonstrates the correct implementation pattern and should be used as the reference for fixing other components.

**Recommended Action**: Implement Priority 1 and Priority 2 fixes to bring all admin evidence components to feature parity with SchoolProfile's implementation.
