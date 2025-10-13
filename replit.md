# Plastic Clever Schools Web Application

## Overview
This project is a web application for the Plastic Clever Schools program, aiming to reduce plastic usage in schools through a three-stage program (Inspire, Investigate, Act). It offers a public website and an integrated CRM system providing educational resources, evidence tracking, case studies, reduction promise tracking, and administrative tools. The core purpose is to empower schools in environmental responsibility and scale the program's impact.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
### Frontend
-   **Framework**: React with TypeScript (Vite)
-   **Routing**: Wouter
-   **State Management**: TanStack Query
-   **UI**: Radix UI primitives with shadcn/ui components, styled using Tailwind CSS (custom palette)
-   **Forms**: React Hook Form with Zod validation
-   **File Uploads**: Uppy.js for direct-to-cloud uploads.
-   **Icons**: Lucide React
-   **Avatars**: DiceBear (thumbs style)

### Backend
-   **Runtime**: Node.js with Express.js
-   **Database**: PostgreSQL (Neon serverless) with Drizzle ORM.
-   **Authentication**: Local password and Google OAuth, using Express sessions with PostgreSQL store.
-   **API**: RESTful with robust error handling.
-   **File Storage**: Google Cloud Storage for evidence, resources, and images.

### Authentication & Authorization
-   **Identity**: Local password and Google OAuth.
-   **Roles**: Teacher, Head Teacher, Pending Teacher, Platform Admin.
-   **Permissions**: Role-Based Access Control (RBAC).
-   **School Team Management**: Hierarchical user management.
-   **Admin Invitations**: Token-based email invitation system.

### Key Data Models
-   **Users**: Teachers linked to schools with roles.
-   **Schools**: Program progress tracking with preferred language support.
-   **Evidence**: Stage-specific file submissions with approval workflows.
-   **EvidenceRequirements**: Admin-configurable checklist.
-   **Audits**: Plastic waste audit data with approval workflow and analytics integration.
-   **ReductionPromises**: Plastic reduction commitments with impact calculations.
-   **Resources**: Educational materials.
-   **Case Studies**: Approved evidence for public display.
-   **Events**: Community events (workshops, webinars, training) with registration management, waitlists, and virtual meeting support. Images stored in Google Cloud Storage.
-   **EventRegistrations**: User event registrations with status tracking (registered, cancelled, waitlisted).
-   **EventAnnouncements**: SendGrid campaign history to track email announcements (recipient type, count, send timestamp).

### UI/UX Decisions
-   **Color Schemes**: PCS brand colors (Navy, Blue, Inspire Green, Investigate Yellow, Act Red).
-   **Typography**: Gilroy Bold for headers, Century Gothic Regular for body text.
-   **Design Approach**: Component-based using Radix UI and shadcn/ui.
-   **Page Structure**: Public and authenticated routes.
-   **Dashboard Features**: Tab-based navigation (Progress, Analytics, Resources, Team, Our Promises), dismissible notifications, comprehensive analytics with visualizations, dynamic evidence requirements, and reduction promises management.
-   **Landing Page**: Hero section, Impact Ribbon, teacher testimonial, program stage overview, CTA, and Instagram feed.
-   **Analytics System**: Plastic waste audit data automatically converts into visual analytics for both teacher and admin dashboards.
-   **Reduction Promises System**: Schools commit to reducing plastic items, with audit integration, dashboard management, impact tracking (ocean-themed and environmental metrics), and admin analytics.
-   **Multi-Step School Registration**: Redesigned 3-step wizard for school registration, adapting fields based on country.
-   **Multi-Language Support**: Comprehensive i18next-based internationalization system:
    -   **14 Languages**: English, Greek, Arabic, Chinese, Dutch, French, German, Indonesian, Italian, Korean, Portuguese, Russian, Spanish, Welsh
    -   **140 Translation Files**: 10 namespaces (common, landing, forms, dashboard, auth, admin, search, resources, newsletter, map) × 14 languages
    -   **RTL Support**: Automatic right-to-left layout switching for Arabic
    -   **Complete Coverage**: ALL pages, forms, buttons, navigation, and content fully translated (no hardcoded English)
    -   **User Preference**: Language selection persists in user profile and localStorage
    -   **Lazy Loading**: Translation files load on-demand for performance
    -   **Native Names**: Language switcher displays names in native script (한국어, 中文, العربية, etc.)
-   **Admin UI Improvements**: Integrated Evidence Requirements as a tab within the admin page, improved navigation, and reorganized analytics dashboard with nested tabs. School detail dialog now includes editable preferred language field with inline editing and immediate UI updates.
-   **Analytics Enhancements**: Improved data quality, added date range filtering, integrated OpenAI GPT-5 for AI-powered insights, and implemented PDF export functionality with PCS branding.
-   **Events System**: Comprehensive event management with:
    -   **Admin Features**: Create/edit events with direct image upload to object storage, dates, locations, virtual meeting links, capacity limits, waitlists, and registration deadlines
    -   **User Features**: Browse upcoming events with Luma-style modal design, register/cancel, view registration status in polished UI with hero images and responsive layout
    -   **Image Upload**: Direct file upload to Google Cloud Storage with validation (jpg/png/webp, max 10MB), preview, and public ACL for accessibility
    -   **Email Notifications**: SendGrid integration for registration confirmations, cancellations, event reminders, and update notifications
    -   **Newsletter Integration**: SendGrid batch email campaigns for event announcements and weekly digests (supports "all teachers" or custom recipient lists)
    -   **Analytics Dashboard**: Event metrics, registration trends, top events, event type distribution, and conversion rates with recharts visualizations
    -   **UI/UX Design**: Luma-inspired event modals with hero images, two-column responsive layout, sticky info cards, prominent CTAs, and modern visual polish

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
-   **AI Integration**: OpenAI GPT-5
-   **PDF Generation**: Puppeteer

## Recent Changes (October 2025)

### Task 1: School Preferred Language Field (Completed)
- Added `primaryLanguage` field to SchoolData interface in database schema
- Implemented editable preferred language field in admin school detail dialog
- Added language dropdown with 14 supported languages (en, es, fr, de, it, pt, nl, ru, zh, ko, ar, id, el, cy)
- Implemented update mutation with immediate UI state synchronization
- Architect-reviewed and approved

### Task 2: Renamed "Promises" to "Action Plan" (Completed)
- Updated all user-facing text throughout the UI:
  - Home page dashboard tabs and sections
  - Admin panel analytics and management sections
  - Plastic Waste Audit component dialogs and buttons
- Changed: tab labels, button text, toast messages, dialog titles, placeholders
- Internal code (variables, API routes, database tables) kept unchanged for data safety
- Architect-reviewed and approved

### Task 3: Bulk Email Language Filter (Completed)
- Added language filter to bulk email functionality in admin panel
- Backend: Updated `bulkEmailSchema` to validate language parameter (14 languages + "all")
- Backend: Modified `storage.getSchools` to filter by `primaryLanguage` when specified
- Backend: Updated bulk email route handler to properly pass language filter to storage layer
- Frontend: Added language dropdown to school filters in bulk email form
- UI displays all 14 supported languages with "All Languages" as default
- End-to-end tested and architect-reviewed
- Allows admins to target emails to schools by preferred language