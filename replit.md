# Plastic Clever Schools Web Application

## Overview
This web application supports the Plastic Clever Schools program, aiming to reduce plastic in schools through a three-stage process: Inspire, Investigate, and Act. It provides a public website and an integrated CRM, offering educational resources, evidence tracking, case studies, plastic reduction promise tracking, and administrative tools. The project aims to foster environmental responsibility and expand the program's reach by offering a comprehensive platform for schools to engage with environmental initiatives.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application employs a modern web architecture with distinct frontend and backend components, a robust data model, and comprehensive UI/UX design.

### Frontend
-   **Frameworks & Libraries**: React with TypeScript (Vite), Wouter, TanStack Query.
-   **UI/Styling**: Radix UI primitives, shadcn/ui components, Tailwind CSS. PCS brand colors, specific fonts (Gilroy Bold, Century Gothic Regular).
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
Core entities include Users, Schools, Evidence (with approval workflows and assignment), Audit Logs, Reduction Promises (Action Plans), Resources, Case Studies, Events, Event Banners, Media Assets, Printable Form Submissions, Import Batches, Migration Logs, Notifications, Document Locks, Chat Messages, Health Checks, and Uptime Metrics.

### UI/UX Decisions
-   **Design System**: Component-based design using Radix UI and shadcn/ui, custom favicon. Consistent use of solid PCS brand colors and professional typography.
-   **Navigation**: Public and authenticated routes, tab-based dashboard, enhanced admin navigation.
-   **Core Features**: Comprehensive analytics (visualizations, PDF export), dynamic evidence requirements, student-led action plans, multi-step school registration (country-adaptive with i18n), multi-language support (14 languages, RTL).
-   **Admin UI**: Integrated evidence requirements, school detail management, manual school progression, Case Study Wizard, Resource Management, Data Import System with Legacy User Migration, multi-language event creator, bulk resource upload with AI auto-fill, Review Queue (Evidence, Audits, Photo Consent).
-   **Mobile Responsiveness**: Full mobile optimization for admin panel (responsive headers, navigation, collaboration sidebar, tables, forms).
-   **Legacy User Migration**: Comprehensive data migration tool from old WordPress (CSV import, dry-run, deduplication, user creation, stage mapping, onboarding notices).
-   **Events System**: Full lifecycle management, landing pages (multi-language, YouTube embedding, resources, testimonials), automated email reminders, capacity tracking, calendar integration.
-   **Inspiration Page**: Unified gallery of case studies and approved evidence with smart sorting/filtering.
-   **Resources System**: Enhanced page with language tabs, gradient-styled cards, badges (NEW/RECOMMENDED), smart ordering, locked visibility for non-registered users. Automatic notifications for new resources matching school stage. Supports multiple themes and tags.
-   **Notifications System**: Real-time (bell icon for unread, dashboard banner for new resources, user-dismissible).
-   **Content Management**: Printable forms (admin review), Evidence Gallery (advanced filtering), server-side image compression for evidence uploads.
-   **Communication**: Enhanced bulk email editor (image picker, AI auto-translation), Contact Us and Help Center pages. Evidence review notification emails include reviewer's name. Email URL Routing for correct invitation links.
-   **SEO Optimization**: Server-side meta tag injection, JSON-LD, proper heading hierarchy, descriptive image alt text.
-   **User Profile Management**: Comprehensive page for editing details, language, password, account deletion.
-   **Legal Pages**: Fully internationalized Privacy Policy and Terms & Conditions.
-   **Real-Time Collaboration**: Admin dashboard features include online presence tracking, document locking (with countdown, force unlock), idle detection, viewing indicators, admin chat (typing indicators, @mentions, browser notifications), activity history, evidence assignment.
-   **Health Monitoring**: Internal uptime monitoring via admin dashboard (public endpoints status, hourly aggregation of uptime/response times), system health dashboard (real-time status cards, incident timeline).

## External Dependencies
-   **Database**: Neon PostgreSQL
-   **File Storage**: Google Cloud Storage
-   **Authentication**: Google OAuth
-   **Email Services**: SendGrid
-   **Build Tool**: Vite
-   **Hosting/Deployment**: Replit
-   **AI Integration**: OpenAI GPT-4o-mini
-   **PDF Generation**: Puppeteer
-   **Image Processing**: Sharp library

## Recent Changes (October 2025)

### Comprehensive School Profile Page
- **Full-Page Profile**: Replaced popup dialog with dedicated profile page at `/admin/school/:id` for viewing comprehensive school information
- **Tabbed Interface**: Five organized tabs for different aspects (Overview, Teachers, Evidence, Analytics, Settings)
- **Overview Tab**: Displays school details, contact information, stage progression timeline, and key statistics (teachers count, evidence submissions, reduction promises)
- **Teachers Tab**: Lists all teachers associated with the school in a sortable table with role, verification status, and join date
- **Evidence Tab**: Shows all evidence submissions with filtering by status and requirement, includes approval actions
- **Analytics Tab**: Displays progress metrics, completion statistics, and reduction promise visualizations
- **Settings Tab**: Allows admins to update school language preferences, manually progress schools between stages, and manage photo consent status
- **Navigation**: Added "View Profile" button in schools management table for easy access
- **API Endpoints**: Created three new admin endpoints (`/api/admin/schools/:id`, `/api/admin/schools/:id/teachers`, `/api/admin/schools/:id/evidence`) with proper authentication and authorization
- **Impact**: Provides comprehensive single-page view of all school-related information, improving admin workflow efficiency and reducing need for multiple popup dialogs

### Welcome Email Copy Update
- **Changed "oceans" to "ocean"**: Updated welcome email text from "protecting our oceans" to "protecting our ocean" for grammatical consistency
- **Impact**: More accurate messaging in automated welcome emails sent to new school registrations

### Event Banner Layout Fix
- **Eliminated Gap**: Fixed spacing issue between event banner and navigation bar
- **Banner Height**: Set exact 48px height using inline style and flexbox centering (removed padding conflicts)
- **Navigation Position**: Updated navigation top position to exactly 48px when banner is active
- **Seamless Layout**: Banner and navigation now touch perfectly with 0px gap
- **Impact**: Clean, professional appearance with no visible spacing issues between fixed elements

### Footer Description Update
- **Updated Footer Copy**: Changed footer description from "Empowering schools worldwide to create plastic-free environments through education, investigation, and action" to "An award to reduce waste with students at the heart of the action" across all 14 language translations (English, Spanish, French, German, Italian, Portuguese, Dutch, Russian, Arabic, Indonesian, Chinese, Korean, Greek, Welsh)
- **Consistent Messaging**: Footer now emphasizes the award nature of the program and student-centered approach
- **Impact**: Footer messaging aligns with the updated hero copy and reinforces the student-focused nature of the program

### Hero Title Translation Update
- **Updated Hero Title**: Translated "An award to reduce waste with students at the heart of the action." across all 14 supported languages (English, Spanish, French, German, Italian, Portuguese, Dutch, Russian, Arabic, Indonesian, Chinese, Korean, Greek, Welsh)
- **Replaced Old Title**: Previous title "Empower Your School to Lead the Way in Reducing Plastic Waste" has been replaced with the new award-focused messaging
- **Consistent Branding**: Hero title now consistently emphasizes the award nature and student-centered approach across all languages
- **Impact**: Landing page hero section now delivers unified messaging that highlights the program as an award with students at its core

### School Management Filtering System Overhaul
- **Fixed Search Functionality**: Backend now properly receives and processes search parameter, enabling case-insensitive search across school name, address, and admin email using SQL ILIKE
- **Added Stage Filter**: New dropdown in admin schools management allowing filtering by program stage (Inspire, Investigate, Act)
- **Added Language Filter**: New dropdown for filtering schools by primary language with code-to-name mapping (e.g., "en" → "English")
- **Fixed Country Filtering**: Resolved issue where country filter returned no results by handling database's inconsistent storage (mix of full names like "United Kingdom" and country codes like "GR", "ID")
- **Fixed Backend Route**: Updated /api/admin/schools endpoint to pass all filter parameters (search, language, country, stage, type) to storage layer
- **Filter Logic Improvements**: Added explicit "all" value handling throughout filtering pipeline to prevent empty results when clearing filters
- **Impact**: School management filtering now works end-to-end, allowing admins to search and filter 1600+ schools by multiple criteria simultaneously

### Admin UI Positioning Fixes
- **Collaboration Sidebar**: Fixed "Online Admins" panel positioning to account for event banner height (moved from top-20 to top-32, 128px from top)
- **Filter Dropdowns**: Fixed country/language/stage filter dropdowns opening behind event banner by adding `position="popper"` and `sideOffset={5}` to SelectContent components
- **Max Height Limits**: Applied 300px max height to long dropdowns (country, language) to prevent off-screen extension
- **Impact**: All admin UI elements now properly positioned below fixed headers, ensuring accessibility and usability