# Plastic Clever Schools Web Application

## Overview
This web application supports the Plastic Clever Schools program, aiming to reduce plastic in schools through a three-stage process: Inspire, Investigate, and Act. It features a public website and an integrated CRM, providing educational resources, evidence tracking, case studies, plastic reduction promise tracking, and administrative tools. The project seeks to cultivate environmental responsibility and expand the program's reach.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application uses a modern web architecture with distinct frontend and backend components, a robust data model, and comprehensive UI/UX design.

### Frontend
-   **Frameworks & Libraries**: React with TypeScript (Vite), Wouter for routing, TanStack Query for state management.
-   **UI/Styling**: Radix UI primitives, shadcn/ui components, and Tailwind CSS.
-   **Forms**: React Hook Form with Zod validation.
-   **File Uploads**: Uppy.js.
-   **Icons**: Lucide React.
-   **Avatars**: DiceBear (thumbs style).

### Backend
-   **Runtime**: Node.js with Express.js.
-   **Database**: PostgreSQL (Neon serverless) managed with Drizzle ORM.
-   **Authentication**: Local password and Google OAuth, utilizing Express sessions with a PostgreSQL store.
-   **API**: RESTful architecture with robust error handling.
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
-   **Admin UI**: Enhanced navigation, integrated evidence requirements, school detail management, and manual school progression.
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

## Recent Changes

### Case Study Wizard Redesign (October 20, 2025)
**Complete redesign of admin case study creation from confusing tabs to intuitive step-by-step wizard:**

- **5-Step Wizard Flow**:
  1. Template & Basics: Choose from 4 templates (Standard, Visual Story, Timeline, Impact Focused) with visual previews
  2. Content: Enter description and impact summary with template-specific guidance
  3. Media: Upload images from Evidence Gallery or custom uploads with caption/alt text editing
  4. Enhancements: Add quotes, metrics, or timeline based on selected template
  5. Review & Publish: Final review with validation checklist showing all requirements

- **Template-Driven Validation**:
  - Standard: Minimum 1 image with caption
  - Visual Story: Requires before/after images
  - Timeline: Minimum 3 timeline events
  - Impact Focused: Minimum 2 metrics + 1 image
  - Template selection required before proceeding
  - Publish blocked until all template requirements met

- **UX Improvements**:
  - Progress stepper shows current step and completion status
  - Step validation prevents navigation with incomplete data
  - Auto-expanding accordion when images uploaded (makes caption inputs immediately visible)
  - Clear requirement indicators show what's needed vs optional
  - Evidence Gallery integration allows selecting from approved public submissions
  - Visual template cards with descriptions and requirement previews

- **Technical Implementation**:
  - WizardStepper component for progress visualization
  - WizardNavigation with smart enable/disable based on validation
  - templateConfigurations.ts defines all template requirements and field visibility
  - useFieldArray for dynamic image/quote/metric/timeline management
  - useEffect-based accordion auto-expansion fix (resolves caption input visibility)
  - Publish-time validation enforces all template-specific minimums

**Impact**: Transforms confusing tab-based interface into guided workflow that prevents incomplete case studies and reduces admin cognitive load.

### Resource Management Visibility Controls (October 20, 2025)
**Added comprehensive visibility controls for educational resources:**

- **Visibility System**:
  - Resources can now be set as "Public" (visible to everyone) or "Registered Only" (requires login)
  - Updated visibility enum from ['private', 'public'] to ['public', 'registered'] for clarity
  - Public resources encourage registration while registered-only resources provide value to logged-in schools

- **Backend Implementation**:
  - GET /api/resources filters by authentication status automatically
  - Unauthenticated users only see public resources
  - Authenticated users see both public and registered-only resources
  - Admin endpoints (POST, PUT, DELETE) for managing resources with visibility controls

- **File Upload Integration**:
  - Replaced mock file uploads with real ObjectUploader component
  - Integrated with Google Cloud Storage following same pattern as case studies
  - Supports up to 150MB files (PDF, DOC, PPT, XLS formats)
  - Automatic ACL policy setting based on visibility preference

- **Admin UI Enhancements**:
  - Visibility selector in resource form with clear labels
  - Visual badges in resource table: green for Public, orange for Registered Only
  - Visibility filter dropdown to quickly find resources by access level
  - Inline visibility status display with color-coded badges

- **Database Schema**:
  - Updated visibility enum across resources, evidence, and media_assets tables
  - Migrated existing 'private' values to 'registered' for consistency
  - Default visibility for resources: 'public', for evidence/media: 'registered'

**Purpose**: Allows admins to strategically control resource access - public resources showcase value to drive registration, while registered-only resources provide exclusive content to engaged schools.

### Dashboard UX Improvements (October 20, 2025)
**Streamlined navigation and enhanced metric clarity:**

- **Analytics Tab Removal**:
  - Removed separate analytics tab from school dashboard to simplify navigation
  - Analytics functionality remains available through dedicated analytics pages
  - Cleaner tab structure focuses on core actions: Progress, Resources, Team, Action Plan, Events

- **Action Plan Metric Tooltips**:
  - Added hover tooltips to all action plan metrics explaining calculations
  - Summary cards include tooltips for: Total Action Items, Items Reduced/Year, Weight Reduced/Year
  - Ocean Impact metrics (bottles, fish, sea turtles) with educational context
  - Environmental Impact metrics (CO₂, oil, tons) with conversion factor explanations
  - All tooltips provide accurate, clear explanations of how metrics are calculated

- **Verified Calculations**:
  - Total Action Items: Simple count of all reduction promises
  - Items Reduced/Year: (Baseline - Target) × Frequency Multiplier (52 weekly, 12 monthly, 1 yearly)
  - Weight Reduced/Year: Items × Standard Weights (e.g., bottles: 15g, cups: 5g, straws: 0.42g) × Frequency
  - CO₂ Prevented: ~6kg CO₂ per kg plastic produced
  - Oil Saved: ~2 liters oil per kg plastic produced
  - All calculations verified against plasticMetrics.ts conversion factors

**Technical Implementation:**
- Tooltips use shadcn/ui Tooltip component with TooltipProvider
- Cursor changes to help icon on hover for better UX
- Max-width set on tooltip content for readability
- No changes to underlying calculation logic - purely educational UI enhancement

**Impact:**
- Users can now understand exactly how metrics are calculated
- Improved transparency builds trust in the data
- Educational tooltips help schools appreciate the real environmental impact
- Simplified dashboard navigation reduces cognitive load