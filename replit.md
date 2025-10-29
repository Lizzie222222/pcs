# Plastic Clever Schools Web Application

## Overview
This web application supports the Plastic Clever Schools program, aiming to reduce plastic in schools through a three-stage process: Inspire, Investigate, and Act. It provides a public website and an integrated CRM, offering educational resources, evidence tracking, case studies, plastic reduction promise tracking, and administrative tools. The project aims to foster environmental responsibility and expand the program's reach by offering a comprehensive platform for schools to engage with environmental initiatives.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application employs a modern web architecture with distinct frontend and backend components, a robust data model, and comprehensive UI/UX design.

### Frontend
-   **Frameworks & Libraries**: React with TypeScript (Vite), Wouter, TanStack Query.
-   **UI/Styling**: Radix UI primitives, shadcn/ui components, Tailwind CSS.
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
-   **Design System**: PCS brand colors, specific fonts (Gilroy Bold, Century Gothic Regular), and a component-based design using Radix UI and shadcn/ui. Custom favicon using the official PCS logo.
-   **Navigation**: Public and authenticated routes, including a tab-based dashboard and enhanced admin navigation.
-   **Features**: Comprehensive analytics with visualizations and PDF export, dynamic evidence requirements, student-led action plans, multi-step school registration (country-adaptive with complete i18n support), and multi-language support (14 languages, RTL support). Includes an AI-powered live chat widget.
-   **Admin UI**: Integrated evidence requirements, school detail management, manual school progression, an 8-step Case Study Wizard, Resource Management, Data Import System with Legacy User Migration tool, multi-language event creator, bulk resource upload with AI-powered auto-fill, and a comprehensive Review Queue (Evidence, Audits, Photo Consent).
-   **Mobile Responsiveness**: Full mobile optimization of admin panel including responsive headers, navigation, collaboration sidebar, export/action buttons, filter dropdowns, tables, forms, card layouts, padding, and internationalization across 11 major sections.
-   **Legacy User Migration System**: Comprehensive data migration tool for importing users from the old WordPress system via CSV, with dry-run mode, smart school deduplication, user creation, stage mapping, tracking, credential export, security, and user onboarding notices.
-   **Events System**: Full event lifecycle management, event landing pages with multi-language support, YouTube embedding, downloadable resources, testimonials, automated email reminders, capacity tracking, access links, real-time status badges, dashboard notifications, and calendar integration.
-   **Inspiration Page**: Unified gallery displaying curated case studies and approved school evidence submissions with smart sorting and filtering.
-   **Resources System**: Enhanced resources page with language tabs, gradient-styled cards, NEW and RECOMMENDED badges, smart resource ordering, and locked resource visibility for non-registered users. Automatic notification system alerts schools when new resources match their current stage.
-   **Notifications System**: Real-time notification system with bell icon for unread count, dashboard notification banner for new resources, and user-dismissible notifications.
-   **Content Management**: Printable forms system with admin review, and an Evidence Gallery with advanced filtering. Server-side image compression for evidence file uploads.
-   **Communication**: Enhanced bulk email editor with image picker and AI-powered auto-translation. New Contact Us and Help Center pages. Evidence review notification emails include reviewer's name. Email URL Routing ensures correct domain links for invitation emails.
-   **SEO Optimization**: Server-side meta tag injection for case study pages, JSON-LD structured data, proper heading hierarchy, and descriptive image alt text.
-   **User Profile Management**: Comprehensive user profile page for editing details, language preferences, password changes, and account deletion.
-   **Legal Pages**: Fully internationalized Privacy Policy and Terms & Conditions pages with comprehensive translations.
-   **Real-Time Collaboration System**: Comprehensive collaboration features for admin dashboard including online presence tracking, document locking with countdown timers, force unlock capability for platform admins, idle detection & auto-unlock, viewing indicators, admin chat with typing indicators and @mentions, browser notifications, activity history logging, and evidence assignment.
-   **Health Monitoring System**: Internal uptime monitoring accessible via admin dashboard, tracking public endpoints with status categorization (healthy, degraded, down), hourly aggregation of uptime percentages and average response times, and a system health dashboard with real-time status cards and incident timeline.

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
### Teacher Invitation Email Upgrade
- **Vibrant Email Template**: Updated teacher invitation emails from school dashboard to use the vibrant, colorful template matching admin invitations
- **Professional Design**: Emails now feature gradient backgrounds, emojis, styled information boxes, and modern formatting
- **Consistency**: Teacher invitations now match the engaging visual style of admin invitations for a consistent brand experience
- **Impact**: Teacher invitation emails are now visually appealing and professional, improving the invitation experience

### AssignTeacherForm Crash Fix
- **Fixed Undefined User Error**: Added comprehensive null safety checks to prevent crashes when user data is malformed
- **UI Filtering**: Filter out undefined/null user objects before rendering to prevent "Cannot read properties of undefined" errors
- **Submission Guards**: Added explicit validation in handleSubmit to prevent backend errors with invalid user data
- **Error Logging**: Added console logging to surface data integrity issues for investigation
- **User Feedback**: Display user-friendly error messages when malformed data is encountered
- **Impact**: AssignTeacherForm no longer crashes when encountering users with undefined data, and provides clear feedback to admins

### Photo Consent Review UX Improvements
- **Replaced Native Browser Dialogs**: Replaced outdated browser dialogs (confirm, prompt, alert) with custom shadcn/ui AlertDialog components for photo consent approval and rejection
- **Approval Dialog**: Added a clean modal confirmation dialog matching the app's design system
- **Rejection Dialog**: Added a modal dialog with Textarea for rejection notes, with proper validation and disabled state
- **Consistent UX**: All dialogs now match the app's design language with proper loading spinners, cancel buttons, and action buttons
- **Impact**: Photo consent review workflow now has a modern, consistent user experience instead of old-school browser popups

### Resources System Enhancements (Client Feedback Implementation)
- **Landing Page Hero Copy Update**: Updated main hero text to "An award to reduce waste with students at the heart of the action" for clearer messaging
- **Download Count Privacy**: Removed download count display from public resources page while keeping it visible in admin panel for analytics
- **Student Action Theme**: Added new "student_action" theme option to resourceThemeEnum for better categorization of student-focused resources
- **Tags System**: Implemented JSONB array-based tags field on resources table with initial "all_stages" tag option for cross-stage resource identification
- **Multi-Theme Support**: Converted resources from single theme to multiple themes (themes array field) enabling resources to be categorized under multiple topics
- **Admin UI Multi-Select**: Updated admin resources management with checkbox-based multi-select UI for both themes and tags, replacing single-select dropdown
- **Backend Array Filtering**: Enhanced backend filtering logic to handle PostgreSQL array operations for multi-theme queries while maintaining backward compatibility
- **Database Schema**: Added themes (text array) and tags (jsonb array) fields to resources table, keeping legacy theme field for backward compatibility
- **Impact**: Resources can now be tagged with multiple themes and special tags, improving discoverability and allowing more flexible categorization while maintaining data privacy on public pages