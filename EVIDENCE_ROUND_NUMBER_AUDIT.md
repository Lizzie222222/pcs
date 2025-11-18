# Evidence API Endpoints - roundNumber Parameter Audit

**Date**: November 18, 2025  
**Purpose**: Audit all evidence-related API endpoints for proper roundNumber parameter support  
**Status**: Analysis Complete - No Changes Made

---

## Executive Summary

**Findings Overview:**
- ✅ 2 endpoints correctly implement roundNumber filtering
- ❌ 1 endpoint missing critical roundNumber support
- 🤔 3 endpoints could benefit from optional roundNumber filtering
- ✅ 11 endpoints correctly do NOT need roundNumber (single-item operations)

**Critical Issue Identified:**
- `GET /api/admin/schools/:schoolId/evidence` returns evidence from ALL rounds, making it difficult to view round-specific evidence for a school

---

## Detailed Endpoint Analysis

### 1. GET /api/admin/schools/:schoolId/evidence
**File**: `server/features/schools/routes.ts:1246-1255`

**Current Implementation:**
```typescript
schoolsRouter.get('/api/admin/schools/:id/evidence', isAuthenticated, requireAdminOrPartner, async (req, res) => {
  const schoolId = req.params.id;
  const evidence = await storage.getSchoolEvidence(schoolId);
  res.json(evidence);
});
```

**Storage Method**: `server/features/schools/storage.ts:701-738`
```typescript
async getSchoolEvidence(schoolId: string): Promise<Array<Evidence & {...}>> {
  return await db
    .select({...})
    .from(evidence)
    .leftJoin(users, eq(evidence.reviewedBy, users.id))
    .where(eq(evidence.schoolId, schoolId))  // ❌ No roundNumber filter
    .orderBy(desc(evidence.submittedAt));
}
```

**Status**: ❌ **MISSING roundNumber SUPPORT**

**Current Behavior:**
- Returns ALL evidence for school across ALL rounds
- Includes roundNumber in response (line 722) but doesn't filter by it
- Makes it difficult to view evidence for a specific round

**Should Accept roundNumber?**: ✅ **YES - HIGH PRIORITY**

**Recommended Implementation:**
- Add optional `roundNumber` query parameter
- Pass to storage method as optional filter
- Filter SQL query: `eq(evidence.roundNumber, roundNumber)` when provided
- Default behavior (no param): Return all rounds (backward compatible)

**Impact of Adding:**
- ✅ No breaking changes (optional parameter)
- ✅ Enables round-specific evidence viewing
- ✅ Consistent with other evidence list endpoints

**Example Usage After Fix:**
```typescript
// Get evidence for school's current round only
GET /api/admin/schools/{schoolId}/evidence?roundNumber=2

// Get all evidence (existing behavior)
GET /api/admin/schools/{schoolId}/evidence
```

---

### 2. GET /api/evidence
**File**: `server/features/evidence/routes.ts:238-310`

**Current Implementation:**
```typescript
evidenceRouter.get('/', isAuthenticated, async (req: any, res) => {
  const { schoolId, status, visibility, requirePhotoConsent, roundNumber } = req.query;
  
  // Build filters
  const filters: any = { schoolId: targetSchoolId };
  if (status) filters.status = status as 'pending' | 'approved' | 'rejected';
  if (visibility) filters.visibility = visibility as 'public' | 'private';
  if (roundNumber) filters.roundNumber = parseInt(roundNumber as string, 10);  // ✅
  
  let evidence = await evidenceStorage.getAllEvidence(filters);
```

**Storage Filtering**: `server/features/evidence/storage.ts:159-160`
```typescript
if (filters?.roundNumber !== undefined) {
  conditions.push(eq(evidence.roundNumber, filters.roundNumber));
}
```

**Status**: ✅ **CORRECTLY IMPLEMENTED**

**Accepts roundNumber?**: ✅ YES (query parameter)  
**Implementation**: Query parameter → parseInt → filter object → SQL WHERE clause  
**Returns roundNumber?**: ✅ YES (line 292)  
**Filtering**: ✅ Properly filters via storage layer

**Consistency**: ✅ Follows standard pattern for optional filters

---

### 3. GET /api/admin/evidence
**File**: `server/features/evidence/routes.ts:701-729`

**Current Implementation:**
```typescript
adminEvidenceRouter.get('/', isAuthenticated, requireAdminOrPartner, async (req, res) => {
  const filters = {
    status: req.query.status as 'pending' | 'approved' | 'rejected' | undefined,
    stage: req.query.stage as 'inspire' | 'investigate' | 'act' | 'above_and_beyond' | undefined,
    schoolId: req.query.schoolId as string | undefined,
    country: req.query.country as string | undefined,
    visibility: req.query.visibility as 'public' | 'private' | undefined,
    assignedTo: req.query.assignedTo as string | undefined,
    evidenceRequirementId: req.query.evidenceRequirementId as string | undefined,
    search: req.query.search as string | undefined,
    sortBy: req.query.sortBy as 'newest' | 'oldest' | 'schoolName' | 'stage' | undefined,
    roundNumber: req.query.roundNumber ? parseInt(req.query.roundNumber as string) : undefined,  // ✅
    dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
    dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
  };
  
  const evidence = await evidenceStorage.getAdminEvidence(cleanFilters);
```

**Status**: ✅ **CORRECTLY IMPLEMENTED**

**Accepts roundNumber?**: ✅ YES (query parameter)  
**Implementation**: Query parameter → parseInt → filter object → storage layer  
**Filtering**: ✅ Properly implemented through evidenceStorage.getAdminEvidence()

**Consistency**: ✅ Part of comprehensive filter set alongside status, stage, schoolId, etc.

---

## Other Evidence Endpoints Analysis

### 4. POST /api/evidence (Submit Evidence)
**File**: `server/features/evidence/routes.ts:116-226`

**Implementation:**
```typescript
const evidenceData = insertEvidenceSchema.parse({
  ...req.body,
  submittedBy: userId,
  roundNumber: school.currentRound || 1,  // ✅ Auto-set from school
```

**Status**: ✅ **CORRECTLY IMPLEMENTED**

**Behavior**: Automatically sets roundNumber from school's currentRound  
**Needs Filter?**: ❌ NO (POST endpoint, creates new evidence)  
**Consistency**: ✅ Follows pattern of deriving roundNumber from school context

---

### 5. GET /api/evidence/:id (Single Evidence)
**File**: `server/features/evidence/routes.ts:84-102`

**Status**: ✅ **CORRECT AS-IS**

**Needs roundNumber Filter?**: ❌ NO  
**Reason**: Single item lookup by unique ID  
**Returns roundNumber?**: ✅ YES (in response object)

---

### 6. DELETE /api/evidence/:id
**File**: `server/features/evidence/routes.ts:322-374`

**Status**: ✅ **CORRECT AS-IS**

**Needs roundNumber Filter?**: ❌ NO  
**Reason**: Single item deletion by unique ID

---

### 7. PATCH /api/admin/evidence/:id (Update Metadata)
**File**: `server/features/evidence/routes.ts:648-689`

**Status**: ✅ **CORRECT AS-IS**

**Needs roundNumber Filter?**: ❌ NO  
**Reason**: Single item update by unique ID

---

### 8. PATCH /api/admin/evidence/:id/review (Approve/Reject)
**File**: `server/features/evidence/routes.ts:744-815`

**Status**: ✅ **CORRECT AS-IS**

**Needs roundNumber Filter?**: ❌ NO  
**Reason**: Single item review by unique ID

---

### 9. POST /api/admin/evidence/bulk-review
**File**: `server/features/evidence/routes.ts:828-916`

**Status**: ✅ **CORRECT AS-IS**

**Needs roundNumber Filter?**: ❌ NO  
**Reason**: Operates on specific evidence IDs provided in request body

---

### 10. GET /api/admin/evidence/pending
**File**: `server/features/evidence/routes.ts:924-932`

**Current Implementation:**
```typescript
adminEvidenceRouter.get('/pending', async (req, res) => {
  const evidence = await evidenceStorage.getPendingEvidence();
  res.json(evidence);
});
```

**Status**: 🤔 **COULD BENEFIT FROM FILTER**

**Accepts roundNumber?**: ❌ NO  
**Current Behavior**: Returns ALL pending evidence across all rounds  
**Should Accept?**: 🤔 OPTIONAL - Low priority

**Recommendation**: 
- Consider adding optional roundNumber filter for round-specific review queue
- Use case: Admins reviewing evidence for a specific round
- Priority: LOW (can use GET /api/admin/evidence?status=pending&roundNumber=X instead)

---

### 11. GET /api/admin/evidence/approved-public
**File**: `server/features/evidence/routes.ts:940-948`

**Current Implementation:**
```typescript
adminEvidenceRouter.get('/approved-public', async (req, res) => {
  const evidence = await evidenceStorage.getApprovedPublicEvidence();
  res.json(evidence);
});
```

**Status**: 🤔 **COULD BENEFIT FROM FILTER**

**Accepts roundNumber?**: ❌ NO  
**Current Behavior**: Returns ALL approved public evidence  
**Should Accept?**: 🤔 OPTIONAL - Low priority

**Recommendation**:
- Consider adding optional roundNumber filter for case study creation
- Use case: Finding case study candidates from specific round
- Priority: LOW (can use GET /api/admin/evidence?status=approved&visibility=public&roundNumber=X instead)

---

### 12. DELETE /api/admin/evidence/bulk-delete
**File**: `server/features/evidence/routes.ts:956-994`

**Status**: ✅ **CORRECT AS-IS**

**Needs roundNumber Filter?**: ❌ NO  
**Reason**: Operates on specific evidence IDs provided in request body

---

### 13. DELETE /api/admin/evidence/:id
**File**: `server/features/evidence/routes.ts:1002-1037`

**Status**: ✅ **CORRECT AS-IS**

**Needs roundNumber Filter?**: ❌ NO  
**Reason**: Single item deletion by unique ID

---

### 14. PATCH /api/admin/evidence/:id/assign
**File**: `server/features/evidence/routes.ts:1045-1078`

**Status**: ✅ **CORRECT AS-IS**

**Needs roundNumber Filter?**: ❌ NO  
**Reason**: Single item assignment by unique ID

---

### 15. GET /api/admin/evidence/homeless
**File**: `server/features/evidence/routes.ts:1097-1124`

**Current Implementation:**
```typescript
adminEvidenceRouter.get('/homeless', isAuthenticated, requireAdminOrPartner, async (req, res) => {
  const { schoolId, stage, page, limit } = req.query;
  
  const result = await evidenceStorage.getHomelessEvidence(
    schoolId as string | undefined,
    stage as 'inspire' | 'investigate' | 'act' | undefined,
    requestedPage,
    requestedLimit
  );
```

**Status**: 🤔 **SHOULD ACCEPT FILTER**

**Accepts roundNumber?**: ❌ NO  
**Current Behavior**: Returns ALL homeless evidence (evidenceRequirementId=null, isBonus=false)  
**Should Accept?**: ✅ YES - Medium priority

**Recommendation**:
- Add roundNumber query parameter
- Filter homeless evidence by round for triage workflow
- Use case: Assigning evidence requirements for current round's homeless evidence
- Priority: MEDIUM (useful for admin workflow but workaround exists)

---

## Cross-Cutting Endpoints

### GET /api/schools/me (Dashboard)
**File**: `server/routes.ts:2516`

**Implementation:**
```typescript
const evidence = await storage.getSchoolEvidence(school.id);
const recentEvidenceWithRounds = evidence.slice(0, 10).map(ev => ({
  id: ev.id,
  title: ev.title,
  stage: ev.stage,
  status: ev.status,
  submittedAt: ev.submittedAt,
  reviewedAt: ev.reviewedAt,
  roundNumber: ev.roundNumber || 1,  // ✅ Includes roundNumber
```

**Status**: ✅ **ACCEPTABLE AS-IS**

**Current Behavior**: Shows 10 most recent evidence submissions across all rounds  
**Returns roundNumber?**: ✅ YES  
**Should Filter?**: 🤔 Potentially, but mixed-round view may be intentional for dashboard

---

## Consistency Analysis

### ✅ Consistent Patterns Observed

1. **POST endpoints** automatically set roundNumber from `school.currentRound` ✅
2. **GET list endpoints** that accept filters include roundNumber ✅
3. **Single-item operations** (by ID) don't need roundNumber filtering ✅
4. **roundNumber always returned** in response objects ✅
5. **Parsing convention**: `parseInt(req.query.roundNumber as string)` ✅

### ❌ Inconsistencies Found

| Endpoint | Issue | Priority |
|----------|-------|----------|
| `GET /api/admin/schools/:schoolId/evidence` | Missing roundNumber filter | **HIGH** |
| `GET /api/admin/evidence/homeless` | Should filter by round for triage | MEDIUM |
| `GET /api/admin/evidence/pending` | Could benefit from round filter | LOW |
| `GET /api/admin/evidence/approved-public` | Could benefit from round filter | LOW |

---

## Recommendations

### Priority 1: Critical Fix
**Endpoint**: `GET /api/admin/schools/:schoolId/evidence`

**Action Required**:
1. Update route signature to accept optional `roundNumber` query parameter
2. Update `storage.getSchoolEvidence()` signature: `getSchoolEvidence(schoolId: string, roundNumber?: number)`
3. Update storage implementation to filter by roundNumber when provided
4. Update interface in `server/storage.ts:357`

**Recommended Implementation**:
```typescript
// Route (server/features/schools/routes.ts)
schoolsRouter.get('/api/admin/schools/:id/evidence', isAuthenticated, requireAdminOrPartner, async (req, res) => {
  const schoolId = req.params.id;
  const roundNumber = req.query.roundNumber ? parseInt(req.query.roundNumber as string) : undefined;
  const evidence = await storage.getSchoolEvidence(schoolId, roundNumber);
  res.json(evidence);
});

// Storage (server/features/schools/storage.ts)
async getSchoolEvidence(schoolId: string, roundNumber?: number): Promise<Array<Evidence & {...}>> {
  const conditions = [eq(evidence.schoolId, schoolId)];
  
  if (roundNumber !== undefined) {
    conditions.push(eq(evidence.roundNumber, roundNumber));
  }
  
  return await db
    .select({...})
    .from(evidence)
    .leftJoin(users, eq(evidence.reviewedBy, users.id))
    .where(and(...conditions))
    .orderBy(desc(evidence.submittedAt));
}

// Interface (server/storage.ts)
getSchoolEvidence(schoolId: string, roundNumber?: number): Promise<Evidence[]>;
```

**Impact**:
- ✅ Backward compatible (optional parameter)
- ✅ Enables round-specific evidence viewing for schools
- ✅ Consistent with other evidence endpoints
- ✅ No breaking changes to existing consumers

---

### Priority 2: Optional Enhancement
**Endpoint**: `GET /api/admin/evidence/homeless`

**Action**: Add optional `roundNumber` query parameter to filter homeless evidence by round

**Use Case**: Admin triage workflow for assigning requirements to homeless evidence in specific round

---

### Priority 3: Low-Priority Enhancements
**Endpoints**: 
- `GET /api/admin/evidence/pending`
- `GET /api/admin/evidence/approved-public`

**Note**: These have workarounds using the main `GET /api/admin/evidence` endpoint with filters, so changes are optional.

---

## Summary Table

| Endpoint | Path | roundNumber Support | Status | Priority |
|----------|------|-------------------|--------|----------|
| GET evidence list | `/api/evidence` | ✅ Query param | ✅ Correct | - |
| GET admin evidence | `/api/admin/evidence` | ✅ Query param | ✅ Correct | - |
| GET school evidence | `/api/admin/schools/:id/evidence` | ❌ Missing | ❌ Needs fix | **HIGH** |
| POST evidence | `/api/evidence` | ✅ Auto-set | ✅ Correct | - |
| GET single | `/api/evidence/:id` | N/A (by ID) | ✅ Correct | - |
| DELETE single | `/api/evidence/:id` | N/A (by ID) | ✅ Correct | - |
| PATCH admin update | `/api/admin/evidence/:id` | N/A (by ID) | ✅ Correct | - |
| PATCH review | `/api/admin/evidence/:id/review` | N/A (by ID) | ✅ Correct | - |
| POST bulk review | `/api/admin/evidence/bulk-review` | N/A (by IDs) | ✅ Correct | - |
| GET pending | `/api/admin/evidence/pending` | ❌ No filter | 🤔 Optional | LOW |
| GET approved-public | `/api/admin/evidence/approved-public` | ❌ No filter | 🤔 Optional | LOW |
| DELETE bulk | `/api/admin/evidence/bulk-delete` | N/A (by IDs) | ✅ Correct | - |
| DELETE single | `/api/admin/evidence/:id` | N/A (by ID) | ✅ Correct | - |
| PATCH assign | `/api/admin/evidence/:id/assign` | N/A (by ID) | ✅ Correct | - |
| GET homeless | `/api/admin/evidence/homeless` | ❌ No filter | 🤔 Should add | MEDIUM |

---

## Testing Recommendations

When implementing fixes, test the following scenarios:

### For GET /api/admin/schools/:schoolId/evidence

**Test Cases**:
1. ✅ No roundNumber param → Returns ALL evidence (backward compatible)
2. ✅ roundNumber=1 → Returns only round 1 evidence
3. ✅ roundNumber=2 → Returns only round 2 evidence
4. ✅ roundNumber=999 (non-existent) → Returns empty array
5. ✅ roundNumber=invalid → Returns 400 or defaults to all (depends on error handling)

**Expected Behavior**:
- Parameter is optional (backward compatible)
- When provided, filters SQL query
- Returns roundNumber in each evidence object
- Empty array if no evidence found for round (not 404)

---

## Conclusion

**Overall Assessment**: The evidence API architecture has strong roundNumber support with one critical gap.

**Key Findings**:
- ✅ Core evidence list endpoints correctly implement roundNumber filtering
- ✅ Evidence submission correctly auto-sets roundNumber from school context
- ✅ Consistent pattern across endpoints (optional query param → parseInt → filter)
- ❌ `GET /api/admin/schools/:schoolId/evidence` missing critical roundNumber support
- 🤔 A few optional enhancements identified for admin workflows

**Next Steps**:
1. Implement Priority 1 fix for `/api/admin/schools/:schoolId/evidence`
2. Test backward compatibility
3. Consider Priority 2 and 3 enhancements based on admin feedback
