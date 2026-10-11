import "server-only";
import { AppError, configured, db, requireSpace } from "./server";
import {
  defaultSettings,
  type Settings,
  type Entry,
  type Kind,
  type Asset,
} from "./types";
export const entryColumns =
  "id,kind,title,body,summary,category,activity_date,start_at,end_at,all_day,location,audience,important,youtube,status,version,created_at,updated_at,published_at,cover_id";
export const assetColumns = "id,entry_id,name,alt,position,mime,size,is_photo";
export async function settings() {
  if (!configured()) return { data: defaultSettings, version: 0 };
  const { data, error } = await db()
    .from("site_settings")
    .select("data,version")
    .eq("id", true)
    .single();
  if (error) throw new AppError("기본 안내를 불러오지 못했습니다.", 503);
  return {
    data: { ...defaultSettings, ...data.data } as Settings,
    version: data.version as number,
  };
}
export async function entries(
  kind: Kind,
  teacherEvents = false,
): Promise<Entry[]> {
  if (kind === "teachers") await requireSpace("teachers");
  if (kind === "album") await requireSpace("albums");
  if (teacherEvents) await requireSpace("teachers");
  if (!configured()) return [];
  const audience =
    kind === "teachers" || teacherEvents
      ? "teachers"
      : kind === "album"
        ? "albums"
        : "public";
  const { data, error } = await db()
    .from("entries")
    .select(entryColumns)
    .eq("kind", kind)
    .eq("audience", audience)
    .eq("status", "published")
    .is("deleted_at", null)
    .order(
      kind === "event"
        ? "start_at"
        : kind === "album" || kind === "teachers"
          ? "activity_date"
          : "published_at",
      { ascending: kind === "event" },
    );
  if (error) throw new AppError("자료를 불러오지 못했습니다.", 503);
  return (data || []) as Entry[];
}
export async function entry(id: string, kind: Kind, teacherEvent = false) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  if (kind === "teachers") await requireSpace("teachers");
  if (kind === "album") await requireSpace("albums");
  if (teacherEvent) await requireSpace("teachers");
  if (!configured()) return null;
  const { data, error } = await db()
    .from("entries")
    .select(entryColumns)
    .eq("id", id)
    .eq("kind", kind)
    .eq(
      "audience",
      kind === "teachers" || teacherEvent
        ? "teachers"
        : kind === "album"
          ? "albums"
          : "public",
    )
    .eq("status", "published")
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new AppError("자료를 불러오지 못했습니다.", 503);
  if (data?.audience === "teachers") await requireSpace("teachers");
  if (data?.audience === "albums") await requireSpace("albums");
  return data as Entry | null;
}
export async function assets(item: Entry): Promise<Asset[]> {
  if (item.audience === "teachers") await requireSpace("teachers");
  if (item.audience === "albums") await requireSpace("albums");
  const { data, error } = await db()
    .from("assets")
    .select(assetColumns)
    .eq("entry_id", item.id)
    .order("position");
  if (error) throw new AppError("파일을 불러오지 못했습니다.", 503);
  return data || [];
}
