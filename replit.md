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
-   **Features**: Comprehensive analytics with visualizations and PDF export, dynamic evidence requirements, student-led action plans, multi-step school registration (country-adaptive), and multi-language support (14 languages, RTL support). Includes an AI-powered live chat widget.
-   **Admin UI**: Integrated evidence requirements, school detail management, manual school progression, an 8-step Case Study Wizard, Resource Management with file replacement capability and visibility controls, and Data Import System. PDF export now allows section selection. Multi-language event creator with language tab badges showing content counts, copy-from-language dropdown for duplicating content across languages, collapsible content overview panel displaying status across all 14 languages, and contextual help alerts explaining translation strategies for videos and files. Bulk resource upload with drag-and-drop functionality, batch metadata editing, resource pack creation, shareable preview links with PDF viewer, and AI-powered auto-fill that analyzes uploaded files to suggest metadata (description, stage, theme, age range, resource type) using OpenAI GPT-4o-mini. **Review Queue** promoted to dedicated top-level navigation tab with three sub-tabs (Evidence, Audits, Photo Consent), featuring real-time badge counts for pending items, streamlined approve/reject workflows for each review type, and comprehensive photo consent review including document preview links and required rejection notes.
-   **Events System**: Full event lifecycle management, event landing pages with multi-language support, YouTube embedding, downloadable resources, testimonials, automated email reminders, capacity tracking, access links, real-time status badges, dashboard notifications, and calendar integration. Includes event promotion features like customizable banners and an events carousel on the landing page. Admin can attach existing resources from the resource library to events via a card-based selector with image thumbnails (handles GCS signed URLs with CORS support) and file type icons; attached resources display on public event pages with download functionality.
-   **Inspiration Page**: Unified gallery displaying both curated case studies and approved school evidence submissions with smart sorting and filtering.
-   **Resources System**: Enhanced resources page with language tabs, gradient-styled cards, NEW badges (< 7 days), RECOMMENDED badges (stage-matching), smart resource ordering based on school stage, and locked resource visibility for non-registered users. Automatic notification system alerts schools when new resources match their current stage. Admin can replace resource files while maintaining the same resource ID.
-   **Notifications System**: Real-time notification system with bell icon in navigation showing unread count (pulsing animation), dashboard notification banner for new resources, automatic notification creation when resources are added/updated, and user-dismissible notifications with read tracking.
-   **Content Management**: Printable forms system with admin review, and an Evidence Gallery with advanced filtering. Server-side image compression is applied to evidence file uploads.
-   **Communication**: Enhanced bulk email editor with image picker and AI-powered auto-translation. New Contact Us and Help Center pages provide user support.
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