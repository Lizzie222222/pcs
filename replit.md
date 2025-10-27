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
Core entities include Users, Schools, Evidence (with approval workflows), Audit data, Reduction Promises (Action Plans), Resources, Case Studies, Events, Event Banners, Media Assets, Printable Form Submissions, Import Batches, and Notifications (for resource alerts).

### UI/UX Decisions
-   **Design System**: PCS brand colors, specific fonts (Gilroy Bold, Century Gothic Regular), and a component-based design using Radix UI and shadcn/ui. Custom favicon using the official PCS logo in multiple sizes for optimal display across all devices and platforms.
-   **Navigation**: Public and authenticated routes, including a tab-based dashboard and enhanced admin navigation.
-   **Features**: Comprehensive analytics with visualizations and PDF export, dynamic evidence requirements, student-led action plans, multi-step school registration (country-adaptive with complete i18n support across all 3 steps, registration step labels, form fields, validation messages, and buttons), and multi-language support (14 languages, RTL support). Includes an AI-powered live chat widget.
-   **Admin UI**: Integrated evidence requirements, school detail management, manual school progression, an 8-step Case Study Wizard, Resource Management with file replacement capability and visibility controls, and Data Import System. PDF export now allows section selection. Multi-language event creator with language tab badges showing content counts, copy-from-language dropdown for duplicating content across languages, collapsible content overview panel displaying status across all 14 languages, and contextual help alerts explaining translation strategies for videos and files. Bulk resource upload with drag-and-drop functionality, batch metadata editing, resource pack creation, shareable preview links with PDF viewer, and AI-powered auto-fill that analyzes uploaded files to suggest metadata (description, stage, theme, age range, resource type) using OpenAI GPT-4o-mini. **Review Queue** promoted to dedicated top-level navigation tab with three sub-tabs (Evidence, Audits, Photo Consent), featuring real-time badge counts for pending items, streamlined approve/reject workflows for each review type, comprehensive photo consent review including document preview links and required rejection notes, and safeguarding confirmation dialog that warns admins when approving evidence from schools without approved photo consent (provides context-aware messaging based on consent status and requires explicit confirmation). Evidence review queue displays school names with building icons for better context. **Permission & Visibility Indicators**: Evidence gallery displays school photo consent status with color-coded shield badges (green for approved, yellow for pending, red for missing/rejected). Evidence details dialog shows clear visibility status (Public/Private) and permission warnings. Case study media selector automatically filters to show only images from schools with approved photo consent and public visibility, with informative alerts explaining permission requirements.
-   **Events System**: Full event lifecycle management, event landing pages with multi-language support, YouTube embedding, downloadable resources, testimonials, automated email reminders, capacity tracking, access links, real-time status badges, dashboard notifications, and calendar integration. Includes event promotion features like customizable banners and an events carousel on the landing page. Admin can attach existing resources from the resource library to events via a card-based selector with image thumbnails (handles GCS signed URLs with CORS support) and file type icons; attached resources display on public event pages with download functionality.
-   **Inspiration Page**: Unified gallery displaying both curated case studies and approved school evidence submissions with smart sorting and filtering.
-   **Resources System**: Enhanced resources page with language tabs, gradient-styled cards, NEW badges (< 7 days), RECOMMENDED badges (stage-matching), smart resource ordering based on school stage, and locked resource visibility for non-registered users. Automatic notification system alerts schools when new resources match their current stage. Admin can replace resource files while maintaining the same resource ID.
-   **Notifications System**: Real-time notification system with bell icon in navigation showing unread count (pulsing animation), dashboard notification banner for new resources, automatic notification creation when resources are added/updated, and user-dismissible notifications with read tracking.
-   **Content Management**: Printable forms system with admin review, and an Evidence Gallery with advanced filtering. Server-side image compression is applied to evidence file uploads.
-   **Communication**: Enhanced bulk email editor with image picker and AI-powered auto-translation. New Contact Us and Help Center pages provide user support. Evidence review notification emails include the reviewer's name (both approval and rejection emails show which admin reviewed the submission).
-   **SEO Optimization**: Server-side meta tag injection for case study pages, JSON-LD structured data, proper heading hierarchy, and descriptive image alt text.
-   **User Profile Management**: Comprehensive user profile page for editing details, language preferences, password changes, and account deletion.
-   **Legal Pages**: Privacy Policy and Terms & Conditions pages fully internationalized with comprehensive translations covering all 13 sections (Privacy) and 10 sections (Terms) respectively, including nested subsections and bullet points. Both pages use a reusable Footer component to eliminate code duplication and support all 14 languages.

## External Dependencies
-   **Database**: Neon PostgreSQL
-   **File Storage**: Google Cloud Storage
-   **Authentication**: Google OAuth
-   **Email Services**: SendGrid
-   **Build Tool**: Vite
-   **Hosting/Deployment**: Replit
-   **AI Integration**: OpenAI GPT-4o-mini
-   **PDF Generation**: Puppeteer
-   **Image Processing**: Sharp library (for compression)

## Recent Changes

### Admin Interface Refactoring (October 2025)
**Goal**: Refactor the monolithic 8,572-line admin.tsx file into maintainable components to enable efficient multi-admin collaboration and prepare for future real-time features.

**Completed**:
- Created shared infrastructure in `client/src/components/admin/shared/`:
  - `types.ts`: Shared TypeScript types (AdminStats, PendingEvidence, PendingAudit, etc.)
  - `hooks.ts`: Reusable React hooks
  - `constants.ts`: Shared constants
- Extracted Reviews section (625 lines) into `ReviewsSection` component at `client/src/components/admin/reviews/ReviewsSection.tsx`
  - Three sub-tabs: Evidence Review, Audit Review, Photo Consent Review
  - Photo consent mutations centralized in admin.tsx and passed as props to avoid endpoint drift
  - Badge queries (pendingAudits, pendingPhotoConsent) remain in admin.tsx for navigation
- Extracted Schools section (~200 lines) into `SchoolsSection` component at `client/src/components/admin/schools/SchoolsSection.tsx`
  - All school-specific state, queries, and mutations co-located in component
  - Preserves bulk actions, filtering, school detail viewing, photo consent controls
  - 14 state variables, 4 queries, 5 mutations properly encapsulated
- Extracted Teams section (~40 lines) into `TeamsSection` component at `client/src/components/admin/teams/TeamsSection.tsx`
  - Cleanly composes three sub-components: AssignTeacherForm, SchoolTeachersList, VerificationRequestsList
  - Sub-components extracted to `client/src/components/admin/teams/components/`
  - All teacher assignment and verification workflows preserved
- Extracted Evidence Requirements section (~600 lines) into `EvidenceRequirementsSection` component at `client/src/components/admin/evidence-requirements/EvidenceRequirementsSection.tsx`
  - All evidence requirements state, queries, and mutations co-located in component (641 lines)
  - 6 state variables, 1 query, 4 mutations (create, update, delete, reorder)
  - Preserves stage filtering (Inspire/Investigate/Act), drag-and-drop reordering, resource linking
  - allResources query passed as prop (shared with Events section)
  - Comprehensive testing: CRUD operations, stage filtering, resource selector all verified
- Extracted Events section (3,700 lines) into `EventsSection` component at `client/src/components/admin/events/EventsSection.tsx`
  - Largest and most complex extraction: 40+ state variables, 7 queries, 14 mutations
  - Preserves all functionality: multi-language support, page builder, analytics, registrations, announcements, banners
  - 6 helper functions: generateSlug, copyContentFromLanguage, savePageBuilderWithStatus, handleEventImageUpload, removeEventImage, handlePackFileUpload
  - allResources and resourcesLoading passed as props (shared with Evidence Requirements)
  - Fixed JSX syntax error (missing closing div tag)
  - Comprehensive testing: dialog opening, tab switching, analytics display, event creation workflows
- Extracted Activity Logs section (302 lines) into `ActivityLogsSection` component at `client/src/components/admin/activity-logs/ActivityLogsSection.tsx`
  - All activity log state, queries, and mutations co-located in component
  - Navigation: Schools dropdown → User Activity menu item
  - Fixed critical null reference bug: Added null-safe user handling with optional chaining and "Unknown User" fallback for deleted users
  - Fixed pagination NaN bug: Changed to use API response values (page, limit, totalPages) instead of props for accurate display
  - Architect approved: Production-ready with robust error handling
- Reduced admin.tsx from 8,572 lines to 1,277 lines (total reduction: 7,295 lines, 85%)
- Maintained tab-based navigation without page reloads for fast switching
- Fixed regressions: duplicate ActivityLogsTab, orphaned schoolsError references, broken dialog blocks, JSX syntax error in EventsSection
- All sections tested and passing with zero LSP errors

**Architecture Pattern**:
- Shared mutations passed as props from admin.tsx to section components
- State, queries, and mutations co-located within feature components
- Queries remain in TanStack Query cache for data consistency
- Prop drilling acceptable short-term; may evolve to shared context only if multiple tabs need same controls

**Status**:
All major admin sections successfully extracted. The monolithic admin.tsx has been reduced by 85%, with all extracted components tested, architect-approved, and production-ready. Tab-based navigation preserved throughout for fast switching without page reloads.

**Remaining Work**:
- Email section (already in separate component, no extraction needed)
- Final shell review and optimization
- Consider consolidating shared admin utilities/types as sections mature