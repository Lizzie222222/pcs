# Plastic Clever Schools Web Application

## Overview
This project is a web application for the Plastic Clever Schools program, designed to reduce plastic usage in schools. It features a public website and an integrated CRM system. The platform guides schools through a three-stage plastic reduction program (Inspire, Investigate, Act) by providing educational resources, tracking evidence submissions, showcasing case studies, offering reduction promise tracking, and providing administrative tools for managing school participation and progress. The business vision is to empower schools to become environmentally responsible and to scale the program's reach and impact.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
### Frontend
-   **Framework**: React with TypeScript (Vite)
-   **Routing**: Wouter
-   **State Management**: TanStack Query
-   **UI**: Radix UI primitives with shadcn/ui components, styled using Tailwind CSS (custom palette)
-   **Forms**: React Hook Form with Zod validation
-   **File Uploads**: Uppy.js for direct-to-cloud uploads with presigned URLs.
-   **Icons**: Lucide React
-   **Avatars**: DiceBear (thumbs style)

### Backend
-   **Runtime**: Node.js with Express.js
-   **Database**: PostgreSQL (Neon serverless) with Drizzle ORM.
-   **Authentication**: Local password and Google OAuth, using Express sessions with PostgreSQL store.
-   **API**: RESTful with robust error handling.
-   **File Storage**: Google Cloud Storage for evidence, resources, and images, with custom object ACL for permissions.

### Authentication & Authorization
-   **Identity**: Local password and Google OAuth.
-   **Roles**: Teacher, Head Teacher, Pending Teacher, Platform Admin.
-   **Permissions**: Role-Based Access Control (RBAC) with protected routes and middleware.
-   **School Team Management**: Hierarchical user management allowing Head Teachers to invite and manage school teams.
-   **Admin Invitations**: Token-based email invitation system for new admins.

### Key Data Models
-   **Users**: Teachers linked to schools with roles.
-   **Schools**: Program progress tracking with auto-calculated progress_percentage.
-   **Evidence**: Stage-specific file submissions with approval workflows, linked to specific evidence requirements.
-   **EvidenceRequirements**: Admin-configurable checklist of required evidence per stage.
-   **Audits**: Plastic waste audit data (5-part form) with approval workflow, status tracking, and analytics integration.
-   **ReductionPromises**: Plastic reduction commitments made by schools, linked to audits and schools, with baseline/target quantities, timeframes, and impact calculations.
-   **Resources**: Educational materials.
-   **Case Studies**: Approved evidence for public display.
-   **SchoolUsers**: Junction table for user-school relationships.
-   **TeacherInvitations**: Stores invitation details.
-   **AdminInvitations**: Token-based admin invitation system.
-   **VerificationRequests**: Stores teacher requests to join schools.

### UI/UX Decisions
-   **Color Schemes**: Exact PCS brand colors (PCS Navy, PCS Blue, Inspire Green, Investigate Yellow, Act Red).
-   **Typography**: Gilroy Bold for headers, Century Gothic Regular for body text.
-   **Design Approach**: Component-based using Radix UI and shadcn/ui for consistency and accessibility.
-   **Page Structure**: Public routes for general access and authenticated routes for specific user roles.
-   **Animations**: Scroll-reveal animations disabled; button hover/press interactions preserved.
-   **Dashboard Features**: Tab-based navigation (Progress, Analytics, Resources, Team, Our Promises), dismissible evidence notifications, comprehensive analytics with visualizations, dynamic evidence requirements checklist, integrated evidence tracking within stage cards, and reduction promises management with impact metrics.
-   **Landing Page**: Hero section, Impact Ribbon, teacher testimonial, program stage overview, CTA, and Instagram feed.
-   **Analytics System**: Plastic waste audit data automatically converts into visual analytics for both teacher and admin dashboards, showing total plastic items, location breakdowns, top problem plastics, waste management practices, cross-school trends, and reduction promises impact.

### Reduction Promises System
-   **Overview**: Schools commit to reducing specific plastic items (e.g., reduce plastic bottles from 100 to 20 per week).
-   **Audit Integration**: Step 5 of the audit flow prompts schools to make at least 2 reduction promises based on audit results.
-   **Dashboard Management**: Teachers can view, add, edit, and delete promises in the "Our Promises" tab.
-   **Impact Tracking**: System calculates and displays both fun ocean-themed metrics (sea turtles saved, fish protected, ocean bottles prevented) and serious environmental metrics (CO2 prevented, oil saved, waste tons prevented).
-   **Metric Calculations**: Uses scientifically accurate weights and conversion factors for each plastic item type, annualizes reductions based on timeframe (week/month/year).
-   **Admin Analytics**: Individual school promise data visible in Schools tab; aggregated metrics across all schools shown in Analytics tab.
-   **Notification System**: Dashboard banner prompts schools that completed audits but haven't made promises yet.

## External Dependencies
### Core Infrastructure
-   **Database**: Neon PostgreSQL
-   **File Storage**: Google Cloud Storage
-   **Authentication**: Google OAuth

### Email Services
-   **Provider**: SendGrid for transactional emails.

### Development & Deployment
-   **Build Tool**: Vite
-   **Hosting/Deployment**: Replit

## Recent Updates (October 2025)
### Multi-Step School Registration (October 2025)
- **User Experience**: Redesigned school registration into a 3-step wizard with progress stepper to reduce cognitive load and improve completion rates
- **Step 1 - About Your School**: Collects country, school name, optional admin email, address, and country-specific postal code (UK: postcode, US: zip code, Other: postal/zip code). School type field removed to focus on age ranges instead.
- **Step 2 - About You (Lead Teacher)**: Collects teacher's personal details (name, email pre-filled from auth), teaching role, and referral source (how they found the program)
- **Step 3 - About Your Students**: Collects student count, age ranges (adapted to country - UK: Year groups, US: Grades, Other: Age ranges), map visibility, and legal consents (GDPR, Terms). Checkbox labels display translated text correctly.
- **Database Schema**: Extended schools table with adminEmail (optional), postcode, zipCode, primaryLanguage, ageRanges (array), registrationCompleted; schools.type is nullable; extended schoolUsers with teacherRole, referralSource
- **Country Configuration**: Smart field adaptation based on selected country (client/src/lib/countryConfig.ts) with localized labels and validation
- **Backend API**: New authenticated endpoint `/api/schools/register-multi-step` with comprehensive Zod validation enforcing gdprConsent and acceptTerms must be true; schoolType removed from validation; adminEmail optional
- **Backward Compatibility**: Existing schools auto-migrated to registrationCompleted=true via SQL, ensuring no disruption to current users
- **Components**: RegistrationStepper, Step1SchoolInfo, Step2TeacherInfo, Step3StudentInfo, MultiStepSchoolRegistration container
- **Language Persistence Fix**: Made register/login mutations async to await i18n.changeLanguage() before redirect, ensuring language preference is saved to localStorage and persists correctly
- **Testing**: E2E test validates complete flow from signup to dashboard with country-specific field rendering, language preference persistence, and translation display

### Reduction Promises Feature
- **Database**: Added reductionPromises table with relationships to schools and audits, including status enum (active, completed, cancelled)
- **Backend**: Implemented 5 REST API endpoints for CRUD operations and admin metrics aggregation
- **Metrics Utilities**: Created comprehensive conversion functions (shared/plasticMetrics.ts) for plastic-to-weight calculations and impact metrics
- **Audit Flow**: Extended audit form from 4 to 5 steps, with Step 5 requiring minimum 2 reduction promises
- **Teacher Dashboard**: Added "Our Promises" tab with impact summary, promise management (add/edit/delete), and dual metric displays (fun + serious)
- **Notification System**: Dismissible banner in Progress tab prompts for promises when audit is complete
- **Admin Features**: Individual school promise cards in Schools tab, and global aggregated metrics in Analytics tab
- **Impact Display**: Shows ocean impact (bottles, fish, sea turtles) and environmental impact (CO2, oil, waste) across all views

### Admin UI Improvements (October 2025)
- **Evidence Requirements Tab**: Integrated Evidence Requirements as a tab within the admin page instead of a separate page, maintaining tabbed UI visibility at all times
- **Navigation**: Changed Evidence Requirements button from navigation link to tab trigger, preventing tabbed UI from disappearing when clicked
- **Backwards Compatibility**: Restored `/admin/evidence-requirements` route that renders admin page with Evidence Requirements tab pre-selected via initialTab prop
- **Deep Linking**: Both `/admin` (defaults to Overview tab) and `/admin/evidence-requirements` routes now supported for direct navigation to specific tabs
- **Authentication Fix**: Updated useAuth hook to always check authentication on initial load (enabled: true), ensuring existing backend sessions are properly detected for route protection and testing scenarios
- **Analytics Dashboard Reorganization**: Restructured Overview tab analytics with nested tabs (Overview, Schools & Evidence, Plastic Waste Audits, User Engagement) to eliminate excessive scrolling and provide better access to all analytics sections at the same level

### Analytics Enhancements (October 2025)
- **Data Quality Fixes**: Fixed User Role Distribution query to display proper role names (Teacher, Admin, Head Teacher) instead of numeric values; improved Review Turnaround chart to handle edge cases, NULL values, and display "Insufficient Data" message when fewer than 5 reviewed items exist
- **Date Range Filtering**: Added DateRangePicker component to analytics dashboard with presets (Last 7/30/90 days, 1 year, All time, Custom); updated all 4 analytics backend queries to support optional date range filtering; fixed inclusive date range bug to ensure end date includes full final day
- **AI-Powered Insights**: Integrated OpenAI GPT-5 for automated analytics insights generation; service generates executive summaries, key insights, trends, and recommendations based on analytics data
- **PDF Export System**: Implemented complete PDF export functionality with:
  - Beautiful HTML report template with PCS branding (Navy, Blue, stage colors, Gilroy/Century Gothic fonts)
  - Puppeteer-based PDF generation (A4 format, print-optimized)
  - Optional AI insights toggle (adds ~5-10 seconds to generation)
  - Admin-only endpoint: `POST /api/admin/analytics/export-pdf`
  - Frontend export button with loading states and success/error toasts
  - **Note**: Requires Chromium system dependencies (libglib-2.0, etc.) which may not be available in all deployment environments

### Multi-Language Support (October 2025)
- **Supported Languages**: Added comprehensive support for 14 languages: English, Greek, Arabic, Chinese, Dutch, French, German, Indonesian, Italian, Korean, Portuguese, Russian, Spanish, Welsh
- **Database Schema**: Added `preferredLanguage` field to users table with default value 'en', storing user's language preference in their profile
- **Translation Infrastructure**: 
  - Created translation directory structure for all languages with 10 JSON files each (common, landing, dashboard, resources, forms, auth, admin, map, search, newsletter)
  - Updated language names in common.json for all 14 languages with native language labels (e.g., "Français" for French, "Español" for Spanish)
  - Implemented generic lazy-loading system in i18n.ts using dynamic imports - English loaded upfront, all other languages loaded on demand
- **User Interface**:
  - Updated LanguageSwitcher component to display all 14 language options with scrollable dropdown
  - Language names always display in their native script (hardcoded) regardless of current UI language - ensures users can always find their language even if UI is in an unfamiliar language
  - Added language selection dropdown to sign-up/register form with native language names
  - Language switcher in header allows real-time language switching
- **Authentication Integration**:
  - Updated register and login API responses to include preferredLanguage field
  - Modified /api/auth/user endpoint to return user's language preference
  - Enhanced useAuth hook to automatically apply user's preferred language on initial load, login, and registration
  - Language preference persists across sessions and page reloads when authenticated
- **User Experience**: Users select language during registration, preference is saved to profile, language automatically applies on login, persists across sessions; temporary language changes revert to user preference on page reload; language dropdown always shows native names (e.g., "English" stays "English" even when UI is in Greek)
- **Testing**: E2E tests validate complete flow including language selection during registration, persistence across page reloads, automatic application of saved preference, and native language name display in dropdowns