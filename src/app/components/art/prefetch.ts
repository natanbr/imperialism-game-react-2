// Pictures the player is about to see, loaded ahead of their <img> (FR-342), so the <img> that follows draws at once
// instead of standing empty while the network answers.

/**
 * Every picture asked for in this page, kept: each is asked for once. Kept, not dropped: Chromium requested a picture
 * again for a later <img> once a detached Image that had loaded it was gone (seen 2026-11-14 with Cache-Control
 * max-age=0, which is how Next serves public/); while the Image lives, the <img> reuses its picture.
 */
const asked = new Map<string, HTMLImageElement>();

/** Starts loading each picture not asked for yet in this page; nothing where there is no browser (server render). */
export function prefetchPictures(urls: readonly string[]): void {
  if (typeof Image === "undefined") return;
  for (const url of urls) {
    if (asked.has(url)) continue;
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    asked.set(url, image);
  }
}
