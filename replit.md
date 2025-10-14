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
-   **Events**: Community events with registration management, waitlists, virtual meeting support, and public landing pages. New fields: publicSlug (unique URL identifier), youtubeVideos (JSONB array), eventPackFiles (JSONB array for resources), testimonials (JSONB array), reminderSentAt (timestamp for automated reminders).
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
-   **Event Landing Pages**: Dedicated public pages for online events with YouTube live stream embedding, downloadable event resources (PDF packs), testimonial sections, and automated 1-hour pre-event email reminders. Events must be published to be publicly accessible via slug URLs.
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

## Event Landing Page System
### Overview
Dedicated public pages for online events that allow registered users to access live streams, resources, and event information without requiring login.

### Features
- **YouTube Live Embedding**: Admins can add multiple YouTube videos (live streams or recordings) to event pages
- **Downloadable Resources**: Event pack files (PDFs, documents) uploaded to Google Cloud Storage
- **Testimonials**: Display quotes from past participants to build credibility
- **Automated Reminders**: System sends email reminders 1 hour before event start to all registered users
- **Public Access**: Events are accessible via clean URLs (/events/{slug}) without authentication

### Implementation Details
**Admin Workflow**:
1. Create event and set status to "published" (draft events are not publicly accessible)
2. Navigate to Page Builder tab in event editor
3. Set unique public slug for URL (validated for uniqueness)
4. Add YouTube videos with titles, URLs, and descriptions
5. Upload event pack files (PDFs) for participants to download
6. Add testimonials to showcase past success
7. Save page content

**Public Access**:
- Users visit /events/{publicSlug} to access event page
- No login required for viewing
- Only published events are accessible (returns 404 for draft/cancelled events)

**Automated Reminders**:
- Cron endpoint: GET /api/cron/event-reminders
- Requires CRON_SECRET environment variable for authentication
- Checks for events starting in 45-75 minutes
- Sends email reminders to all registered users
- Updates reminderSentAt timestamp to prevent duplicate sends
- Configure external cron service (e.g., cron-job.org) to call endpoint hourly with secret header

**API Endpoints**:
- GET /api/events/slug/:slug - Public endpoint (no auth, only published events)
- PATCH /api/admin/events/:id/page-content - Admin page builder updates (validates slug uniqueness)
- GET /api/cron/event-reminders - Automated reminder cron (requires CRON_SECRET)

**Security**:
- Slug uniqueness enforced at API level (400 error for duplicates)
- Cron endpoint requires CRON_SECRET in header (x-cron-secret) or query param
- Returns 503 if CRON_SECRET not configured, 401 if invalid

### Configuration Required
**Environment Variables**:
- CRON_SECRET: Secret token for cron endpoint authentication (must be set for reminders to work)

## SEO Optimization for Case Study Pages
### Overview
Comprehensive SEO optimization implemented for case study pages including server-side meta tag injection, JSON-LD structured data for Google rich snippets, proper heading hierarchy, and descriptive image alt text.

### Problem Solved
- Social media crawlers don't execute JavaScript, so they couldn't see client-side meta tags, resulting in missing or generic preview cards
- Search engines need structured data to generate rich snippets in search results
- Accessibility and SEO require proper heading hierarchy and descriptive image alt text

### Server-Side Meta Tag Injection
**Route Handler**: GET /case-study/:id
- Placed BEFORE Vite/SPA catch-all route to intercept case study requests
- Queries database directly for case study data (title, description, images, createdAt, updatedAt)
- Reads HTML template from disk (client/index.html in dev, public/index.html in production)
- Injects meta tags with case study data into HTML <head>
- Falls back to SPA for 404 handling if case study not found
- Error handling with fallback to normal SPA serving

**Meta Tags Injected**:
- **Open Graph**: og:title, og:description, og:image, og:url, og:type, og:site_name
- **Twitter Cards**: twitter:card, twitter:title, twitter:description, twitter:image
- **SEO Meta**: meta description, canonical URL, robots (index, follow)
- **Page Title**: "{Case Study Title} | Plastic Clever Schools" format
- **JSON-LD Structured Data**: Schema.org Article markup for Google rich snippets

### JSON-LD Structured Data Implementation
Structured data is injected as `<script type="application/ld+json">` in the page head:

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Case Study Title",
  "description": "Case study description (150 chars)",
  "image": "https://example.com/image.jpg",
  "author": {
    "@type": "Organization",
    "name": "Plastic Clever Schools"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Plastic Clever Schools",
    "logo": {
      "@type": "ImageObject",
      "url": "https://domain.com/logo.png"
    }
  },
  "datePublished": "2024-01-01T00:00:00.000Z",
  "dateModified": "2024-01-02T00:00:00.000Z"
}
```

**Benefits**:
- Enables Google rich snippets in search results
- Provides publication and modification dates for freshness signals
- Identifies publisher and author information
- Improves click-through rates from search results

### Heading Hierarchy Guidelines
Proper heading structure for accessibility and SEO:

**Structure**:
- **h1**: Page title (case study title) - One per page
- **h2**: Main sections (Impact Achieved, Student Voices, Our Journey, Photo Gallery, etc.)
- **h3**: Subsections (timeline items, video titles, evidence sections)
- **No skipped levels**: Never jump from h1 to h3 without h2

**Implementation in case-study-detail.tsx**:
```jsx
<h1>{caseStudy.title}</h1>              // Main page title
<h2>The Transformation</h2>              // Section heading
<h2>Impact Achieved</h2>                 // Section heading
<h2>Our Journey</h2>                     // Section heading
<h3>{timeline.title}</h3>                // Subsection within timeline
<h2>Student Voices</h2>                  // Section heading
<h2>Photo Gallery</h2>                   // Section heading
<h2>Related Success Stories</h2>         // Section heading
```

### Image Alt Text Requirements
All images have descriptive alt text for accessibility and SEO:

**Alt Text Patterns**:
- **Before/After Images**: "Before/After plastic reduction transformation at {School Name}"
- **Gallery Images**: Image caption or case study title as fallback
- **Quote Author Photos**: Author name (e.g., "John Smith")
- **Related Story Thumbnails**: Story title

**Implementation Examples**:
```jsx
<OptimizedImage 
  src={beforeImage} 
  alt={`Before plastic reduction transformation at ${schoolName}`} 
/>

<OptimizedImage 
  src={galleryImage} 
  alt={imageCaption || caseStudyTitle || 'Case study image'} 
/>

<OptimizedImage 
  src={authorPhoto} 
  alt={authorName} 
/>
```

### Helper Functions
- `stripHtml()`: Removes HTML tags from description for clean meta content
- `escapeHtml()`: Prevents XSS attacks by escaping special characters in meta tags

### Security
- All content properly escaped using escapeHtml() to prevent XSS
- HTML tags stripped from descriptions
- JSON structured data generated from trusted database fields
- Graceful error handling with SPA fallback

### Client-Side Fallback
- SocialMetaTags component remains for SPA navigation (client-side routing)
- Server-side injection takes precedence for initial page loads and crawlers

### Testing & Validation
**Structured Data Testing**:
- Google Rich Results Test: https://search.google.com/test/rich-results
- Schema.org Validator: https://validator.schema.org/

**Social Media Preview Testing**:
- Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/
- Twitter Card Validator: https://cards-dev.twitter.com/validator
- LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/

**Accessibility Testing**:
- Use browser dev tools to verify heading hierarchy
- Run accessibility audits (Lighthouse, axe DevTools)
- Verify all images have meaningful alt text

### Technical Details
**Development**: Reads from client/index.html
**Production**: Reads from server/public/index.html (built dist folder)
**Image Priority**: Uses first image from images array, falls back to imageUrl field
**Description**: Truncated to 150 characters after HTML stripping
**Dates**: Uses createdAt for datePublished, updatedAt for dateModified (fallbacks to createdAt or current date)