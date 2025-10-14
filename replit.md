# Plastic Clever Schools Web Application

## Overview
This project is a web application designed for the Plastic Clever Schools program. Its primary goal is to facilitate plastic reduction in schools through a structured three-stage program (Inspire, Investigate, Act). The application features a public website and an integrated CRM, offering educational resources, evidence tracking, case studies, plastic reduction promise tracking, and administrative tools. It aims to foster environmental responsibility in schools and significantly expand the program's reach and impact.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application employs a modern web architecture with distinct frontend and backend components, supported by a robust data model and comprehensive UI/UX design.

### Frontend
-   **Frameworks & Libraries**: React with TypeScript (Vite), Wouter for routing, TanStack Query for state management.
-   **UI/Styling**: Radix UI primitives, shadcn/ui components, and Tailwind CSS for styling (custom palette).
-   **Forms**: React Hook Form with Zod validation.
-   **File Uploads**: Uppy.js for direct-to-cloud uploads.
-   **Icons**: Lucide React.
-   **Avatars**: DiceBear (thumbs style).

### Backend
-   **Runtime**: Node.js with Express.js.
-   **Database**: PostgreSQL (Neon serverless) managed with Drizzle ORM.
-   **Authentication**: Local password and Google OAuth, utilizing Express sessions with a PostgreSQL store.
-   **API**: RESTful architecture with robust error handling.
-   **File Storage**: Google Cloud Storage for various media assets.

### Authentication & Authorization
-   **Identity Providers**: Local password and Google OAuth.
-   **Role-Based Access Control (RBAC)**: Supports roles such as Teacher, Head Teacher, Pending Teacher, and Platform Admin.
-   **User Management**: Hierarchical school team management and token-based admin invitation system.

### Key Data Models
Core entities include Users, Schools, Evidence (with approval workflows), Audit data, Reduction Promises (Action Plans), Resources, Case Studies, Events (with registration, waitlists, and public landing pages), Media Assets, and Printable Form Submissions.

### UI/UX Decisions
-   **Design System**: PCS brand colors, Gilroy Bold for headers, Century Gothic Regular for body text. Component-based design using Radix UI and shadcn/ui.
-   **Navigation**: Public and authenticated routes, including a tab-based dashboard (Progress, Analytics, Resources, Team, Our Action Plan).
-   **Features**: Comprehensive analytics with visualizations and PDF export, dynamic evidence requirements, student-led action plans, multi-step school registration (country-adaptive), and multi-language support (i18next with 14 languages, RTL support).
-   **Admin UI**: Enhanced navigation, integrated evidence requirements, school detail management, and manual school progression.
-   **Events System**: Full event lifecycle management (creation, browsing, registration), event landing pages with YouTube embedding, downloadable resources, testimonials, and automated email reminders.
-   **Content Management**: Printable forms system with admin review, and an Evidence Gallery for managing submissions with advanced filtering and PDF viewing capabilities.
-   **Communication**: Enhanced bulk email editor with image picker and AI-powered auto-translation based on school's preferred language.
-   **SEO Optimization**: Server-side meta tag injection for case study pages, JSON-LD structured data for rich snippets, proper heading hierarchy, and descriptive image alt text for improved search engine visibility and social media sharing.

## External Dependencies
-   **Database**: Neon PostgreSQL
-   **File Storage**: Google Cloud Storage
-   **Authentication**: Google OAuth
-   **Email Services**: SendGrid (for transactional and bulk emails)
-   **Build Tool**: Vite
-   **Hosting/Deployment**: Replit
-   **AI Integration**: OpenAI GPT-5 (specifically GPT-4o-mini for translations)
-   **PDF Generation**: Puppeteer