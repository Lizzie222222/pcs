/**
 * @description Removes all HTML tags from text and normalizes whitespace. Used for meta descriptions and plain text exports.
 * @param {string | null | undefined} html - HTML string to strip
 * @returns {string} Plain text with HTML removed
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * @description Escapes HTML special characters for safe inclusion in meta tags and attributes. Prevents XSS in PDF generation and meta tags.
 * @param {string | null | undefined} text - Text to escape
 * @returns {string} HTML-escaped text
 */
export function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * @description Sanitizes filename for safe downloads by removing special characters and limiting length. Prevents path traversal and filesystem issues.
 * @param {string} filename - Original filename to sanitize
 * @returns {string} Sanitized filename safe for downloads
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 100) || 'case_study';
}

/**
 * @description Generates beautifully formatted HTML for case study PDF export with embedded styles. Includes images, quotes, timeline, and metrics sections.
 * @param {any} caseStudy - Case study data object with all fields
 * @returns {string} Complete HTML document ready for PDF conversion
 */
export function generatePdfHtml(caseStudy: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Arial', sans-serif; 
          line-height: 1.6; 
          color: #333;
          padding: 20px;
        }
        h1 { 
          color: #0066cc; 
          font-size: 32px; 
          margin-bottom: 20px; 
          border-bottom: 3px solid #0066cc;
          padding-bottom: 10px;
        }
        h2 { 
          color: #0066cc; 
          font-size: 24px; 
          margin-top: 30px; 
          margin-bottom: 15px; 
        }
        .meta { 
          font-size: 14px; 
          color: #666; 
          margin-bottom: 20px; 
        }
        .section { margin-bottom: 30px; }
        img { max-width: 100%; height: auto; margin: 20px 0; }
        .quote { 
          border-left: 4px solid #0066cc; 
          padding-left: 20px; 
          margin: 20px 0; 
          font-style: italic; 
        }
        .metric { 
          display: inline-block; 
          margin: 10px 20px 10px 0; 
          padding: 10px; 
          background: #f0f0f0; 
        }
        .timeline-item { 
          margin-bottom: 15px; 
          padding-left: 20px; 
          border-left: 2px solid #0066cc; 
        }
        @page { margin: 20mm; }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(caseStudy.title)}</h1>
      <div class="meta">
        ${caseStudy.schoolName ? `<strong>School:</strong> ${escapeHtml(caseStudy.schoolName)} | ` : ''}
        ${caseStudy.schoolCountry ? `<strong>Country:</strong> ${escapeHtml(caseStudy.schoolCountry)} | ` : ''}
        ${caseStudy.stage ? `<strong>Stage:</strong> ${escapeHtml(caseStudy.stage.charAt(0).toUpperCase() + caseStudy.stage.slice(1))}` : ''}
      </div>
      
      <!-- Main image -->
      ${caseStudy.imageUrl ? `<img src="${caseStudy.imageUrl}" alt="Hero image" />` : ''}
      
      <!-- Description -->
      <div class="section">
        ${caseStudy.description || ''}
      </div>
      
      <!-- Impact -->
      ${caseStudy.impact ? `
        <h2>Impact Achieved</h2>
        <div class="section">
          ${escapeHtml(caseStudy.impact)}
        </div>
      ` : ''}
      
      <!-- Impact Metrics -->
      ${caseStudy.impactMetrics?.length ? `
        <h2>Impact Metrics</h2>
        <div class="section">
          ${caseStudy.impactMetrics.map((m: any) => `
            <div class="metric">
              <strong>${escapeHtml(m.label)}</strong><br/>
              ${escapeHtml(m.value)}
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      <!-- Student Quotes -->
      ${caseStudy.studentQuotes?.length ? `
        <h2>Student Testimonials</h2>
        ${caseStudy.studentQuotes.map((q: any) => `
          <div class="quote section">
            "${escapeHtml(q.text || q.quote || '')}"<br/>
            <strong>— ${escapeHtml(q.name)}${q.age ? `, Age ${q.age}` : ''}</strong>
          </div>
        `).join('')}
      ` : ''}
      
      <!-- Timeline -->
      ${caseStudy.timelineSections?.length ? `
        <h2>Timeline</h2>
        <div class="section">
          ${caseStudy.timelineSections.map((t: any) => `
            <div class="timeline-item">
              <strong>${escapeHtml(t.title)}</strong>${t.date ? ` - ${escapeHtml(t.date)}` : ''}<br/>
              ${escapeHtml(t.description || '')}
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      <!-- Categories/Tags -->
      ${caseStudy.categories?.length || caseStudy.tags?.length ? `
        <div class="section">
          ${caseStudy.categories?.length ? `<strong>Categories:</strong> ${caseStudy.categories.map(escapeHtml).join(', ')}` : ''}
          ${caseStudy.tags?.length ? `<br/><strong>Tags:</strong> ${caseStudy.tags.map(escapeHtml).join(', ')}` : ''}
        </div>
      ` : ''}
    </body>
    </html>
  `;
}
