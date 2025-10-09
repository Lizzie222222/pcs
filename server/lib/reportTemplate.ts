/**
 * HTML Report Template Generator for Plastic Clever Schools Analytics
 * 
 * Generates a professional, print-ready HTML report with PCS branding
 * that presents analytics data and AI insights in a visually appealing format.
 */

export interface ReportData {
  dateRange: { start: string; end: string };
  overview: {
    totalSchools: number;
    totalUsers: number;
    totalEvidence: number;
    completedAwards: number;
    pendingEvidence: number;
    averageProgress: number;
    studentsImpacted: number;
    countriesReached: number;
  };
  schoolEvidence?: {
    stageDistribution: Array<{ stage: string; count: number }>;
    progressRanges: Array<{ range: string; count: number }>;
    completionRates: Array<{ metric: string; rate: number }>;
    monthlyRegistrations: Array<{ month: string; count: number }>;
    schoolsByCountry: Array<{ country: string; count: number; students: number }>;
  };
  evidenceAnalytics?: {
    submissionTrends: Array<{ month: string; submissions: number; approvals: number; rejections: number }>;
    stageBreakdown: Array<{ stage: string; total: number; approved: number; pending: number; rejected: number }>;
    reviewTurnaround: Array<{ range: string; count: number }>;
    topSubmitters: Array<{ schoolName: string; submissions: number; approvalRate: number }>;
  };
  userEngagement?: {
    registrationTrends: Array<{ month: string; teachers: number; admins: number }>;
    roleDistribution: Array<{ role: string; count: number }>;
    activeUsers: Array<{ period: string; active: number }>;
    schoolEngagement: Array<{ schoolName: string; users: number; evidence: number; lastActivity: Date }>;
  };
  aiInsights: {
    executiveSummary: string;
    keyInsights: string[];
    trends: string[];
    recommendations: string[];
  };
}

/**
 * Generate a complete HTML report from analytics data
 * @param data - Analytics data and AI insights
 * @returns HTML string ready for display or PDF conversion
 */
export function generateHTMLReport(data: ReportData): string {
  const generatedDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const dateRangeFormatted = `${new Date(data.dateRange.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${new Date(data.dateRange.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Plastic Clever Schools - Analytics Report</title>
  <style>
    /* Reset and Base Styles */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Century Gothic', 'Trebuchet MS', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #fff;
      font-size: 11pt;
    }

    /* Typography */
    h1, h2, h3, h4 {
      font-family: 'Gilroy', 'Arial Black', 'Impact', Arial, sans-serif;
      font-weight: bold;
      color: #204969;
      margin-bottom: 1rem;
    }

    h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }

    h2 {
      font-size: 1.75rem;
      border-bottom: 3px solid #009ADE;
      padding-bottom: 0.5rem;
      margin-top: 2rem;
    }

    h3 {
      font-size: 1.25rem;
      color: #009ADE;
      margin-top: 1.5rem;
    }

    h4 {
      font-size: 1rem;
      color: #204969;
      margin-top: 1rem;
    }

    p {
      margin-bottom: 1rem;
    }

    /* Layout */
    .container {
      max-width: 210mm;
      margin: 0 auto;
      padding: 20mm;
    }

    /* Cover Page */
    .cover-page {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      background: linear-gradient(135deg, #204969 0%, #009ADE 100%);
      color: white;
      padding: 40mm;
      page-break-after: always;
    }

    .cover-logo {
      font-size: 3.5rem;
      font-weight: bold;
      margin-bottom: 2rem;
      font-family: 'Gilroy', 'Arial Black', Arial, sans-serif;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }

    .cover-title {
      font-size: 3rem;
      margin-bottom: 1rem;
      font-family: 'Gilroy', 'Arial Black', Arial, sans-serif;
    }

    .cover-subtitle {
      font-size: 1.5rem;
      margin-bottom: 3rem;
      opacity: 0.9;
    }

    .cover-date {
      font-size: 1.2rem;
      margin-top: 2rem;
      padding: 1rem 2rem;
      background: rgba(255,255,255,0.2);
      border-radius: 8px;
    }

    .cover-generated {
      font-size: 1rem;
      margin-top: 1rem;
      opacity: 0.8;
    }

    /* Metric Cards */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin: 2rem 0;
    }

    .metric-card {
      background: #fff;
      border-left: 4px solid #009ADE;
      padding: 1.25rem;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .metric-card.inspire {
      border-left-color: #8CC63F;
    }

    .metric-card.investigate {
      border-left-color: #FBB040;
    }

    .metric-card.act {
      border-left-color: #ED1C24;
    }

    .metric-label {
      font-size: 0.85rem;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.5rem;
    }

    .metric-value {
      font-size: 2rem;
      font-weight: bold;
      color: #204969;
      margin-bottom: 0.25rem;
    }

    .metric-description {
      font-size: 0.85rem;
      color: #888;
    }

    /* Section Styling */
    .section {
      margin: 2rem 0;
      page-break-inside: avoid;
    }

    .executive-summary {
      background: #f8f9fa;
      padding: 2rem;
      border-radius: 8px;
      border-left: 6px solid #009ADE;
      margin: 2rem 0;
      font-size: 1.1rem;
      line-height: 1.8;
    }

    /* Lists */
    .insights-list, .trends-list, .recommendations-list {
      list-style: none;
      padding: 0;
      margin: 1.5rem 0;
    }

    .insights-list li, .trends-list li, .recommendations-list li {
      padding: 1rem 1rem 1rem 3rem;
      margin-bottom: 1rem;
      background: #fff;
      border-radius: 4px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      position: relative;
    }

    .insights-list li::before {
      content: "💡";
      position: absolute;
      left: 1rem;
      font-size: 1.25rem;
    }

    .trends-list li::before {
      content: "📈";
      position: absolute;
      left: 1rem;
      font-size: 1.25rem;
    }

    .recommendations-list li::before {
      content: "🎯";
      position: absolute;
      left: 1rem;
      font-size: 1.25rem;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5rem 0;
      background: #fff;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    thead {
      background: #204969;
      color: white;
    }

    th {
      padding: 0.875rem;
      text-align: left;
      font-weight: bold;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    td {
      padding: 0.75rem;
      border-bottom: 1px solid #e5e7eb;
    }

    tbody tr:nth-child(even) {
      background-color: #f9fafb;
    }

    tbody tr:hover {
      background-color: #f3f4f6;
    }

    /* Progress Bars */
    .progress-bar {
      width: 100%;
      height: 24px;
      background: #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
      position: relative;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #009ADE 0%, #02BBB4 100%);
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 8px;
      color: white;
      font-size: 0.75rem;
      font-weight: bold;
      transition: width 0.3s ease;
    }

    /* Stage Colors */
    .stage-inspire {
      color: #8CC63F;
      font-weight: bold;
    }

    .stage-investigate {
      color: #FBB040;
      font-weight: bold;
    }

    .stage-act {
      color: #ED1C24;
      font-weight: bold;
    }

    /* Visual Charts (CSS-based) */
    .chart-container {
      margin: 2rem 0;
      padding: 1.5rem;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .bar-chart {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .bar-item {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .bar-label {
      min-width: 120px;
      font-weight: bold;
      color: #204969;
      font-size: 0.9rem;
    }

    .bar-visual {
      flex: 1;
      height: 32px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
      position: relative;
    }

    .bar-fill {
      height: 100%;
      background: #009ADE;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 8px;
      color: white;
      font-weight: bold;
      font-size: 0.85rem;
    }

    /* Footer */
    .report-footer {
      margin-top: 4rem;
      padding-top: 2rem;
      border-top: 2px solid #009ADE;
      text-align: center;
      color: #666;
      font-size: 0.9rem;
    }

    .report-footer-brand {
      font-weight: bold;
      color: #204969;
      font-size: 1.1rem;
      margin-bottom: 0.5rem;
    }

    /* Print Styles */
    @media print {
      body {
        margin: 0;
        padding: 0;
      }

      .container {
        max-width: 100%;
        padding: 15mm;
      }

      .page-break {
        page-break-after: always;
      }

      .cover-page {
        page-break-after: always;
      }

      .section {
        page-break-inside: avoid;
      }

      h2 {
        page-break-after: avoid;
      }

      table {
        page-break-inside: avoid;
      }

      .chart-container {
        page-break-inside: avoid;
      }

      /* Ensure colors print correctly */
      * {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }

    /* Responsive Design */
    @media screen and (max-width: 768px) {
      .container {
        padding: 10mm;
      }

      .metrics-grid {
        grid-template-columns: 1fr;
      }

      h1 {
        font-size: 2rem;
      }

      h2 {
        font-size: 1.5rem;
      }

      .cover-title {
        font-size: 2rem;
      }

      .cover-subtitle {
        font-size: 1.2rem;
      }
    }
  </style>
</head>
<body>

  <!-- Cover Page -->
  <div class="cover-page">
    <div class="cover-logo">PLASTIC CLEVER SCHOOLS</div>
    <h1 class="cover-title">Analytics Report</h1>
    <p class="cover-subtitle">Comprehensive Program Insights & Metrics</p>
    <div class="cover-date">
      <strong>Reporting Period:</strong><br>
      ${dateRangeFormatted}
    </div>
    <div class="cover-generated">
      Generated on ${generatedDate}
    </div>
  </div>

  <div class="container">

    <!-- Executive Summary -->
    <section class="section">
      <h2>Executive Summary</h2>
      <div class="executive-summary">
        ${data.aiInsights.executiveSummary}
      </div>
    </section>

    <!-- Key Metrics at a Glance -->
    <section class="section">
      <h2>Key Metrics at a Glance</h2>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Total Schools</div>
          <div class="metric-value">${data.overview.totalSchools.toLocaleString()}</div>
          <div class="metric-description">Registered institutions</div>
        </div>
        
        <div class="metric-card">
          <div class="metric-label">Active Users</div>
          <div class="metric-value">${data.overview.totalUsers.toLocaleString()}</div>
          <div class="metric-description">Teachers & administrators</div>
        </div>
        
        <div class="metric-card">
          <div class="metric-label">Students Impacted</div>
          <div class="metric-value">${data.overview.studentsImpacted.toLocaleString()}</div>
          <div class="metric-description">Total students reached</div>
        </div>
        
        <div class="metric-card">
          <div class="metric-label">Global Reach</div>
          <div class="metric-value">${data.overview.countriesReached.toLocaleString()}</div>
          <div class="metric-description">Countries participating</div>
        </div>
        
        <div class="metric-card">
          <div class="metric-label">Evidence Submissions</div>
          <div class="metric-value">${data.overview.totalEvidence.toLocaleString()}</div>
          <div class="metric-description">${data.overview.pendingEvidence} pending review</div>
        </div>
        
        <div class="metric-card">
          <div class="metric-label">Awards Completed</div>
          <div class="metric-value">${data.overview.completedAwards.toLocaleString()}</div>
          <div class="metric-description">Programs finished</div>
        </div>
        
        <div class="metric-card">
          <div class="metric-label">Average Progress</div>
          <div class="metric-value">${Math.round(data.overview.averageProgress)}%</div>
          <div class="metric-description">Across all schools</div>
        </div>
        
        <div class="metric-card">
          <div class="metric-label">Completion Rate</div>
          <div class="metric-value">${Math.round((data.overview.completedAwards / data.overview.totalSchools) * 100)}%</div>
          <div class="metric-description">Schools finishing program</div>
        </div>
      </div>
    </section>

    <div class="page-break"></div>

    <!-- Key Insights -->
    <section class="section">
      <h2>Key Insights</h2>
      <ul class="insights-list">
        ${data.aiInsights.keyInsights.map(insight => `
          <li>${insight}</li>
        `).join('')}
      </ul>
    </section>

    <!-- Trends Analysis -->
    <section class="section">
      <h2>Trends Analysis</h2>
      <ul class="trends-list">
        ${data.aiInsights.trends.map(trend => `
          <li>${trend}</li>
        `).join('')}
      </ul>
    </section>

    <div class="page-break"></div>

    <!-- Data Visualizations -->
    <section class="section">
      <h2>Data Visualizations</h2>

      ${data.schoolEvidence ? `
        <!-- School Stage Distribution -->
        <h3>School Stage Distribution</h3>
        <div class="chart-container">
          <div class="bar-chart">
            ${data.schoolEvidence.stageDistribution.map(item => {
              const maxCount = Math.max(...data.schoolEvidence!.stageDistribution.map(s => s.count));
              const percentage = (item.count / maxCount) * 100;
              const stageClass = item.stage.toLowerCase().includes('inspire') ? 'inspire' : 
                                item.stage.toLowerCase().includes('investigate') ? 'investigate' : 
                                item.stage.toLowerCase().includes('act') ? 'act' : '';
              const color = stageClass === 'inspire' ? '#8CC63F' : 
                           stageClass === 'investigate' ? '#FBB040' : 
                           stageClass === 'act' ? '#ED1C24' : '#009ADE';
              return `
                <div class="bar-item">
                  <div class="bar-label stage-${stageClass}">${item.stage}</div>
                  <div class="bar-visual">
                    <div class="bar-fill" style="width: ${percentage}%; background: ${color};">
                      ${item.count}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Progress Distribution -->
        <h3>School Progress Distribution</h3>
        <div class="chart-container">
          <div class="bar-chart">
            ${data.schoolEvidence.progressRanges.map(item => {
              const maxCount = Math.max(...data.schoolEvidence!.progressRanges.map(r => r.count));
              const percentage = (item.count / maxCount) * 100;
              return `
                <div class="bar-item">
                  <div class="bar-label">${item.range}</div>
                  <div class="bar-visual">
                    <div class="bar-fill" style="width: ${percentage}%;">
                      ${item.count} schools
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Top Countries by Schools -->
        <h3>Top 10 Countries by School Participation</h3>
        <table>
          <thead>
            <tr>
              <th>Country</th>
              <th>Schools</th>
              <th>Students</th>
              <th>Engagement</th>
            </tr>
          </thead>
          <tbody>
            ${data.schoolEvidence.schoolsByCountry.slice(0, 10).map(country => `
              <tr>
                <td><strong>${country.country}</strong></td>
                <td>${country.count.toLocaleString()}</td>
                <td>${country.students.toLocaleString()}</td>
                <td>
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: ${Math.min((country.students / 500) * 100, 100)}%;">
                      ${Math.round((country.students / 500) * 100)}%
                    </div>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      ${data.evidenceAnalytics ? `
        <div class="page-break"></div>

        <!-- Evidence by Stage -->
        <h3>Evidence Submissions by Stage</h3>
        <table>
          <thead>
            <tr>
              <th>Stage</th>
              <th>Total</th>
              <th>Approved</th>
              <th>Pending</th>
              <th>Rejected</th>
              <th>Approval Rate</th>
            </tr>
          </thead>
          <tbody>
            ${data.evidenceAnalytics.stageBreakdown.map(stage => {
              const approvalRate = stage.total > 0 ? (stage.approved / stage.total) * 100 : 0;
              const stageClass = stage.stage.toLowerCase().includes('inspire') ? 'inspire' : 
                                stage.stage.toLowerCase().includes('investigate') ? 'investigate' : 
                                stage.stage.toLowerCase().includes('act') ? 'act' : '';
              return `
                <tr>
                  <td class="stage-${stageClass}"><strong>${stage.stage}</strong></td>
                  <td>${stage.total.toLocaleString()}</td>
                  <td style="color: #02BBB4; font-weight: bold;">${stage.approved.toLocaleString()}</td>
                  <td style="color: #FBB040; font-weight: bold;">${stage.pending.toLocaleString()}</td>
                  <td style="color: #ED1C24; font-weight: bold;">${stage.rejected.toLocaleString()}</td>
                  <td>
                    <div class="progress-bar">
                      <div class="progress-fill" style="width: ${approvalRate}%;">
                        ${Math.round(approvalRate)}%
                      </div>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <!-- Top Submitters -->
        <h3>Top Performing Schools</h3>
        <table>
          <thead>
            <tr>
              <th>School Name</th>
              <th>Submissions</th>
              <th>Approval Rate</th>
            </tr>
          </thead>
          <tbody>
            ${data.evidenceAnalytics.topSubmitters.slice(0, 10).map((school, index) => `
              <tr>
                <td><strong>${index + 1}. ${school.schoolName}</strong></td>
                <td>${school.submissions.toLocaleString()}</td>
                <td>
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: ${school.approvalRate}%;">
                      ${Math.round(school.approvalRate)}%
                    </div>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      ${data.userEngagement ? `
        <div class="page-break"></div>

        <!-- User Role Distribution -->
        <h3>User Role Distribution</h3>
        <div class="chart-container">
          <div class="bar-chart">
            ${data.userEngagement.roleDistribution.map(role => {
              const maxCount = Math.max(...data.userEngagement!.roleDistribution.map(r => r.count));
              const percentage = (role.count / maxCount) * 100;
              return `
                <div class="bar-item">
                  <div class="bar-label">${role.role}</div>
                  <div class="bar-visual">
                    <div class="bar-fill" style="width: ${percentage}%; background: #02BBB4;">
                      ${role.count}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Most Engaged Schools -->
        <h3>Most Engaged Schools</h3>
        <table>
          <thead>
            <tr>
              <th>School Name</th>
              <th>Users</th>
              <th>Evidence</th>
              <th>Last Activity</th>
            </tr>
          </thead>
          <tbody>
            ${data.userEngagement.schoolEngagement.slice(0, 10).map((school, index) => `
              <tr>
                <td><strong>${index + 1}. ${school.schoolName}</strong></td>
                <td>${school.users.toLocaleString()}</td>
                <td>${school.evidence.toLocaleString()}</td>
                <td>${new Date(school.lastActivity).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}
    </section>

    <div class="page-break"></div>

    <!-- Recommendations -->
    <section class="section">
      <h2>Actionable Recommendations</h2>
      <ul class="recommendations-list">
        ${data.aiInsights.recommendations.map(recommendation => `
          <li>${recommendation}</li>
        `).join('')}
      </ul>
    </section>

    <!-- Report Footer -->
    <footer class="report-footer">
      <div class="report-footer-brand">Plastic Clever Schools</div>
      <p>This report was generated on ${generatedDate}</p>
      <p>For more information, visit plasticleverschools.org</p>
    </footer>

  </div>

</body>
</html>`;
}
