declare module '@mailchimp/mailchimp_marketing' {
  interface Config {
    apiKey?: string;
    accessToken?: string;
    server?: string;
  }

  interface ListMember {
    email_address: string;
    status: 'subscribed' | 'unsubscribed' | 'cleaned' | 'pending';
    merge_fields?: Record<string, any>;
    tags?: string[];
  }

  interface Campaign {
    id: string;
    web_id: number;
    type: string;
    create_time: string;
    send_time: string;
    status: string;
    emails_sent: number;
    recipients: {
      list_id: string;
    };
    settings: {
      subject_line: string;
      title: string;
      from_name: string;
      reply_to: string;
    };
  }

  interface CampaignReport {
    emails_sent: number;
    opens: {
      opens_total: number;
      unique_opens: number;
      open_rate: number;
    };
    clicks: {
      clicks_total: number;
      unique_clicks: number;
      click_rate: number;
    };
    unsubscribed: number;
  }

  interface List {
    id: string;
    name: string;
    date_created: string;
    list_rating: number;
    stats: {
      member_count: number;
    };
  }

  interface ListsAPI {
    getAllLists(): Promise<{ lists: List[] }>;
    addListMember(listId: string, member: ListMember): Promise<any>;
    updateListMember(listId: string, email: string, member: Partial<ListMember>): Promise<any>;
    deleteListMember(listId: string, email: string): Promise<any>;
  }

  interface CampaignsAPI {
    create(campaign: {
      type: string;
      recipients: { list_id: string };
      settings: {
        subject_line: string;
        title: string;
        from_name: string;
        reply_to: string;
      };
    }): Promise<Campaign>;
    setContent(campaignId: string, content: { html: string }): Promise<any>;
    send(campaignId: string): Promise<any>;
    getReport(campaignId: string): Promise<CampaignReport>;
  }

  const lists: ListsAPI;
  const campaigns: CampaignsAPI;

  function setConfig(config: Config): void;

  export { setConfig, lists, campaigns };
}