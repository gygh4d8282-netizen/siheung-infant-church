import { z } from "zod";
import { categories, youtubeId } from "./types";
const text = z.string().max(50000);
export const entrySchema = z
  .object({
    id: z.uuid().optional(),
    version: z.number().int().nonnegative().default(0),
    kind: z.enum(["news", "family", "teachers", "event", "album"]),
    title: z.string().trim().min(1, "제목을 입력해 주세요.").max(200),
    body: text.default(""),
    summary: z.string().max(600).default(""),
    category: z.string().default(""),
    activity_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .default(null),
    start_at: z.iso.datetime({ offset: true }).nullable().default(null),
    end_at: z.iso.datetime({ offset: true }).nullable().default(null),
    all_day: z.boolean().default(false),
    location: z.string().max(300).default(""),
    audience: z.enum(["public", "teachers", "albums"]),
    important: z.boolean().default(false),
    youtube: z.string().max(1000).default(""),
    status: z.enum(["draft", "published"]),
    reviewed: z.boolean().default(false),
    cover_id: z.uuid().nullable().default(null),
  })
  .superRefine((v, c) => {
    const issue = (message: string) => c.addIssue({ code: "custom", message });
    if (
      v.kind === "event" &&
      (!v.start_at || !v.end_at || new Date(v.end_at) < new Date(v.start_at))
    )
      issue("시작과 종료 일시를 확인해 주세요.");
    if (["teachers", "album"].includes(v.kind) && !v.activity_date)
      issue("활동 기준 날짜를 입력해 주세요.");
    if (
      v.activity_date &&
      new Date(v.activity_date + "T00:00:00Z").toISOString().slice(0, 10) !==
        v.activity_date
    )
      issue("올바른 날짜를 입력해 주세요.");
    if (v.youtube && !youtubeId(v.youtube))
      issue("올바른 YouTube https 링크를 입력해 주세요.");
    if (
      categories[v.kind].length &&
      !(categories[v.kind] as string[]).includes(v.category)
    )
      issue("자료 종류를 선택해 주세요.");
    const allowed =
      v.kind === "teachers"
        ? ["teachers"]
        : v.kind === "album"
          ? ["albums"]
          : v.kind === "event"
            ? ["public", "teachers"]
            : ["public"];
    if (!allowed.includes(v.audience)) issue("공개 범위를 선택해 주세요.");
    if (
      v.status === "published" &&
      ["family", "teachers", "album"].includes(v.kind) &&
      !v.reviewed
    )
      issue("게시 전 검토 확인이 필요합니다.");
  });
const safeLink = z
  .string()
  .max(1000)
  .refine(
    (v) =>
      !v ||
      (/^https:\/\//.test(v) &&
        (() => {
          try {
            const u = new URL(v);
            return !u.username && !u.password;
          } catch {
            return false;
          }
        })()),
    "공식 링크는 https 주소로 입력해 주세요.",
  );
export const settingsSchema = z.object({
  name: z.string().trim().min(1).max(100),
  welcome: text,
  introduction: text,
  age: z.string().max(200),
  worship_time: z.string().max(200),
  worship_place: z.string().max(300),
  first_visit: text,
  directions: text,
  map_url: safeLink,
  contact_url: safeLink,
});
export const passwordSchema = z
  .string()
  .min(12, "공용 비밀번호는 12자 이상으로 정해 주세요.")
  .max(128);
