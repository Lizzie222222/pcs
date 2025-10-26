import mailchimp from '@mailchimp/mailchimp_marketing';
import { storage } from './storage';
import { createHash } from 'crypto';

// Mailchimp configuration
if (!process.env.MAILCHIMP_API_KEY) {
  console.warn("MAILCHIMP_API_KEY environment variable not set");
}

if (!process.env.MAILCHIMP_SERVER_PREFIX) {
  console.warn("MAILCHIMP_SERVER_PREFIX environment variable not set (e.g., 'us6')");
}

if (process.env.MAILCHIMP_API_KEY && process.env.MAILCHIMP_SERVER_PREFIX) {
  mailchimp.setConfig({
    apiKey: process.env.MAILCHIMP_API_KEY,
    server: process.env.MAILCHIMP_SERVER_PREFIX,
  });
}

interface MailchimpContact {
  email: string;
  firstName?: string;
  lastName?: string;
  schoolName?: string;
  schoolCountry?: string;
  role?: string;
  tags?: string[];
}

interface MailchimpCampaign {
  subject: string;
  title: string;
  content: string;
  audienceId: string;
  fromName?: string;
  fromEmail?: string;
  tags?: string[];
}

interface MailchimpAudience {
  id: string;
  name: string;
  memberCount: number;
  listRating: number;
  dateCreated: string;
}

export class MailchimpService {
  private isConfigured(): boolean {
    return !!(process.env.MAILCHIMP_API_KEY && process.env.MAILCHIMP_SERVER_PREFIX);
  }

  // Helper function to get MD5 hash for Mailchimp subscriber hash
  private getSubscriberHash(email: string): string {
    return createHash('md5').update(email.toLowerCase().trim()).digest('hex');
  }

  // Get all audiences/lists
  async getAudiences(): Promise<MailchimpAudience[]> {
    if (!this.isConfigured()) {
      throw new Error('Mailchimp not configured');
    }

    try {
      const response = await mailchimp.lists.getAllLists();
      return response.lists.map((list: any) => ({
        id: list.id,
        name: list.name,
        memberCount: list.stats.member_count,
        listRating: list.list_rating,
        dateCreated: list.date_created,
      }));
    } catch (error: any) {
      console.error('Mailchimp get audiences error:', error);
      throw new Error(`Failed to get audiences: ${error.message}`);
    }
  }

  // Add contact to audience
  async addContactToAudience(audienceId: string, contact: MailchimpContact): Promise<boolean> {
    if (!this.isConfigured()) {
      console.error('Cannot add contact: Mailchimp not configured');
      return false;
    }

    try {
      const memberData: any = {
        email_address: contact.email,
        status: 'subscribed',
        merge_fields: {},
        tags: contact.tags || [],
      };

      if (contact.firstName) memberData.merge_fields.FNAME = contact.firstName;
      if (contact.lastName) memberData.merge_fields.LNAME = contact.lastName;
      if (contact.schoolName) memberData.merge_fields.SCHOOL = contact.schoolName;
      if (contact.schoolCountry) memberData.merge_fields.COUNTRY = contact.schoolCountry;
      if (contact.role) memberData.merge_fields.ROLE = contact.role;

      await mailchimp.lists.addListMember(audienceId, memberData);

      // Persist subscription to database
      try {
        await storage.createMailchimpSubscription({
          audienceId,
          email: contact.email,
          status: 'subscribed',
          tags: JSON.stringify(contact.tags || []),
          mergeFields: JSON.stringify({
            firstName: contact.firstName,
            lastName: contact.lastName,
            schoolName: contact.schoolName,
            schoolCountry: contact.schoolCountry,
            role: contact.role,
          }),
        });
      } catch (dbError) {
        console.warn('Failed to persist Mailchimp subscription to database:', dbError);
      }

      // Log the subscription
      await storage.logEmail({
        recipientEmail: contact.email,
        subject: 'Mailchimp Subscription',
        template: 'mailchimp_subscription',
        status: 'sent',
      });

      return true;
    } catch (error: any) {
      console.error('Mailchimp add contact error:', error);
      
      // Log failed subscription
      await storage.logEmail({
        recipientEmail: contact.email,
        subject: 'Mailchimp Subscription',
        template: 'mailchimp_subscription',
        status: 'failed',
      });

      return false;
    }
  }

  // Update contact in audience
  async updateContact(audienceId: string, email: string, updates: Partial<MailchimpContact>): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const memberData: any = {
        merge_fields: {},
      };

      if (updates.firstName) memberData.merge_fields.FNAME = updates.firstName;
      if (updates.lastName) memberData.merge_fields.LNAME = updates.lastName;
      if (updates.schoolName) memberData.merge_fields.SCHOOL = updates.schoolName;
      if (updates.schoolCountry) memberData.merge_fields.COUNTRY = updates.schoolCountry;
      if (updates.role) memberData.merge_fields.ROLE = updates.role;
      if (updates.tags) memberData.tags = updates.tags;

      const subscriberHash = this.getSubscriberHash(email);
      await mailchimp.lists.updateListMember(audienceId, subscriberHash, memberData);
      return true;
    } catch (error: any) {
      console.error('Mailchimp update contact error:', error);
      return false;
    }
  }

  // Remove contact from audience
  async removeContact(audienceId: string, email: string): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const subscriberHash = this.getSubscriberHash(email);
      await mailchimp.lists.deleteListMember(audienceId, subscriberHash);
      return true;
    } catch (error: any) {
      console.error('Mailchimp remove contact error:', error);
      return false;
    }
  }

  // Create and send campaign
  async createCampaign(campaign: MailchimpCampaign): Promise<{ campaignId: string; webId: number } | null> {
    if (!this.isConfigured()) {
      throw new Error('Mailchimp not configured');
    }

    try {
      // Create campaign
      const campaignResponse = await mailchimp.campaigns.create({
        type: 'regular',
        recipients: {
          list_id: campaign.audienceId,
        },
        settings: {
          subject_line: campaign.subject,
          title: campaign.title,
          from_name: campaign.fromName || 'Plastic Clever Schools',
          reply_to: campaign.fromEmail || process.env.FROM_EMAIL || 'noreply@plasticcleverschools.org',
        },
      });

      const campaignId = campaignResponse.id;
      const webId = campaignResponse.web_id;

      // Set campaign content
      await mailchimp.campaigns.setContent(campaignId, {
        html: this.getMailchimpTemplate(campaign.content, campaign.subject),
      });

      return { campaignId, webId };
    } catch (error: any) {
      console.error('Mailchimp create campaign error:', error);
      throw new Error(`Failed to create campaign: ${error.message}`);
    }
  }

  // Send campaign
  async sendCampaign(campaignId: string): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      await mailchimp.campaigns.send(campaignId);
      return true;
    } catch (error: any) {
      console.error('Mailchimp send campaign error:', error);
      return false;
    }
  }

  // Get campaign stats
  async getCampaignStats(campaignId: string): Promise<any> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const stats = await mailchimp.campaigns.getReport(campaignId);
      return {
        emailsSent: stats.emails_sent,
        opensTotal: stats.opens.opens_total,
        uniqueOpens: stats.opens.unique_opens,
        openRate: stats.opens.open_rate,
        clicksTotal: stats.clicks.clicks_total,
        uniqueClicks: stats.clicks.unique_clicks,
        clickRate: stats.clicks.click_rate,
        unsubscribes: stats.unsubscribed,
      };
    } catch (error: any) {
      console.error('Mailchimp get campaign stats error:', error);
      return null;
    }
  }

  // Setup automation for school signup
  async setupSchoolSignupAutomation(contact: MailchimpContact): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      // Add contact with specific tags to trigger automation
      const audienceId = process.env.MAILCHIMP_MAIN_AUDIENCE_ID;
      if (!audienceId) {
        console.warn('MAILCHIMP_MAIN_AUDIENCE_ID not set');
        return false;
      }

      return await this.addContactToAudience(audienceId, {
        ...contact,
        tags: [...(contact.tags || []), 'new_school_signup'],
      });
    } catch (error: any) {
      console.error('Mailchimp setup automation error:', error);
      return false;
    }
  }

  // Setup automation for evidence submission
  async setupEvidenceSubmissionAutomation(contact: MailchimpContact, evidenceTitle: string): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const audienceId = process.env.MAILCHIMP_MAIN_AUDIENCE_ID;
      if (!audienceId) {
        return false;
      }

      return await this.addContactToAudience(audienceId, {
        ...contact,
        tags: [...(contact.tags || []), 'evidence_submitted'],
      });
    } catch (error: any) {
      console.error('Mailchimp evidence automation error:', error);
      return false;
    }
  }

  // Get Mailchimp email template
  private getMailchimpTemplate(content: string, subject: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'https://plasticcleverschools.org';
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; max-width: 90%; border-collapse: collapse; background: white; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #0B3D5D 0%, #019ADE 100%); padding: 40px 20px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🌱 Plastic Clever Schools</h1>
                    <p style="color: #B8E6FF; margin: 10px 0 0 0; font-size: 16px;">Making waves for a plastic-free future</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px; line-height: 1.6; color: #333;">
                    <div style="font-size: 16px;">
                      ${content}
                    </div>
                  </td>
                </tr>
                
                <!-- Call to Action -->
                <tr>
                  <td style="padding: 0 30px 40px; text-align: center;">
                    <a href="${baseUrl}" 
                       style="display: inline-block; background: #FF595A; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                      Visit Plastic Clever Schools
                    </a>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background: #0B3D5D; color: white; padding: 30px; text-align: center;">
                    <p style="margin: 0 0 10px 0; font-size: 14px;">© 2024 Plastic Clever Schools. All rights reserved.</p>
                    <p style="margin: 0; font-size: 12px; color: #B8E6FF;">
                      You received this email because you're part of our community.
                      <br>
                      <a href="*|UNSUB|*" style="color: #B8E6FF;">Unsubscribe</a> | 
                      <a href="*|UPDATE_PROFILE|*" style="color: #B8E6FF;">Update Preferences</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  // Send event announcement campaign
  async sendEventAnnouncement(event: any, audienceId: string): Promise<{ success: boolean; campaignId?: string; webId?: number; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Mailchimp not configured' };
    }

    try {
      const eventDate = new Date(event.startDateTime);
      const formattedDate = eventDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      const formattedTime = eventDate.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZoneName: 'short'
      });

      const eventTypeLabels: { [key: string]: string } = {
        workshop: '🎨 Workshop',
        webinar: '💻 Webinar',
        community_event: '🌍 Community Event',
        training: '📚 Training',
        celebration: '🎉 Celebration',
        other: '📅 Event'
      };

      const eventTypeLabel = eventTypeLabels[event.eventType] || '📅 Event';
      const locationInfo = event.isVirtual 
        ? '💻 Virtual Event' 
        : `📍 ${event.location || 'Location TBA'}`;

      const baseUrl = process.env.FRONTEND_URL || 'https://plasticcleverschools.org';
      const registrationUrl = `${baseUrl}/events/${event.id}`;

      const subject = `${eventTypeLabel}: ${event.title}`;
      
      const content = `
        <h2 style="color: #0B3D5D; margin-top: 0;">${eventTypeLabel}: ${event.title}</h2>
        
        <div style="background: #F0F9FF; border-left: 4px solid #019ADE; padding: 20px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0; color: #0B3D5D; font-size: 18px; font-weight: bold;">
            📅 ${formattedDate}
          </p>
          <p style="margin: 0 0 10px 0; color: #0B3D5D; font-size: 16px;">
            🕐 ${formattedTime}
          </p>
          <p style="margin: 0; color: #0B3D5D; font-size: 16px;">
            ${locationInfo}
          </p>
        </div>

        <div style="margin: 30px 0;">
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            ${event.description}
          </p>
        </div>

        ${event.meetingLink ? `
          <div style="background: #FFF9E6; border-left: 4px solid #FFC557; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #8B6914; font-size: 14px;">
              💡 Meeting Link: <a href="${event.meetingLink}" style="color: #0B3D5D;">${event.meetingLink}</a>
            </p>
          </div>
        ` : ''}

        ${event.capacity ? `
          <p style="font-size: 14px; color: #666; margin: 20px 0;">
            ⚠️ Limited spaces available - ${event.capacity} spots total
          </p>
        ` : ''}

        <div style="text-align: center; margin: 30px 0;">
          <a href="${registrationUrl}" 
             style="display: inline-block; background: #019ADE; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">
            Register Now
          </a>
        </div>

        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          Don't miss this opportunity to connect with fellow educators and advance your plastic reduction journey!
        </p>
      `;

      const campaign = await this.createCampaign({
        subject,
        title: `Event Announcement: ${event.title}`,
        content,
        audienceId,
        fromName: 'Plastic Clever Schools Events',
      });

      if (!campaign) {
        return { success: false, error: 'Failed to create campaign' };
      }

      const sent = await this.sendCampaign(campaign.campaignId);
      
      if (!sent) {
        return { success: false, error: 'Failed to send campaign' };
      }

      return { 
        success: true, 
        campaignId: campaign.campaignId,
        webId: campaign.webId
      };
    } catch (error: any) {
      console.error('Mailchimp send event announcement error:', error);
      return { success: false, error: error.message };
    }
  }

  // Create event digest campaign
  async createEventDigest(events: any[], audienceId: string): Promise<{ success: boolean; campaignId?: string; webId?: number; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Mailchimp not configured' };
    }

    if (!events || events.length === 0) {
      return { success: false, error: 'No events to include in digest' };
    }

    try {
      const baseUrl = process.env.FRONTEND_URL || 'https://plasticcleverschools.org';

      const eventTypeLabels: { [key: string]: string } = {
        workshop: '🎨 Workshop',
        webinar: '💻 Webinar',
        community_event: '🌍 Community Event',
        training: '📚 Training',
        celebration: '🎉 Celebration',
        other: '📅 Event'
      };

      const groupedEvents: { [key: string]: any[] } = {};
      events.forEach(event => {
        const type = event.eventType || 'other';
        if (!groupedEvents[type]) {
          groupedEvents[type] = [];
        }
        groupedEvents[type].push(event);
      });

      let eventsHtml = '';
      Object.keys(groupedEvents).sort().forEach(type => {
        const typeLabel = eventTypeLabels[type] || '📅 Events';
        const typeEvents = groupedEvents[type];

        eventsHtml += `
          <h3 style="color: #0B3D5D; margin-top: 30px; margin-bottom: 20px; border-bottom: 2px solid #019ADE; padding-bottom: 10px;">
            ${typeLabel}
          </h3>
        `;

        typeEvents.forEach(event => {
          const eventDate = new Date(event.startDateTime);
          const formattedDate = eventDate.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
          });
          const formattedTime = eventDate.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          });

          const locationInfo = event.isVirtual 
            ? '💻 Virtual' 
            : `📍 ${event.location || 'TBA'}`;

          const registrationUrl = `${baseUrl}/events/${event.id}`;

          eventsHtml += `
            <div style="background: #F8F9FA; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <h4 style="color: #0B3D5D; margin-top: 0; margin-bottom: 10px;">
                ${event.title}
              </h4>
              
              <p style="margin: 10px 0; color: #666; font-size: 14px;">
                <strong>📅 ${formattedDate} at ${formattedTime}</strong> | ${locationInfo}
              </p>

              <p style="margin: 15px 0; color: #333; font-size: 14px; line-height: 1.5;">
                ${event.description.substring(0, 200)}${event.description.length > 200 ? '...' : ''}
              </p>

              <a href="${registrationUrl}" 
                 style="display: inline-block; background: #019ADE; color: white; padding: 10px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; margin-top: 10px;">
                Learn More & Register
              </a>
            </div>
          `;
        });
      });

      const subject = `📅 Upcoming Events from Plastic Clever Schools`;
      const content = `
        <h2 style="color: #0B3D5D; margin-top: 0;">Upcoming Events & Opportunities</h2>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          Join us for exciting upcoming events designed to help you and your school reduce plastic waste and create lasting change!
        </p>

        ${eventsHtml}

        <div style="background: #F0F9FF; border-radius: 8px; padding: 20px; margin-top: 30px; text-align: center;">
          <p style="margin: 0; color: #0B3D5D; font-size: 16px;">
            <strong>Want to see all our events?</strong>
          </p>
          <a href="${baseUrl}/events" 
             style="display: inline-block; background: #FF595A; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin-top: 15px;">
            View All Events
          </a>
        </div>

        <p style="font-size: 14px; color: #666; margin-top: 30px; text-align: center;">
          Stay connected with the Plastic Clever Schools community and make a difference together! 🌱
        </p>
      `;

      const campaign = await this.createCampaign({
        subject,
        title: `Events Digest - ${new Date().toLocaleDateString()}`,
        content,
        audienceId,
        fromName: 'Plastic Clever Schools Events',
      });

      if (!campaign) {
        return { success: false, error: 'Failed to create digest campaign' };
      }

      const sent = await this.sendCampaign(campaign.campaignId);
      
      if (!sent) {
        return { success: false, error: 'Failed to send digest campaign' };
      }

      return { 
        success: true, 
        campaignId: campaign.campaignId,
        webId: campaign.webId
      };
    } catch (error: any) {
      console.error('Mailchimp create event digest error:', error);
      return { success: false, error: error.message };
    }
  }
}

export const mailchimpService = new MailchimpService();