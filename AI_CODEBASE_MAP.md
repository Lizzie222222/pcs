# AI Codebase Navigation Map

## 🎯 Purpose

This document helps AI agents quickly locate, understand, and modify code in the Plastic Clever Schools application. Use this as your first reference when working on features.

## 📂 Project Structure Overview

```
plastic-clever-schools/
├── client/               # Frontend (React + Vite)
│   ├── src/
│   │   ├── pages/       # Route pages
│   │   ├── components/  # Reusable components
│   │   ├── lib/         # Utilities, i18n, query client
│   │   ├── hooks/       # Custom React hooks
│   │   ├── locales/     # Translation files
│   │   └── styles/      # Global styles
├── server/              # Backend (Express + TypeScript)
│   ├── routes.ts        # API endpoints
│   ├── storage.ts       # Data persistence layer
│   └── index.ts         # Server entry
├── shared/              # Shared types & schemas
│   └── schema.ts        # Drizzle schemas, Zod validators, types
└── db/                  # Database migrations
```

## 🗺️ Feature Location Map

### Core Features & Their Files

#### 1. **School Dashboard** 
**Location:** `client/src/pages/dashboard.tsx`
- School progress tracking
- Evidence submission
- Reduction promises
- Award badges
- Related: `client/src/hooks/useAuth.tsx`, `shared/schema.ts`

#### 2. **Admin Panel**
**Main File:** `client/src/pages/admin.tsx` (6000+ lines)
**Extracted Components:**
- `client/src/components/admin/AnalyticsContent.tsx` (lazy loaded)
- `client/src/components/admin/UserManagementTab.tsx`
- `client/src/components/admin/ResourcesManagement.tsx`
- `client/src/components/admin/EmailManagementSection.tsx`
- `client/src/components/admin/EvidenceGalleryTab.tsx`
- `client/src/components/admin/PrintableFormsTab.tsx`

**Admin Sections:**
- Overview Analytics → `AnalyticsContent.tsx`
- Schools Management → `admin.tsx` (Schools tab)
- Case Studies → `admin.tsx` (Case Studies tab) + `CaseStudyEditor.tsx`
- Events → `admin.tsx` (Events tab with Recharts)
- User Management → `UserManagementTab.tsx`
- Resources → `ResourcesManagement.tsx`
- Evidence Gallery → `EvidenceGalleryTab.tsx`
- Email Management → `EmailManagementSection.tsx`

#### 3. **Case Studies**
**Main Editor:** `client/src/components/admin/CaseStudyEditor.tsx`
**Sub-components:**
- `client/src/components/admin/case-study-sections/RichTextSection.tsx`
- `client/src/components/admin/case-study-sections/MediaGallerySection.tsx`
- `client/src/components/admin/case-study-sections/QuotesManager.tsx`
- `client/src/components/admin/case-study-sections/ImpactMetricsBuilder.tsx` ✅ Translated
- `client/src/components/admin/case-study-sections/TimelineBuilder.tsx` ✅ Translated
- `client/src/components/admin/case-study-sections/CategorisationSection.tsx` ✅ Translated

#### 4. **School Registration**
**Main Flow:** `client/src/components/MultiStepSchoolRegistration.tsx`
**Steps:**
- `client/src/components/registration/Step1SchoolInfo.tsx`
- `client/src/components/registration/Step2TeacherInfo.tsx`
- `client/src/components/registration/Step3StudentInfo.tsx`
- `client/src/components/RegistrationStepper.tsx` (progress indicator)

#### 5. **Evidence Submission**
**Files:**
- Evidence form in `client/src/pages/dashboard.tsx`
- Evidence review in `client/src/components/admin/EvidenceGalleryTab.tsx`
- Video links: `client/src/components/EvidenceVideoLinks.tsx` ✅ Translated
- File gallery: `client/src/components/EvidenceFilesGallery.tsx`

#### 6. **Authentication**
**Frontend:** `client/src/hooks/useAuth.tsx`
**Backend:** `server/routes.ts` (auth endpoints)
- Login: POST `/api/auth/login`
- Logout: POST `/api/auth/logout`
- Current user: GET `/api/auth/user`

#### 7. **Resources**
**Frontend Page:** `client/src/pages/resources.tsx`
**Admin Management:** `client/src/components/admin/ResourcesManagement.tsx`
**API:** Server routes for resource CRUD

## 🔍 Quick Reference: Finding Components

### By Feature
| Feature | Primary File | Related Files |
|---------|-------------|---------------|
| Landing Page | `pages/landing.tsx` | `components/InstagramCarousel.tsx` |
| Schools map | `pages/map.tsx` | - |
| Search | `pages/search.tsx` | - |
| Inspiration | `pages/inspiration.tsx` | - |
| 404 Page | Use router fallback | - |
| Navigation | `components/Navigation.tsx` | - |
| Language Switch | `components/LanguageSwitcher.tsx` | `lib/i18n.ts` |

### By Component Type
| Type | Location | Examples |
|------|----------|----------|
| Pages | `client/src/pages/` | `dashboard.tsx`, `admin.tsx`, `landing.tsx` |
| Forms | `client/src/components/` | `SchoolSignUpForm.tsx`, `PlasticWasteAudit.tsx` |
| UI States | `client/src/components/ui/states/` | `ErrorState.tsx` ✅, `LoadingSpinner.tsx` ✅, `EmptyState.tsx` |
| Admin | `client/src/components/admin/` | `AnalyticsContent.tsx`, `CaseStudyEditor.tsx` |

## 📊 Data Flow & Architecture

### 1. **Database Schema**
**File:** `shared/schema.ts`

Key tables:
- `schools` - School information
- `users` - Teachers, admins
- `evidence` - Evidence submissions
- `reductionPromises` - Plastic reduction commitments
- `caseStudies` - Success stories
- `resources` - Educational materials
- `events` - Community events

**Usage Pattern:**
```typescript
// Import schemas
import { schools, users, evidence } from "@shared/schema";

// Import types
import type { School, User, Evidence } from "@shared/schema";

// Import Zod validators
import { insertSchoolSchema, insertUserSchema } from "@shared/schema";
```

### 2. **API Routes**
**File:** `server/routes.ts`

**Structure:**
```typescript
// Public routes
router.get('/api/stats', ...)           // Global statistics
router.get('/api/countries', ...)       // Country list
router.get('/api/case-studies', ...)    // Case studies

// Auth required
router.get('/api/schools/:id', ...)     // School details
router.post('/api/evidence', ...)       // Submit evidence
router.get('/api/reduction-promises', ...) // Get promises

// Admin only
router.get('/api/admin/schools', ...)   // All schools
router.patch('/api/admin/evidence/:id', ...) // Review evidence
router.post('/api/admin/events', ...)   // Create events
```

### 3. **Data Storage**
**File:** `server/storage.ts`

**Interfaces:**
- `IStorage` - Abstract storage interface
- `DbStorage` - PostgreSQL implementation
- `MemStorage` - In-memory (testing)

### 4. **Frontend Data Fetching**
**Pattern:** React Query (TanStack Query v5)

```typescript
// In components:
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Query pattern
const { data, isLoading } = useQuery({
  queryKey: ['/api/schools', schoolId],
  // queryFn is set globally, no need to define
});

// Mutation pattern
const mutation = useMutation({
  mutationFn: async (data) => apiRequest('/api/evidence', 'POST', data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/evidence'] });
  }
});
```

## 🌍 Translation System

**Guide:** See `TRANSLATION_GUIDE.md` for complete details

**Quick Lookup:**
```typescript
// Import
import { useTranslation } from "react-i18next";

// Use
const { t } = useTranslation('namespace'); // 'common', 'admin', etc.

// In JSX
<p>{t('messages.error_occurred')}</p>
```

**Translation Files:**
- `client/src/locales/en/common.json` - Buttons, navigation, status
- `client/src/locales/en/admin.json` - Admin panel, case studies
- `client/src/locales/en/dashboard.json` - School dashboard
- `client/src/locales/en/auth.json` - Authentication

**Translated Components:** ✅
- ErrorState
- LoadingSpinner
- EvidenceVideoLinks
- CategorisationSection
- ImpactMetricsBuilder
- TimelineBuilder

## 🎨 Styling & Theming

### Tailwind Configuration
**File:** `tailwind.config.ts`

**Custom Colors:**
```javascript
colors: {
  'ocean-blue': '#019ADE',
  'navy': '#0B3D5D', 
  'teal': '#02BBB4',
  'pcs_blue': '#019ADE',
  // ... more
}
```

### Dark Mode
**Pattern:** Class-based with explicit variants
```tsx
<div className="bg-white dark:bg-black text-black dark:text-white">
```

### shadcn/ui Components
**Location:** `client/src/components/ui/`
- Pre-built accessible components
- Customized with Tailwind

## 🔧 Common Modifications

### Adding a New Feature

1. **Define Data Model** (`shared/schema.ts`)
   ```typescript
   export const myFeature = pgTable('my_feature', {
     id: text('id').primaryKey(),
     name: text('name').notNull(),
     // ...
   });
   
   export const insertMyFeatureSchema = createInsertSchema(myFeature).omit({ id: true });
   export type MyFeature = typeof myFeature.$inferSelect;
   export type InsertMyFeature = z.infer<typeof insertMyFeatureSchema>;
   ```

2. **Add Storage Interface** (`server/storage.ts`)
   ```typescript
   interface IStorage {
     // ...
     getMyFeature(id: string): Promise<MyFeature | null>;
     createMyFeature(data: InsertMyFeature): Promise<MyFeature>;
   }
   ```

3. **Implement Storage** (same file)
   ```typescript
   class DbStorage implements IStorage {
     async getMyFeature(id: string) {
       return db.query.myFeature.findFirst({ where: eq(myFeature.id, id) });
     }
   }
   ```

4. **Add API Routes** (`server/routes.ts`)
   ```typescript
   router.get('/api/my-feature/:id', async (req, res) => {
     const feature = await storage.getMyFeature(req.params.id);
     res.json(feature);
   });
   ```

5. **Create Frontend Component**
   ```tsx
   // In client/src/pages/my-feature.tsx
   import { useQuery } from "@tanstack/react-query";
   
   export default function MyFeature() {
     const { data } = useQuery({ queryKey: ['/api/my-feature', id] });
     return <div>{/* UI */}</div>;
   }
   ```

6. **Add Translations** (`client/src/locales/en/*.json`)
   ```json
   {
     "my_feature": {
       "title": "My Feature",
       "description": "Feature description"
     }
   }
   ```

### Modifying Admin Panel

**Admin.tsx is 6000+ lines** - Use sections wisely:

1. **Find the tab:**
   - Analytics → `AnalyticsContent.tsx` (lazy loaded)
   - Schools → `admin.tsx` line ~800-2000
   - Case Studies → `admin.tsx` line ~2000-3000  
   - Events → `admin.tsx` line ~3700-4500
   - Users → `UserManagementTab.tsx`
   - Resources → `ResourcesManagement.tsx`

2. **Add state:**
   ```typescript
   // Near top of Admin component
   const [myState, setMyState] = useState(initialValue);
   ```

3. **Add query/mutation:**
   ```typescript
   const { data } = useQuery({ queryKey: ['/api/admin/my-data'] });
   ```

4. **Add to UI:**
   ```tsx
   <TabsContent value="my-tab">
     {/* Your content */}
   </TabsContent>
   ```

### Adding Analytics

**File:** `client/src/components/admin/AnalyticsContent.tsx`

1. **Define interface:**
   ```typescript
   interface MyAnalytics {
     metric1: number;
     metric2: string[];
   }
   ```

2. **Create API endpoint** in `server/routes.ts`

3. **Add query:**
   ```typescript
   const { data } = useQuery<MyAnalytics>({
     queryKey: ['/api/admin/analytics/my-data']
   });
   ```

4. **Add chart:**
   ```tsx
   import { BarChart, Bar, XAxis, YAxis } from 'recharts';
   
   <BarChart data={data}>
     <Bar dataKey="count" fill="#019ADE" />
   </BarChart>
   ```

## 🐛 Debugging Guide

### Common Issues & Solutions

#### LSP Errors
```bash
# Check diagnostics
get_latest_lsp_diagnostics

# Common fixes:
# - Missing imports → Add import statement
# - Type errors → Check shared/schema.ts for correct types
# - Implicit any → Add type annotations
```

#### Translation Missing
```bash
# Find hardcoded strings:
grep -r ">[A-Z].*</" client/src/components

# Add to translation file, then use t()
```

#### API Not Working
1. Check `server/routes.ts` for endpoint
2. Verify authentication middleware
3. Check storage implementation in `server/storage.ts`
4. Inspect network tab in browser

#### Build Errors
```bash
# TypeScript errors
npm run typecheck

# Dependency issues  
npm install

# Database schema
npm run db:push
```

## 📝 Code Standards

### TypeScript
- Use strict types from `shared/schema.ts`
- No `any` types (use `unknown` if needed)
- Export types alongside implementations

### React
- Functional components only
- Use hooks (`useState`, `useEffect`, `useQuery`)
- Add `data-testid` to interactive elements

### Naming
```typescript
// Components: PascalCase
export function MyComponent() {}

// Hooks: camelCase with 'use' prefix
export function useMyHook() {}

// Files: Match export name
MyComponent.tsx
useMyHook.tsx
```

## 🚀 Performance Optimizations

### Lazy Loading
```typescript
// Already implemented:
const AnalyticsContent = lazy(() => import("@/components/admin/AnalyticsContent"));

// Pattern:
const MyComponent = lazy(() => import("@/components/MyComponent"));

// Usage:
<Suspense fallback={<LoadingSpinner />}>
  <MyComponent />
</Suspense>
```

### Image Optimization
**Component:** `client/src/components/OptimizedImage.tsx`
- Connection-aware quality
- Lazy loading
- Progressive loading

### API Compression
**Implemented in:** `server/index.ts`
- GZIP/Brotli compression
- 60-80% size reduction

## 🧭 Navigation for AI Agents

### Task: Fix Bug in Feature X

1. **Identify component** - Use this map to find file
2. **Read the component** - Understand current implementation  
3. **Check related files** - Schema, routes, storage
4. **Make changes** - Follow code patterns
5. **Check translations** - Ensure no hardcoded strings
6. **Verify** - Check LSP, run tests

### Task: Add New Page

1. **Create page file** - `client/src/pages/my-page.tsx`
2. **Register route** - Add to `client/src/App.tsx`
3. **Add navigation** - Update `components/Navigation.tsx`
4. **Add translations** - Create namespace in `locales/`
5. **Add SEO** - Use `SocialMetaTags` component

### Task: Modify Admin Feature

1. **Locate in admin.tsx** - Use section comments
2. **Check if extracted** - Look in `components/admin/`
3. **Add state/queries** - Near component top
4. **Update UI** - In TabsContent
5. **Add backend** - Routes + storage if needed

## 📚 Key Files Reference

| Purpose | File | Line Count | Notes |
|---------|------|-----------|-------|
| Main Schema | `shared/schema.ts` | 500+ | All DB tables, types, validators |
| Admin Panel | `client/src/pages/admin.tsx` | 6000+ | Massive file, use sections |
| API Routes | `server/routes.ts` | 1500+ | All endpoints |
| Storage Layer | `server/storage.ts` | 800+ | DB abstractions |
| Auth Hook | `client/src/hooks/useAuth.tsx` | 200+ | Current user, login state |
| Query Client | `client/src/lib/queryClient.ts` | 100+ | React Query setup |
| i18n Setup | `client/src/lib/i18n.ts` | 150+ | Translation config |

## ✅ Checklist Before Completing Work

- [ ] No LSP errors (`get_latest_lsp_diagnostics`)
- [ ] No hardcoded strings (check TRANSLATION_GUIDE.md)
- [ ] Types imported from `shared/schema.ts`
- [ ] data-testid added to interactive elements
- [ ] Followed existing code patterns
- [ ] Updated replit.md if architecture changed
- [ ] Ran architect review for substantial changes
