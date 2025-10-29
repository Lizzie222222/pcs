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