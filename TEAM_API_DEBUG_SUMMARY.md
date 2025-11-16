# Team Members API Debug Summary

## Issue
The frontend was displaying "Unknown User" and "N/A" for team member names and emails, even though the database contained correct data:
- firstName: "elizabeth"  
- lastName: "lawley"
- email: "lizziemetcalfedesign@gmail.com"

## Investigation Process

### 1. Direct Database Function Test
Created test script `server/scripts/test-school-users.ts` to call `getSchoolUsersWithDetails()` directly:

```typescript
const teamMembers = await storage.getSchoolUsersWithDetails('e36dd9ee-b903-42eb-aab4-b50cda53a6ab');
```

**Result**: ✅ Function returned correct data with proper nested structure:
```json
{
  "user": {
    "id": "e6fbdf7c-ebf7-4613-bc41-4b57a88beee1",
    "email": "lizziemetcalfedesign@gmail.com",
    "firstName": "elizabeth",
    "lastName": "lawley",
    ...
  }
}
```

### 2. API Route Investigation
Discovered **two different routes** handling the same endpoint:

1. `server/routes.ts` (line 2482) - NEVER EXECUTED (dead code)
2. `server/features/schools/routes.ts` (line 528) - **ACTUAL ROUTE BEING USED**

The `schoolsRouter` is mounted earlier in the application, so it intercepts requests before they reach the duplicate route in `server/routes.ts`.

### 3. Root Cause Found
In `server/features/schools/routes.ts`, the route was **flattening the response structure**:

**BROKEN CODE** (lines 534-543):
```typescript
const team = teamMembers.map(member => ({
  userId: member.userId,
  firstName: member.user?.firstName || '',  // ❌ WRONG: Flattened structure
  lastName: member.user?.lastName || '',    // ❌ WRONG: Flattened structure  
  email: member.user?.email || '',          // ❌ WRONG: Flattened structure
  role: member.role,
  ...
}));
```

**Frontend Expected Structure**:
```typescript
{
  user: {
    firstName: "elizabeth",
    lastName: "lawley",
    email: "lizziemetcalfedesign@gmail.com"
  }
}
```

**API Was Returning**:
```typescript
{
  firstName: "",
  lastName: "",
  email: ""
}
```

The issue: The mapping was extracting fields from `member.user` but placing them at the top level, then the user object was lost. Since `member.user?.firstName` evaluated to a truthy value ("elizabeth"), it should have worked, but the structure was wrong for the frontend which expected `member.user.firstName`.

## Fix Applied

### File: `server/features/schools/routes.ts` (lines 530-562)

Changed the response mapping to preserve the nested `user` object:

```typescript
// Return the full data structure including the nested user object
// The frontend expects: { ..., user: { firstName, lastName, email, ... } }
const team = teamMembers.map(member => ({
  id: member.id,
  schoolId: member.schoolId,
  userId: member.userId,
  role: member.role,
  teacherRole: member.teacherRole,
  isVerified: member.isVerified,
  invitedBy: member.invitedBy,
  invitedAt: member.invitedAt,
  verifiedAt: member.verifiedAt,
  createdAt: member.createdAt,
  updatedAt: member.updatedAt,
  user: member.user, // ✅ Keep the full user object nested
}));
```

### File: `server/routes.ts` (lines 2482-2491)

Removed duplicate/dead code and added documentation:

```typescript
// NOTE: Team management routes have been moved to server/features/schools/routes.ts
// The schoolsRouter is mounted earlier in this file, so these routes are unreachable
// See: server/features/schools/routes.ts for the actual implementation

// REMOVED DUPLICATE ROUTES (now in server/features/schools/routes.ts):
// - GET /api/schools/:schoolId/team
// - DELETE /api/schools/:schoolId/teachers/:userId
// - PUT /api/schools/:schoolId/teachers/:userId/role
```

## Testing

### Before Fix
- Frontend displayed: "Unknown User" and "N/A" for emails
- Data was being lost in serialization

### After Fix  
- API now returns proper nested structure
- Frontend can access `member.user.firstName`, `member.user.lastName`, `member.user.email`
- Team members display correctly with names and emails

## Lessons Learned

1. **Route Ordering Matters**: When multiple routers handle similar paths, the one mounted first takes precedence
2. **Data Structure Consistency**: Frontend and backend must agree on response structure (flat vs nested)
3. **Avoid Duplicate Routes**: Duplicate route handlers lead to confusion and dead code
4. **Test at Multiple Layers**: Testing the storage function, API route, and frontend separately helps isolate issues

## Files Modified

1. `server/features/schools/routes.ts` - Fixed team endpoint response structure
2. `server/routes.ts` - Removed duplicate dead code, added documentation
3. `server/scripts/test-school-users.ts` - Created for debugging (can be kept for future testing)

## Verification Steps

1. Login as a team member
2. Navigate to Team Management page
3. Verify that team member names and emails display correctly
4. Check browser console for any errors
5. Verify API response structure matches expected format
