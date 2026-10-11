import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { zipSync, strToU8 } from "fflate";
import {
  hashPassword,
  verifyPassword,
  signSession,
  verifySession,
} from "../src/lib/crypto";
import { entrySchema, settingsSchema } from "../src/lib/validation";
import { inspectUpload, uploadLimit } from "../src/lib/uploads";
import { youtubeId, localDate } from "../src/lib/types";
test("비밀번호는 무작위 솔트를 사용하며 잘못된 입력은 거부한다", async () => {
  const hash = await hashPassword("test-password-123");
  assert.notEqual(hash, await hashPassword("test-password-123"));
  assert.equal(await verifyPassword("test-password-123", hash), true);
  assert.equal(await verifyPassword("wrong-password", hash), false);
  assert.equal(await verifyPassword("x", "bad"), false);
});
test("서명된 세션은 공간·버전·만료·변조를 확인한다", () => {
  const key = "test-secret-with-at-least-32-characters";
  const now = 100000;
  const token = signSession("teachers", 2, key, now);
  assert.equal(verifySession(token, "teachers", 2, key, now), true);
  for (const [space, version, time] of [
    ["albums", 2, now],
    ["teachers", 3, now],
    ["teachers", 2, now + 43200000],
  ] as const)
    assert.equal(verifySession(token, space, version, key, time), false);
  assert.equal(verifySession(token + "x", "teachers", 2, key, now), false);
  assert.equal(verifySession(token, "teachers", 2, "wrong", now), false);
});
test("공개범위와 게시 전 검토를 서버 입력에서 강제한다", () => {
  const base = {
    kind: "family",
    title: "테스트",
    category: "말씀",
    audience: "public",
    status: "published",
  };
  assert.equal(entrySchema.safeParse(base).success, false);
  assert.equal(
    entrySchema.safeParse({ ...base, reviewed: true }).success,
    true,
  );
  assert.equal(
    entrySchema.safeParse({ ...base, status: "draft" }).success,
    true,
  );
  assert.equal(
    entrySchema.safeParse({ ...base, reviewed: true, audience: "teachers" })
      .success,
    false,
  );
  assert.equal(
    entrySchema.safeParse({
      kind: "event",
      title: "테스트",
      status: "draft",
      start_at: "2026-10-11T01:00:00Z",
      end_at: "2026-10-11T02:00:00Z",
    }).success,
    false,
  );
  assert.equal(
    entrySchema.safeParse({
      kind: "teachers",
      title: "테스트",
      category: "기타",
      audience: "teachers",
      status: "draft",
      activity_date: "2026-02-30",
    }).success,
    false,
  );
});
test("위험한 링크는 거부하고 한국 날짜를 유지한다", () => {
  assert.equal(
    youtubeId("https://www.youtube.com/watch?v=abcdefghijk"),
    "abcdefghijk",
  );
  assert.equal(
    youtubeId("https://youtube.com.evil.test/watch?v=abcdefghijk"),
    null,
  );
  assert.equal(youtubeId("javascript:alert(1)"), null);
  assert.equal(localDate("2026-10-10T15:30:00Z"), "2026-10-11");
});
test("실행파일, 크기 초과와 위장된 문서를 거부한다", async () => {
  assert.throws(() => uploadLimit("test.html", false, 10));
  assert.throws(() => uploadLimit("test.jpg", true, 10 * 1024 * 1024 + 1));
  assert.throws(() => uploadLimit("test.pdf", false, 20 * 1024 * 1024 + 1));
  await assert.rejects(() =>
    inspectUpload(Buffer.from("<script>bad</script>"), "test.jpg", true),
  );
  await assert.rejects(() =>
    inspectUpload(Buffer.from("not a pdf"), "test.pdf", false),
  );
  const macro = zipSync({
    "word/document.xml": strToU8("<xml/>"),
    "word/vbaProject.bin": strToU8("test"),
  });
  await assert.rejects(() =>
    inspectUpload(Buffer.from(macro), "test.docx", false),
  );
});
test("사진의 EXIF를 제거하고 썸네일을 생성한다", async () => {
  const source = await sharp({
    create: { width: 900, height: 600, channels: 3, background: "#ffeaaa" },
  })
    .jpeg()
    .withExif({ IFD0: { Artist: "test-private-name" } })
    .toBuffer();
  assert.ok((await sharp(source).metadata()).exif);
  const clean = await inspectUpload(source, "photo.jpg", true);
  assert.equal((await sharp(clean.bytes).metadata()).exif, undefined);
  assert.ok(clean.thumb);
  assert.ok((await sharp(clean.thumb!).metadata()).width! <= 640);
  assert.equal(clean.mime, "image/webp");
});
