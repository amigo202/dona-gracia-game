export type AvatarVideo = {
  src: string;
  poster?: string;
  caption?: string;
};

/**
 * מפת סרטוני האווטר לפי תחנה.
 * נתיבים יחסיים נטענים מתיקיית avatars/ לצד index.html.
 * תחנה ללא ערך תסתיר את אזור האווטר באופן אוטומטי.
 */
export const avatarVideos: Record<string, AvatarVideo | undefined> = {
  lisbon: {
    src: './avatars/lisbon.mp4',
    poster: './avatars/lisbon.jpg',
    caption: 'דונה גרציה מספרת על תחילת הדרך בליסבון',
  },
  antwerp: {
    src: './avatars/antwerp.mp4',
    poster: './avatars/antwerp.jpg',
    caption: 'דונה גרציה מספרת על ניהול העסקים והבריחה מאנטוורפן',
  },
  istanbul: {
    src: './avatars/istanbul.mp4',
    poster: './avatars/istanbul.jpg',
    caption: 'דונה גרציה מספרת על החיים בקושטא ועל המנהיגות הציבורית',
  },
};

export function getAvatarVideo(slug: string): AvatarVideo | null {
  const entry = avatarVideos[slug];
  if (!entry?.src) return null;
  return entry;
}
