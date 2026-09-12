export const SITE = {
  title: "Rotaract Bangalore East",
  subtitle: "Unite. Rise. Empower.",
  description:
    "Rotaract Bangalore East is a voluntary youth organization in Bangalore for young adults 18+. Join us for leadership, service, and fellowship.",
  url: "https://rotaractblreast.org",
  ogImage: "/images/site/ogimage.png",
  gaId: "G-LYQWP4N6TE",
  timezone: "Asia/Kolkata",
} as const;

/** Primary header nav - kept in code (not Sanity). Trailing slashes match site routing. */
export const PRIMARY_NAV = [
  { title: "Home", url: "/" },
  { title: "About", url: "/about/" },
  { title: "News", url: "/news/" },
  { title: "Causes", url: "/causes/" },
  { title: "Events", url: "/events/" },
  { title: "Contact", url: "/contact/" },
] as const;

/** Card grid page size (3×3) for news, past events, and completed causes. */
export const LIST_PAGE_SIZE = 9;
export const POSTS_PER_PAGE = LIST_PAGE_SIZE;
