export type SourceType = 'ircc' | 'reddit' | 'competitor' | 'news' | 'linear';

export type ContentChannel =
  | 'linkedin'
  | 'blog'
  | 'email'
  | 'instagram'
  | 'instagram_image'
  | 'instagram_reel'
  | 'instagram_carousel'
  | 'tiktok'
  | 'youtube'
  | 'youtube_short'
  | 'static_image';

export type ContentStatus = 'draft' | 'in_review' | 'approved' | 'exported';

export type Audience = 'students' | 'employers' | 'agents' | 'investors' | 'general';

export interface ScrapedItem {
  id: string;
  source: SourceType;
  sourceName: string;
  title: string;
  url: string;
  excerpt: string;
  scrapedAt: string;
}

export interface ChannelContent {
  channel: ContentChannel;
  body: string;
  visualJson?: string;  // Structured JSON for visual channels (ImageContent | CarouselSlideContent[])
  metadata?: Record<string, string>;
  generatedAt: string;
  editedAt?: string;
}

export interface Topic {
  id: string;
  title: string;
  angle: string;
  audience: Audience;
  sourceIds: string[];
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
  content: Partial<Record<ContentChannel, ChannelContent>>;
}

export interface AppData {
  scrapedItems: ScrapedItem[];
  topics: Topic[];
  lastScrapedAt: string | null;
}
