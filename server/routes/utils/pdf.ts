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
 * @description Converts relative URLs to absolute URLs for PDF generation
 * @param {string} url - URL to convert (can be relative or absolute)
 * @param {string} baseUrl - Base URL to use for relative URLs
 * @returns {string} Absolute URL
 */
function toAbsoluteUrl(url: string | null | undefined, baseUrl: string): string {
  if (!url) return '';
  
  // If already absolute, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Convert relative URL to absolute
  if (url.startsWith('/')) {
    return `${baseUrl}${url}`;
  }
  
  return url;
}

/**
 * @description Generates beautifully formatted HTML for case study PDF export with embedded styles. Includes images, quotes, timeline, and metrics sections.
 * @param {any} caseStudy - Case study data object with all fields
 * @param {string} baseUrl - Base URL for converting relative image URLs to absolute (e.g., "https://example.com")
 * @returns {string} Complete HTML document ready for PDF conversion
 */
export function generatePdfHtml(caseStudy: any, baseUrl: string = ''): string {
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
        h3 { 
          color: #0066cc; 
          font-size: 18px; 
          margin-top: 20px; 
          margin-bottom: 10px; 
        }
        h4, h5, h6 { 
          color: #0066cc; 
          font-size: 16px; 
          margin-top: 15px; 
          margin-bottom: 8px; 
        }
        p {
          margin-bottom: 12px;
        }
        strong, b {
          font-weight: bold;
          color: #000;
        }
        em, i {
          font-style: italic;
        }
        ul, ol {
          margin: 10px 0 10px 20px;
          padding-left: 20px;
        }
        li {
          margin-bottom: 5px;
        }
        blockquote {
          border-left: 4px solid #0066cc;
          padding-left: 15px;
          margin: 15px 0;
          font-style: italic;
          color: #555;
        }
        a {
          color: #0066cc;
          text-decoration: underline;
        }
        code {
          background: #f4f4f4;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
          font-size: 0.9em;
        }
        pre {
          background: #f4f4f4;
          padding: 12px;
          border-radius: 5px;
          overflow-x: auto;
          margin: 10px 0;
        }
        pre code {
          background: none;
          padding: 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th {
          background: #f0f0f0;
          font-weight: bold;
        }
        .meta { 
          font-size: 14px; 
          color: #666; 
          margin-bottom: 20px; 
        }
        .section { margin-bottom: 30px; }
        .content { line-height: 1.8; }
        img { 
          max-width: 100%; 
          height: auto; 
          margin: 20px 0; 
          display: block;
        }
        .quote { 
          border-left: 4px solid #0066cc; 
          padding-left: 20px; 
          margin: 20px 0; 
          font-style: italic; 
        }
        .metric { 
          display: inline-block; 
          margin: 10px 20px 10px 0; 
          padding: 15px; 
          background: #f0f0f0;
          border-radius: 5px;
          min-width: 200px;
        }
        .timeline-item { 
          margin-bottom: 20px; 
          padding-left: 20px; 
          border-left: 3px solid #0066cc; 
        }
        .timeline-item-title {
          font-weight: bold;
          color: #0066cc;
          margin-bottom: 5px;
        }
        .timeline-item-content {
          margin-top: 8px;
          line-height: 1.6;
        }
        .image-gallery {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
          margin: 20px 0;
        }
        .image-gallery img {
          margin: 0;
        }
        .image-caption {
          font-size: 12px;
          color: #666;
          margin-top: 5px;
          text-align: center;
        }
        .before-after {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin: 20px 0;
        }
        .before-after-item {
          text-align: center;
        }
        .before-after-item h3 {
          margin-bottom: 10px;
        }
        .video-container {
          margin: 20px 0;
          padding: 15px;
          background: #f9f9f9;
          border-radius: 5px;
        }
        .video-thumbnail {
          max-width: 100%;
          height: auto;
          margin-bottom: 10px;
        }
        .video-url {
          font-size: 12px;
          color: #0066cc;
          word-break: break-all;
        }
        .evidence-section {
          margin: 30px 0;
          padding: 20px;
          background: #f9f9f9;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
        }
        .evidence-section h3 {
          margin-top: 0;
          margin-bottom: 15px;
        }
        .evidence-files-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
          margin-top: 15px;
        }
        .evidence-file {
          padding: 12px;
          background: white;
          border-radius: 5px;
          border: 1px solid #ddd;
        }
        .evidence-file-name {
          font-weight: bold;
          color: #333;
          margin-bottom: 5px;
          word-break: break-word;
        }
        .evidence-file-url {
          font-size: 11px;
          color: #666;
          word-break: break-all;
        }
        .evidence-link-box {
          padding: 15px;
          background: white;
          border-radius: 5px;
          border: 1px solid #ddd;
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
      ${caseStudy.imageUrl ? `<img src="${toAbsoluteUrl(caseStudy.imageUrl, baseUrl)}" alt="Hero image" />` : ''}
      
      <!-- Description (rich text - no escaping) -->
      ${caseStudy.description ? `
        <div class="section content">
          ${caseStudy.description}
        </div>
      ` : ''}
      
      <!-- Impact (rich text - no escaping) -->
      ${caseStudy.impact ? `
        <h2>Impact Achieved</h2>
        <div class="section content">
          ${caseStudy.impact}
        </div>
      ` : ''}
      
      <!-- Before/After Images -->
      ${caseStudy.beforeImage && caseStudy.afterImage ? `
        <h2>Transformation</h2>
        <div class="before-after">
          <div class="before-after-item">
            <h3>Before</h3>
            <img src="${toAbsoluteUrl(caseStudy.beforeImage, baseUrl)}" alt="Before transformation" />
          </div>
          <div class="before-after-item">
            <h3>After</h3>
            <img src="${toAbsoluteUrl(caseStudy.afterImage, baseUrl)}" alt="After transformation" />
          </div>
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
      
      <!-- Image Gallery -->
      ${caseStudy.images?.length ? `
        <h2>Photo Gallery</h2>
        <div class="image-gallery">
          ${caseStudy.images.map((img: any) => `
            <div>
              <img src="${toAbsoluteUrl(img.url || img, baseUrl)}" alt="${escapeHtml(img.caption || 'Gallery image')}" />
              ${img.caption ? `<div class="image-caption">${escapeHtml(img.caption)}</div>` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      <!-- Videos -->
      ${caseStudy.videos?.length ? `
        <h2>Videos</h2>
        <div class="section">
          ${caseStudy.videos.map((video: any) => {
            const videoUrl = video.url || video;
            const thumbnail = video.thumbnail || extractVideoThumbnail(videoUrl);
            return `
              <div class="video-container">
                ${thumbnail ? `<img class="video-thumbnail" src="${toAbsoluteUrl(thumbnail, baseUrl)}" alt="Video thumbnail" />` : ''}
                <div class="video-url">${escapeHtml(videoUrl)}</div>
                ${video.title ? `<div style="margin-top: 5px;"><strong>${escapeHtml(video.title)}</strong></div>` : ''}
              </div>
            `;
          }).join('')}
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
              <div class="timeline-item-title">
                ${escapeHtml(t.title)}${t.date ? ` - ${escapeHtml(t.date)}` : ''}
              </div>
              ${t.description ? `
                <div class="timeline-item-content">
                  ${t.description}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      <!-- Evidence Files -->
      ${caseStudy.evidenceFiles?.length ? `
        <div class="evidence-section">
          <h3>📁 Original Evidence Files</h3>
          <p style="color: #666; margin-bottom: 10px;">View the original submission files that inspired this case study</p>
          <div class="evidence-files-grid">
            ${caseStudy.evidenceFiles.map((file: any) => `
              <div class="evidence-file">
                <div class="evidence-file-name">${escapeHtml(file.name || 'Untitled')}</div>
                ${file.url ? `<div class="evidence-file-url">${escapeHtml(file.url)}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      <!-- Evidence Link -->
      ${caseStudy.evidenceLink && !caseStudy.evidenceFiles?.length ? `
        <div class="evidence-section">
          <h3>🔗 Original Evidence</h3>
          <p style="color: #666; margin-bottom: 10px;">View the original submission that inspired this case study</p>
          <div class="evidence-link-box">
            <a href="${escapeHtml(caseStudy.evidenceLink)}" target="_blank">${escapeHtml(caseStudy.evidenceLink)}</a>
          </div>
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

/**
 * @description Extracts thumbnail URL from video URL (YouTube, Vimeo)
 * @param {string} videoUrl - Video URL
 * @returns {string | null} Thumbnail URL or null
 */
function extractVideoThumbnail(videoUrl: string): string | null {
  if (!videoUrl) return null;
  
  // YouTube
  const youtubeMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (youtubeMatch) {
    return `https://img.youtube.com/vi/${youtubeMatch[1]}/maxresdefault.jpg`;
  }
  
  // Vimeo
  const vimeoMatch = videoUrl.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    // Vimeo thumbnails require an API call, so we'll just return null
    // The PDF will show the URL without a thumbnail for Vimeo
    return null;
  }
  
  return null;
}
