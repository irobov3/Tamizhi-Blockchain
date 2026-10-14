import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'tamizhi.browser.bookmarks.lib.v1';

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  addedAt: number;
}

const newId = () =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);

async function readBookmarks(): Promise<Bookmark[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Bookmark[];
  } catch {
    return [];
  }
}

async function writeBookmarks(bookmarks: Bookmark[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  } catch (e) {
    console.warn('[bookmarks] write failed', e);
  }
}

/** Add a bookmark. No-op if the URL is already bookmarked. */
export async function addBookmark(url: string, title: string): Promise<void> {
  const existing = await readBookmarks();
  if (existing.some((b) => b.url === url)) return;
  const bookmark: Bookmark = {
    id: newId(),
    url,
    title: title || url,
    addedAt: Date.now(),
  };
  await writeBookmarks([...existing, bookmark]);
}

/** Remove the bookmark with the given URL. */
export async function removeBookmark(url: string): Promise<void> {
  const existing = await readBookmarks();
  await writeBookmarks(existing.filter((b) => b.url !== url));
}

/** Load all bookmarks, newest first. */
export async function loadBookmarks(): Promise<Bookmark[]> {
  const bookmarks = await readBookmarks();
  return bookmarks.sort((a, b) => b.addedAt - a.addedAt);
}

/** Check whether a URL is already bookmarked. */
export async function isBookmarked(url: string): Promise<boolean> {
  const bookmarks = await readBookmarks();
  return bookmarks.some((b) => b.url === url);
}
