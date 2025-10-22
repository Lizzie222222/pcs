# Plastic Clever Schools Web Application

## Overview
This web application supports the Plastic Clever Schools program, aiming to reduce plastic in schools through a three-stage process: Inspire, Investigate, and Act. It features a public website and an integrated CRM, providing educational resources, evidence tracking, case studies, plastic reduction promise tracking, and administrative tools. The project seeks to cultivate environmental responsibility and expand the program's reach by offering a comprehensive platform for schools to engage with environmental initiatives.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application uses a modern web architecture with distinct frontend and backend components, a robust data model, and comprehensive UI/UX design.

### Frontend
-   **Frameworks & Libraries**: React with TypeScript (Vite), Wouter, TanStack Query.
-   **UI/Styling**: Radix UI primitives, shadcn/ui components, and Tailwind CSS.
-   **Forms**: React Hook Form with Zod validation.
-   **File Uploads**: Uppy.js.
-   **Icons**: Lucide React.
-   **Avatars**: DiceBear.

### Backend
-   **Runtime**: Node.js with Express.js.
-   **Database**: PostgreSQL (Neon serverless) with Drizzle ORM.
-   **Authentication**: Local password and Google OAuth, utilizing Express sessions.
-   **API**: RESTful architecture.
-   **File Storage**: Google Cloud Storage.

### Authentication & Authorization
-   **Identity Providers**: Local password and Google OAuth.
-   **Role-Based Access Control (RBAC)**: Supports roles like Teacher, Head Teacher, Pending Teacher, and Platform Admin.
-   **User Management**: Hierarchical school team management and token-based admin invitation system.

### Key Data Models
Core entities include Users, Schools, Evidence (with approval workflows), Audit data, Reduction Promises (Action Plans), Resources, Case Studies, Events, Media Assets, and Printable Form Submissions.

### UI/UX Decisions
-   **Design System**: PCS brand colors, specific fonts (Gilroy Bold, Century Gothic Regular), and a component-based design using Radix UI and shadcn/ui.
-   **Navigation**: Public and authenticated routes, including a tab-based dashboard and enhanced admin navigation.
-   **Features**: Comprehensive analytics with visualizations and PDF export, dynamic evidence requirements, student-led action plans, multi-step school registration (country-adaptive), and multi-language support (14 languages, RTL support).
-   **Admin UI**: Integrated evidence requirements, school detail management, manual school progression, an 8-step Case Study Wizard (including template selection, basic info, content, media, enhancements, categories/tags, publication settings, and review/publish), and Resource Management Visibility Controls.
-   **Events System**: Full event lifecycle management, event landing pages with YouTube embedding, downloadable resources, testimonials, and automated email reminders.
-   **Content Management**: Printable forms system with admin review, and an Evidence Gallery with advanced filtering.
-   **Communication**: Enhanced bulk email editor with image picker and AI-powered auto-translation.
-   **SEO Optimization**: Server-side meta tag injection for case study pages, JSON-LD structured data, proper heading hierarchy, and descriptive image alt text, with a dedicated publication settings step in the wizard.

## External Dependencies
-   **Database**: Neon PostgreSQL
-   **File Storage**: Google Cloud Storage
-   **Authentication**: Google OAuth
-   **Email Services**: SendGrid
-   **Build Tool**: Vite
-   **Hosting/Deployment**: Replit
-   **AI Integration**: OpenAI GPT-5 (specifically GPT-4o-mini for translations)
-   **PDF Generation**: Puppeteer

## Recent Changes

### Events System Enhancements (October 22, 2025)
**Production-ready improvements to event registration and user experience - All features tested**

**Completed Features (10/10 tasks):**
1. ✅ **Capacity Tracking** - Backend now includes registrationsCount in all event API endpoints for accurate "spots left" display
2. ✅ **Event Access Links** - Registered users see "Join Meeting" or "View Event" buttons in My Events section
3. ✅ **Live/Starting Soon Badges** - Events display real-time status badges (Live Now, Starting Soon, Full)
4. ✅ **Dashboard Notifications** - Banner alerts users 30 minutes before registered events start
5. ✅ **Calendar Integration** - Add to Calendar button downloads .ics files for all major calendar apps
6. ✅ **Timezone Display** - Event times show "(your time)" to indicate local timezone conversion
7. ✅ **Share Functionality** - Copy link button for easy event sharing via clipboard
8. ✅ **Public Event Pages** - Event-live pages accessible without login, display meeting links when live
9. ✅ **Architect Review** - All changes reviewed and approved with minor optimization notes
10. ✅ **End-to-End Testing** - Full registration flow tested via Playwright automation

**Technical Implementation:**
- **Backend (server/routes.ts)**: Added registration count aggregation to `/api/events`, `/api/events/:id`, and `/api/my-events` endpoints using `storage.getEventRegistrationCount()`
- **EventsSection Component**: Complete rewrite with two sections (My Events / All Events), access buttons, timing badges, calendar export (.ics generation), timezone indicators, and copy-to-clipboard
- **EventNotificationBanner**: New component that auto-refreshes every 60 seconds, shows events starting within 30 minutes, dismissible with persistent state
- **Dashboard Integration**: Banner added to home.tsx above tab content, visible across all tabs
- **Event-live Page**: Enhanced to display meeting links prominently with "Join Meeting Now" button when event is live

**User Experience Improvements:**
- Clear visual hierarchy: My Events (top) → All Events (below)
- Intuitive access: One-click join for virtual meetings or view event-live pages
- Proactive notifications: 30-minute advance warning for registered events
- Calendar sync: Native .ics format compatible with Google Calendar, Outlook, Apple Calendar
- Easy sharing: Copy link with toast confirmation (clipboard API with fallback)
- Public accessibility: Anyone with link can view event-live pages (no login required)

**Performance Notes:**
- N+1 query pattern for registration counts (one count query per event in list)
- Acceptable for current event volumes (typically 6-10 events displayed)
- Future optimization: Batch count queries in storage layer if event volumes increase

**Files Modified (5 total):**
- server/routes.ts (event endpoints with registrationsCount)
- client/src/components/dashboard/EventsSection.tsx (complete rewrite)
- client/src/components/dashboard/EventNotificationBanner.tsx (new component)
- client/src/pages/home.tsx (added notification banner)
- client/src/pages/event-live.tsx (added meeting link display)

**Testing Coverage:**
- End-to-end test validates: user login, event registration, capacity tracking, access buttons, notification banner, calendar download, link copying, public event page access, meeting link functionality, notification dismissal

**Impact:**
- Fixed critical bug: Capacity counter now updates in real-time when users register
- Solved user pain point: Clear access to registered events with direct join links
- Enhanced engagement: Proactive notifications ensure users don't miss events
- Improved accessibility: Public event pages shareable with anyone (teachers, parents, students)

---

### Case Study Wizard UX Fixes (October 22, 2025)
**Production-ready improvements to 8-step wizard - All issues resolved**

**Completed Fixes (12/12 tasks):**
1. ✅ **Sidebar Scrolling** - Fixed by changing Dialog overflow and restructuring editor layout with flexbox
2. ✅ **Step Numbering** - Corrected step header numbering (Content=3, Media=4, Enhancements=5) to match wizard structure
3. ✅ **Image Loading** - Added comprehensive error logging and safe DOM-based fallback UI for failed image loads
4. ✅ **School Dropdown Counts** - New `/api/schools-with-image-counts` endpoint shows approved evidence image counts per school
5. ✅ **Hero Image Preview** - Verified already working in Step 7 Publication Settings
6. ✅ **Live Preview** - Verified already working with full enhancement display (quotes, metrics, timeline)
7. ✅ **Priority Dropdown** - Reverted from slider to select dropdown (Normal/High/Highest)
8. ✅ **Validation Messages** - Enhanced error messages with specific counts and quick step navigation links
9. ✅ **TypeScript Errors** - Fixed all 17 LSP errors in server/routes.ts
10. ✅ **XSS Security** - Eliminated innerHTML vulnerability in SortableImageCard and ImagePreviewCard error handlers
11. ✅ **Step 3 Content Validation** - Fixed HTML content detection using hasActualContent helper (strips empty tags)
12. ✅ **Dialog Scroll Fix** - DialogContent changed to overflow-hidden, editor uses proper flexbox layout

**Technical Implementation:**
- **Sidebar Fixed Position**: Dialog overflow-hidden, editor flexbox layout (h-[95vh] flex flex-col), only content area scrolls
- **Step Headers**: Updated Step2Content.tsx, Step3Media.tsx, Step4Enhancements.tsx to display correct step numbers
- **Image Debugging**: Safe DOM element creation using createElement/createElementNS with textContent (prevents XSS)
- **School API**: New endpoint aggregates approved evidence per school with efficient queries
- **Priority Control**: Select component with options: Normal (0), High (50), Highest (100)
- **Validation UI**: Step8Review shows specific deficit counts (e.g., "Need 2 more images - have 1, need 3 minimum")
- **Content Validation**: hasActualContent() helper strips HTML tags and checks for real text (fixes TipTap empty `<p></p>` issue)

**Security Enhancements:**
- Replaced all `innerHTML` assignments with safe DOM construction methods
- User-controlled image URLs now set via `textContent` to prevent script injection
- Comprehensive input validation and type safety improvements

**Files Modified (12 total):**
- client/src/components/admin/CaseStudyEditor.tsx (validation + layout fixes)
- client/src/components/admin/CaseStudyManagement.tsx (Dialog overflow fix)
- client/src/components/admin/wizard/steps/Step2Content.tsx
- client/src/components/admin/wizard/steps/Step3Media.tsx
- client/src/components/admin/wizard/steps/Step4Enhancements.tsx
- client/src/components/admin/wizard/steps/Step2BasicInfo.tsx
- client/src/components/admin/wizard/steps/Step7PublicationSettings.tsx
- client/src/components/admin/wizard/steps/Step8Review.tsx
- client/src/components/admin/wizard/media-sections/SortableImageCard.tsx
- client/src/components/admin/wizard/media-sections/ImagePreviewCard.tsx
- client/src/components/admin/wizard/media-sections/SelectedMediaSummary.tsx
- server/routes.ts

**Impact:**
- **Fixed Scrolling**: Sidebar stays completely static when scrolling content (tested and verified)
- **Better UX**: Static sidebar, consistent step numbering, clear validation feedback
- **Working Validation**: Step 3 now properly detects when description/impact are filled
- **Easier Selection**: School dropdown shows image availability for informed decisions
- **Improved Security**: XSS vulnerabilities eliminated, type safety enhanced
- **Production Ready**: All issues architect-reviewed and verified working