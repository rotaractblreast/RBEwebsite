export type NavItem = { title: string; url: string };

export type SiteSettings = {
  email: string;
  phone: string;
  location: string;
  siteSocial: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
  };
  coreValues: Array<{ title: string; brief: string; image: string; target: string }>;
  areasOfFocus: Array<{ title: string; icon?: string; description: string }>;
};

export type PostCategory = {
  title: string;
  slug: string;
};

export type PostTag = {
  title: string;
  slug: string;
};

export type Post = {
  _id?: string;
  title: string;
  slug: string;
  publishedAt: string;
  image?: string | null;
  categories: PostCategory[];
  tags: PostTag[];
  description: string;
  bodyMarkdown: string;
  url: string;
};

export type EventDoc = {
  _id?: string;
  title: string;
  slug: string;
  start: string;
  end: string;
  venue: string;
  buttonOpen: boolean;
  buttonText: string;
  buttonUrl: string;
  image?: string | null;
  intro: string;
  description: string;
  bodyMarkdown: string;
  url: string;
};

export type Cause = {
  _id?: string;
  title: string;
  slug: string;
  focus: string;
  image?: string | null;
  due?: string | null;
  active: boolean;
  goal?: number | null;
  progress: number;
  featured: boolean;
  donationLink?: string | null;
  intro: string;
  description: string;
  bodyMarkdown: string;
  url: string;
};

export type TeamMember = {
  _id?: string;
  name: string;
  role: string;
  memberSince?: string;
  image?: string | null;
  featurelink?: string;
  social?: Record<string, string>;
};

export type BrandKitItem = {
  title: string;
  description: string;
  previewUrl: string;
  fileUrl: string;
  white?: boolean;
};

export type BrandKitGroup = {
  groupName: string;
  items: BrandKitItem[];
};
