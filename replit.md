# Plastic Clever Schools Web Application

## Overview
This web application supports the Plastic Clever Schools program, aiming to reduce plastic in schools through a three-stage process: Inspire, Investigate, and Act. It features a public website and an integrated CRM, providing educational resources, evidence tracking, case studies, plastic reduction promise tracking, and administrative tools. The project seeks to cultivate environmental responsibility and expand the program's reach by offering a comprehensive platform for schools to engage with environmental initiatives.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes
-   **Complete Dashboard Translation Coverage**: Systematically externalized ALL hardcoded text in school dashboard (home.tsx) to enable full internationalization across 14 languages. Added 51 new translation keys to dashboard.json covering: notifications (Evidence Approved, Action Required), round completion celebrations, certificates, resources tab (card titles, tips with emoji prefixes), action plan tooltips (detailed metric explanations), toast notifications (promise CRUD operations), and form validation messages. Updated all 13 non-English locale files with English placeholders ready for translation teams. Dashboard now fully supports multi-language switching with zero hardcoded English strings.
-   **PDF Export Section Selection**: Enhanced analytics PDF export with customizable section selection. Admins can now choose which sections to include via checkbox dialog: Overview (key metrics), Scores & Evidence (school progress and submissions), Plastic Waste Audits (audit data and top problem plastics), User Engagement (user roles and active schools), and AI Insights (executive summary, trends, recommendations). All sections checked by default. Template conditionally renders only selected sections while maintaining backward compatibility. Includes new Plastic Waste Audits section showing schools audited, total plastic items, top problem plastics, and per-school audit details with facilities tracking (recycling, composting, policy).
-   **Automatic Image Compression**: Implemented server-side image compression for evidence file uploads to reduce storage costs. Uses Sharp library to compress JPEG, PNG, WebP, TIFF, and BMP images to max 1920x1920 resolution at 85% quality while maintaining aspect ratio. Compression happens transparently through new `/api/evidence-files/upload-compressed` endpoint. Non-image files (PDFs, videos, etc.) are uploaded without modification. Compression statistics are logged server-side for monitoring storage savings.
-   **Contact Us & Help Center Pages**: Added two new customer-facing pages to improve user support. Contact Us page features a validated form (name, email, subject, message) that sends emails via SendGrid to the admin team. Help Center page organizes 27 FAQs across 6 categories (Getting Started, School Registration, Evidence, Resources, About Program, Technical Support) with real-time search/filter functionality using accordion UI. Both pages added to main navigation with i18n support.
-   **Dashboard Welcome Modal Fix**: Resolved issue where welcome modal appeared on every dashboard visit instead of only once. Updated `/api/auth/onboarding-complete` endpoint to refresh session user object (`req.user.hasSeenOnboarding = true`) after database update, and improved frontend useEffect dependency array.
-   **Events Page Footer**: Added consistent footer component to both events listing page (events.tsx) and event detail pages (event-live.tsx), matching the landing page design across all page states.

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
Core entities include Users, Schools, Evidence (with approval workflows), Audit data, Reduction Promises (Action Plans), Resources, Case Studies, Events, Event Banners, Media Assets, Printable Form Submissions, and Import Batches (for WordPress data migration tracking).

### UI/UX Decisions
-   **Design System**: PCS brand colors, specific fonts (Gilroy Bold, Century Gothic Regular), and a component-based design using Radix UI and shadcn/ui.
-   **Navigation**: Public and authenticated routes, including a tab-based dashboard and enhanced admin navigation.
-   **Features**: Comprehensive analytics with visualizations and PDF export, dynamic evidence requirements, student-led action plans, multi-step school registration (country-adaptive), and multi-language support (14 languages, RTL support).
-   **Admin UI**: Integrated evidence requirements, school detail management, manual school progression, an 8-step Case Study Wizard (including template selection, basic info, content, media, enhancements, categories/tags, publication settings, and review/publish), Resource Management Visibility Controls, and Data Import System for WordPress migration (CSV/Excel import with validation, deduplication, and audit tracking).
-   **Events System**: Full event lifecycle management, event landing pages with YouTube embedding, downloadable resources, testimonials, and automated email reminders, along with capacity tracking, access links, real-time status badges, dashboard notifications, and calendar integration. Admin event creation uses conditional workflows: virtual events/webinars keep the dialog open and automatically switch to the Page Builder tab after saving (with 100ms delay for state synchronization), while in-person events close the dialog normally. Event notifications system includes: badge counter showing new events count, "New" badges on event cards (gradient red-to-pink with sparkle emoji), and automatic timestamp tracking via `lastViewedEventsAt` field that updates 3 seconds after viewing Events section (regardless of new event count) to prevent perpetual "New" badges. Event promotion features include: customizable event banners with gradient backgrounds (10 curated presets: Ocean Blue, Sunset Orange, Forest Green, Purple Dream, Coral Reef, Teal Wave, Midnight Blue, Rose Garden, Sky Blue, Lime Fresh), configurable text and colors, displayed as a slim fixed banner at the top of the landing page (admin-managed with activation toggle and real-time preview), and an events carousel on the landing page showing up to 6 upcoming published events with registration links (replaced Instagram feed section).
-   **Inspiration Page**: Unified gallery displaying both curated case studies and approved school evidence submissions. Features smart sorting (case studies prioritized first), content type filtering (All Content/Case Studies/School Evidence), visual badges to distinguish content types, and support for minimal evidence content (single image + title). Evidence items link to dedicated detail pages while maintaining the same user experience as case studies. Backend implements efficient pagination with visibility controls (public evidence for all users, registered-only evidence for authenticated users).
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