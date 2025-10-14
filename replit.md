# Plastic Clever Schools Web Application

## Overview
This project is a web application for the Plastic Clever Schools program. Its main purpose is to reduce plastic usage in schools through a three-stage program (Inspire, Investigate, Act). The application provides a public website and an integrated CRM system, offering educational resources, evidence tracking, case studies, plastic reduction promise tracking, and administrative tools. It aims to empower schools in environmental responsibility and scale the program's impact.

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
-   **File Storage**: Google Cloud Storage for evidence, resources, images, and media assets.

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
-   **ReductionPromises**: Plastic reduction commitments with impact calculations (now referred to as "Action Plan" in UI).
-   **Resources**: Educational materials.
-   **Case Studies**: Approved evidence for public display.
-   **Events**: Community events with registration management, waitlists, and virtual meeting support.
-   **EventRegistrations**: User event registrations with status tracking.
-   **EventAnnouncements**: SendGrid campaign history for email announcements.
-   **MediaAsset**: Comprehensive media library for image and file management.
-   **PrintableFormSubmission**: Secure storage and management for printable form uploads.

### UI/UX Decisions
-   **Color Schemes**: PCS brand colors (Navy, Blue, Inspire Green, Investigate Yellow, Act Red).
-   **Typography**: Gilroy Bold for headers, Century Gothic Regular for body text.
-   **Design Approach**: Component-based using Radix UI and shadcn/ui.
-   **Page Structure**: Public and authenticated routes.
-   **Dashboard Features**: Tab-based navigation (Progress, Analytics, Resources, Team, Our Action Plan), dismissible notifications, comprehensive analytics with visualizations, dynamic evidence requirements, and reduction promises management.
-   **Landing Page**: Hero section, Impact Ribbon, teacher testimonial, program stage overview, CTA, and Instagram feed.
-   **Analytics System**: Plastic waste audit data automatically converts into visual analytics for both teacher and admin dashboards with date range filtering and AI-powered insights. PDF export functionality is included.
-   **Reduction Promises System (Action Plan)**: Student-led action plans for plastic reduction, independent of audit completion, with printable form downloads, dashboard management, impact tracking, and admin analytics. Action plan completion counts toward investigate stage progression.
-   **Multi-Step School Registration**: Redesigned 3-step wizard for school registration, adapting fields based on country.
-   **Multi-Language Support**: Comprehensive i18next-based internationalization system with 14 languages, RTL support, complete UI coverage, user preference persistence, lazy loading, and native language names.
-   **Admin UI Improvements**: Integrated Evidence Requirements, two-tier navigation system (5 primary categories with dropdowns: Dashboard, Schools, Content, Program, Communications), reorganized analytics dashboard, school detail dialog with editable preferred language, manual school progression management, and admin/partner evidence submission on behalf of schools.
-   **Events System**: Comprehensive event management with admin creation/editing, user browsing/registration, direct image upload to object storage, email notifications via SendGrid, newsletter integration, and analytics dashboard with recharts visualizations. Luma-inspired modals and responsive design.
-   **Printable Forms System**: Allows generation and download of blank PDF forms, and upload/management of completed forms with admin review workflows.
-   **Evidence Gallery**: Comprehensive admin panel for browsing all evidence submissions, replacing Media Library. Features advanced filtering (stage, country, status, visibility), PDF thumbnails using pdfjs-dist, school submission history, and bulk operations support. PDF files display rendered thumbnails on canvas for quick preview.
-   **PDF Viewer Integration**: Evidence files (both images and PDFs) use EvidenceFilesGallery component with full PDF viewing in iframe, thumbnail generation using pdfjs-dist, and download functionality.
-   **Bulk Email Editor**: Enhanced with an image picker integrated with the Media Library and AI-powered auto-translation for emails based on school's preferred language.

## External Dependencies
-   **Database**: Neon PostgreSQL
-   **File Storage**: Google Cloud Storage
-   **Authentication**: Google OAuth
-   **Email Services**: SendGrid for transactional and bulk emails.
-   **Build Tool**: Vite
-   **Hosting/Deployment**: Replit
-   **AI Integration**: OpenAI GPT-5 (specifically GPT-4o-mini for translations).
-   **PDF Generation**: Puppeteer