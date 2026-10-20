// Application Constants and Guest Page Link generator

// Change this to your GitHub Pages URL once published (e.g. "https://username.github.io/connect-me")
export const GUEST_PAGE_BASE_URL = "http://localhost:8080";

export function getGuestEventUrl(eventId: string, customBaseUrl?: string): string {
  const base = customBaseUrl || GUEST_PAGE_BASE_URL;
  return `${base.replace(/\/$/, "")}/#/event/${eventId}`;
}
