# Plastic Clever Schools Web Application

## Overview
This project is a web application designed for the Plastic Clever Schools program. Its primary goal is to facilitate plastic reduction in schools through a structured three-stage program (Inspire, Investigate, Act). The application features a public website and an integrated CRM, offering educational resources, evidence tracking, case studies, plastic reduction promise tracking, and administrative tools. It aims to foster environmental responsibility in schools and significantly expand the program's reach and impact.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application employs a modern web architecture with distinct frontend and backend components, supported by a robust data model and comprehensive UI/UX design.

### Frontend
-   **Frameworks & Libraries**: React with TypeScript (Vite), Wouter for routing, TanStack Query for state management.
-   **UI/Styling**: Radix UI primitives, shadcn/ui components, and Tailwind CSS for styling (custom palette).
-   **Forms**: React Hook Form with Zod validation.
-   **File Uploads**: Uppy.js for direct-to-cloud uploads.
-   **Icons**: Lucide React.
-   **Avatars**: DiceBear (thumbs style).

### Backend
-   **Runtime**: Node.js with Express.js.
-   **Database**: PostgreSQL (Neon serverless) managed with Drizzle ORM.
-   **Authentication**: Local password and Google OAuth, utilizing Express sessions with a PostgreSQL store.
-   **API**: RESTful architecture with robust error handling.
-   **File Storage**: Google Cloud Storage for various media assets.

### Authentication & Authorization
-   **Identity Providers**: Local password and Google OAuth.
-   **Role-Based Access Control (RBAC)**: Supports roles such as Teacher, Head Teacher, Pending Teacher, and Platform Admin.
-   **User Management**: Hierarchical school team management and token-based admin invitation system.

### Key Data Models
Core entities include Users, Schools, Evidence (with approval workflows), Audit data, Reduction Promises (Action Plans), Resources, Case Studies, Events (with registration, waitlists, and public landing pages), Media Assets, and Printable Form Submissions.

### UI/UX Decisions
-   **Design System**: PCS brand colors, Gilroy Bold for headers, Century Gothic Regular for body text. Component-based design using Radix UI and shadcn/ui.
-   **Navigation**: Public and authenticated routes, including a tab-based dashboard (Progress, Analytics, Resources, Team, Our Action Plan).
-   **Features**: Comprehensive analytics with visualizations and PDF export, dynamic evidence requirements, student-led action plans, multi-step school registration (country-adaptive), and multi-language support (i18next with 14 languages, RTL support).
-   **Admin UI**: Enhanced navigation, integrated evidence requirements, school detail management, and manual school progression.
-   **Events System**: Full event lifecycle management (creation, browsing, registration), event landing pages with YouTube embedding, downloadable resources, testimonials, and automated email reminders.
-   **Content Management**: Printable forms system with admin review, and an Evidence Gallery for managing submissions with advanced filtering and PDF viewing capabilities.
-   **Communication**: Enhanced bulk email editor with image picker and AI-powered auto-translation based on school's preferred language.
-   **SEO Optimization**: Server-side meta tag injection for case study pages, JSON-LD structured data for rich snippets, proper heading hierarchy, and descriptive image alt text for improved search engine visibility and social media sharing.

## External Dependencies
-   **Database**: Neon PostgreSQL
-   **File Storage**: Google Cloud Storage
-   **Authentication**: Google OAuth
-   **Email Services**: SendGrid (for transactional and bulk emails)
-   **Build Tool**: Vite
-   **Hosting/Deployment**: Replit
-   **AI Integration**: OpenAI GPT-5 (specifically GPT-4o-mini for translations)
-   **PDF Generation**: Puppeteer

## Recent Updates (October 2025)

### Case Study Platform Bug Fixes & Schema Updates
- **Added Admin GET Route**: Fixed missing GET /api/admin/case-studies/:id endpoint (was returning HTML, now returns JSON)
- **Schema Alignment**: Updated studentQuote schema from quote/photoUrl to text/photo fields to match frontend interface
- **Impact Metrics Fix**: Changed impactMetrics database default from '{}' (object) to '[]' (array) for proper array handling
- **Video Schema Enhancement**: Added title field to caseStudyVideoSchema for video metadata
- **PDF Generator Update**: Updated PDF generation to use q.text || q.quote for backwards compatibility with legacy data
- **Bug Fixes Applied**:
  - AnimatedCounter now handles comma-formatted numbers correctly (e.g., "2,500+" displays properly)
  - Student testimonials render with proper text field mapping
  - Impact metrics display with correct array structure
- **Database Migration**: Schema changes pushed successfully with npm run db:push --force

### Case Study UX Improvements & Additional Bug Fixes (October 15, 2025)
- **Fixed Inspiration Page HTML Display**: Created stripHtmlTags utility to remove HTML tags from case study descriptions on cards
- **Fixed Admin Modal Scrolling**: Added overflow-y-auto to case study editor dialog for proper content scrolling
- **Fixed Preview Button 404**: Corrected route from /case-studies/:id to /case-study/:id in admin preview button
- **Fixed Case Study Detail Page Loading**: 
  - Removed scroll-reveal animation from critical content (description) for immediate visibility
  - Optimized IntersectionObserver threshold from 0.1 to 0.05 and rootMargin for faster content reveal
  - Fixed blank content issue where animations prevented content from displaying
- **Fixed Related Stories 404**: Corrected related case studies links from /inspiration/:id to /case-study/:id
- **Improved Case Study Creation Workflow**:
  - Created TemplateTypeSelector component with visual SVG previews for all 4 template types (Standard, Visual Story, Timeline, Impact Focused)
  - Moved template selection from Settings tab (last step) to Content tab (first step)
  - Template choice now appears first in workflow, helping users choose layout before adding content
  - Cleaned up Settings tab to focus on publication settings (status, featured, SEO)

### Performance & Optimization Updates (October 15, 2025)
**Low-Bandwidth Optimization - Critical for users in developing countries:**
- **Landing Page Optimizations**:
  - Reduced hero image quality from 60 to 50 to save ~40% bandwidth on largest asset (13MB original)
  - Optimized image size breakpoints for more efficient loading across devices
  - Lazy-loaded SchoolSignUpForm component with Suspense fallback (deferred ~100KB+ from initial bundle)
  - Already had lazy-loaded InstagramCarousel for below-the-fold content
  - Connection-speed aware image loading with OptimizedImage component

- **Data Loading Fixes**:
  - Fixed case study stale data bug: Added staleTime: 5min and refetchOnMount: true to ensure fresh data on every page visit
  - Fixed 8 TypeScript LSP errors in admin.tsx for better type safety (null checks, proper type annotations)

- **Error Handling & Monitoring**:
  - Added global ErrorBoundary component wrapping all routes for graceful error recovery
  - Created PerformanceMonitor utility to track page load metrics and slow operations (dev mode logging, production-ready)
  - Created ProgressiveImage component for connection-aware image quality adaptation

- **Admin Architecture Foundation** (for future maintainability):
  - Created AdminShell component with auth gate, tab navigation, and stats display
  - Extracted shared admin types to `lib/admin/types.ts` (20+ interfaces)
  - Established folder structure in `components/admin/` for future componentization
  - Admin.tsx remains monolithic (11K+ lines) but foundation laid for incremental refactoring

**Performance Impact:**
- Landing page initial load reduced by ~150KB+ through code splitting
- Images optimized for slow connections (auto-quality reduction)
- Error boundaries prevent white screen crashes
- Fresh data guaranteed on case study pages (no stale content)
- Performance metrics tracked for future optimization