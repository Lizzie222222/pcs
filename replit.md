# Plastic Clever Schools Web Application

## Overview
This web application supports the Plastic Clever Schools program, aiming to reduce plastic in schools through a three-stage process: Inspire, Investigate, and Act. It features a public website and an integrated CRM, providing educational resources, evidence tracking, case studies, plastic reduction promise tracking, and administrative tools. The project seeks to cultivate environmental responsibility and expand the program's reach.

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
-   **Design System**: PCS brand colors, Gilroy Bold for headers, Century Gothic Regular for body text. Component-based design using Radix UI and shadcn/ui.
-   **Navigation**: Public and authenticated routes, including a tab-based dashboard.
-   **Features**: Comprehensive analytics with visualizations and PDF export, dynamic evidence requirements, student-led action plans, multi-step school registration (country-adaptive), and multi-language support (14 languages, RTL support).
-   **Admin UI**: Enhanced navigation, integrated evidence requirements, school detail management, manual school progression, Case Study Wizard, and Resource Management Visibility Controls.
-   **Events System**: Full event lifecycle management, event landing pages with YouTube embedding, downloadable resources, testimonials, and automated email reminders.
-   **Content Management**: Printable forms system with admin review, and an Evidence Gallery with advanced filtering.
-   **Communication**: Enhanced bulk email editor with image picker and AI-powered auto-translation.
-   **SEO Optimization**: Server-side meta tag injection for case study pages, JSON-LD structured data, proper heading hierarchy, and descriptive image alt text.

## External Dependencies
-   **Database**: Neon PostgreSQL
-   **File Storage**: Google Cloud Storage
-   **Authentication**: Google OAuth
-   **Email Services**: SendGrid
-   **Build Tool**: Vite
-   **Hosting/Deployment**: Replit
-   **AI Integration**: OpenAI GPT-5 (specifically GPT-4o-mini for translations)
-   **PDF Generation**: Puppeteer

## Recent Updates

### Case Study Wizard Redesign (October 21, 2025)
**Complete redesign of admin case study creation interface - PRODUCTION READY**

**Completed Features (12/15 tasks):**
1. **Sidebar Navigation** - Replaced horizontal stepper with collapsible vertical sidebar showing real-time validation, progress badges, and click-to-navigate functionality
2. **Typography Cleanup** - Established semantic H1→H2→H3→H4 hierarchy, removed duplicate headers, applied consistent spacing
3. **Media Workflow Refactor** - Organized Step 3 into subsections: Evidence Grid, Upload Panel, Before/After Builder, Gallery Grid
4. **Drag-and-Drop Image Reordering** - @dnd-kit integration with keyboard accessibility, stable nanoid IDs, and defensive guards
5. **Before/After Preview** - Reusable BeforeAfterSlider component with interactive clipPath reveal slider
6. **Rich Text Editor** - TipTap editor for description/impact fields with formatting toolbar (Bold, Italic, Headings, Lists, Blockquotes)
7. **Live Preview System (Complete):**
   - **7a. Preview Component Extraction** - Refactored CaseStudyPreview module with 11 reusable components, eliminated code duplication between admin and public pages
   - **7b. Preview Container** - Responsive split layout (60/40 desktop, full mobile), collapse control, keyboard-accessible toggle with ARIA attributes, localStorage persistence
   - **7c. Form-to-Preview Transformer** - Debounced form watching (300ms), memoized transformation, placeholder fallbacks, school data integration
   - **7d. Preview Integration** - UI hints in Step 5 Review, sidebar navigation tips, mobile notices, preview indicators
8. **Template-Switching Bug Fix** - Removed dynamic key prop causing unmount/remount issues, conditional rendering now works correctly for template-specific sections
9. **Enhanced Review Step** - Grouped summaries (Template/Content/Media/Enhancements), dynamic requirements checklist with validation, quick-nav links to fix errors, accurate video/image counts

**Technical Implementation:**
- Drag-and-drop uses @dnd-kit/core with stable unique IDs (nanoid), keyboard sensors, focusable button handles, ARIA labels
- BeforeAfterSlider shared between admin wizard and public pages, eliminates code duplication
- RichTextEditor integrated with react-hook-form, outputs HTML, supports edit flows
- Live preview uses React Context, useDebounce hook, useMemo optimization, nullable context pattern for safe hook usage
- Template validation respects each template's config (optional vs required fields)
- All components have proper test IDs for playwright testing
- All React Hook rules followed (hooks called unconditionally at top level)

**Key Files:**
- CaseStudyEditor.tsx, SidebarWizardNav.tsx, Step3Media.tsx, Step5Review.tsx
- BeforeAfterSlider.tsx, RichTextEditor.tsx
- PreviewContainer.tsx, formToPreviewTransformer.ts, useDebounce.ts
- CaseStudyPreview.tsx, case-study-preview/index.ts (11 extracted components)
- templateConfigurations.ts, TemplateTypeSelector.tsx

**Remaining Tasks (3/15 - Future Enhancements):**
- Version control system (case_study_versions table, draft/published tracking, revision history)
- Approval workflow (review_status enum, admin assignment, email notifications)
- Enhanced tagging system (case_study_tags table, autocomplete, multi-select filtering)

**Optional Enhancement:**
- Accessibility improvements (aria-live announcements, enhanced screen reader support)