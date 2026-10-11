export type Kind = "news" | "family" | "teachers" | "event" | "album";
export type Space = "teachers" | "albums";
export type Entry = {
  id: string;
  kind: Kind;
  title: string;
  body: string;
  summary: string;
  category: string;
  activity_date: string | null;
  start_at: string | null;
  end_at: string | null;
  all_day: boolean;
  location: string;
  audience: "public" | "teachers" | "albums";
  important: boolean;
  youtube: string;
  status: "draft" | "published";
  version: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  cover_id: string | null;
};
export type Asset = {
  id: string;
  entry_id: string;
  name: string;
  alt: string;
  position: number;
  mime: string;
  size: number;
  is_photo: boolean;
};
export type Settings = {
  name: string;
  welcome: string;
  introduction: string;
  age: string;
  worship_time: string;
  worship_place: string;
  first_visit: string;
  directions: string;
  map_url: string;
  contact_url: string;
};
export const defaultSettings: Settings = {
  name: "시흥제일교회 영유아교회",
  welcome: "",
  introduction: "",
  age: "",
  worship_time: "",
  worship_place: "",
  first_visit: "",
  directions: "",
  map_url: "",
  contact_url: "",
};
export const labels: Record<Kind, string> = {
  news: "부서 소식",
  family: "가정 신앙 활동",
  teachers: "교사 자료",
  event: "일정",
  album: "사진첩",
};
export const categories = {
  news: [],
  family: ["말씀", "찬양", "활동지"],
  teachers: ["예배·공과 자료", "찬양·율동", "행사 자료", "기타"],
  event: [],
  album: [],
};
export function dateLabel(value: string | null, time = false) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    ...(time ? ({ hour: "2-digit", minute: "2-digit" } as const) : {}),
  }).format(new Date(value.length === 10 ? value + "T00:00:00+09:00" : value));
}
export function localDate(value: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
export function youtubeId(value: string) {
  try {
    const u = new URL(value);
    if (!["https:"].includes(u.protocol)) return null;
    const id =
      u.hostname === "youtu.be"
        ? u.pathname.slice(1)
        : ["www.youtube.com", "youtube.com", "m.youtube.com"].includes(
              u.hostname,
            )
          ? u.searchParams.get("v") ||
            u.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1]
          : null;
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
