import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const actor = "11111111-1111-4111-8111-111111111111";
const actor2 = "22222222-2222-4222-8222-222222222222";
const outsider = "33333333-3333-4333-8333-333333333333";
test("실제 PostgreSQL에서 마이그레이션·권한·검토·수정 충돌·세션 버전을 검증한다", async (t) => {
  const pg = new PGlite();
  await pg.exec(
    `create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);insert into auth.users values('${actor}'),('${actor2}'),('${outsider}');`,
  );
  const sql = (
    await readFile("supabase/migrations/001_initial.sql", "utf8")
  ).replace("create extension if not exists pgcrypto;", "");
  await pg.exec(sql);
  await pg.exec(
    await readFile("supabase/migrations/002_file_cleanup.sql", "utf8"),
  );
  await pg.exec(
    `insert into administrators(user_id) values('${actor}'),('${actor2}');`,
  );
  const save = async (data: Record<string, unknown>, who = actor) => {
    const r = await pg.query<{ id: string }>(
      "select save_entry($1::jsonb,$2::uuid) as id",
      [JSON.stringify(data), who],
    );
    return r.rows[0].id;
  };
  const base = {
    kind: "news",
    title: "테스트 전용",
    body: "",
    summary: "",
    category: "",
    activity_date: null,
    start_at: null,
    end_at: null,
    all_day: false,
    location: "",
    audience: "public",
    important: false,
    youtube: "",
    status: "draft",
    version: 0,
    cover_id: null,
    reviewed: false,
  };
  await t.test(
    "허가된 두 관리자가 함께 편집하고 오래된 버전은 거부한다",
    async () => {
      const id = await save(base);
      await save(
        { ...base, id, version: 1, title: "두 번째 교사 수정" },
        actor2,
      );
      await assert.rejects(() => save({ ...base, id, version: 1 }), /CONFLICT/);
      await pg.query("select delete_entry($1,2,$2)", [id, actor]);
      await assert.rejects(() => save({ ...base, id, version: 3 }), /CONFLICT/);
    },
  );
  await t.test("허가되지 않은 계정은 관리 함수를 실행할 수 없다", async () => {
    await assert.rejects(() => save(base, outsider), /UNAUTHORIZED/);
  });
  await t.test("검토와 앨범 사진 없는 게시를 DB에서도 거부한다", async () => {
    await assert.rejects(
      () => save({ ...base, kind: "family", status: "published" }),
      /REVIEW_REQUIRED/,
    );
    await assert.rejects(
      () =>
        save({
          ...base,
          kind: "album",
          audience: "albums",
          activity_date: "2026-10-11",
          status: "published",
          reviewed: true,
        }),
      /PHOTO_REQUIRED/,
    );
  });
  await t.test(
    "비공개 자료 공개범위 위조를 제약조건으로 거부한다",
    async () => {
      await assert.rejects(
        () =>
          save({
            ...base,
            kind: "teachers",
            activity_date: "2026-10-11",
            audience: "public",
          }),
        /check constraint/,
      );
    },
  );
  await t.test("비밀번호 교체가 해당 공간 버전만 변경한다", async () => {
    await pg.query("select rotate_password($1,$2,$3)", [
      "teachers",
      "hash-one",
      actor,
    ]);
    await pg.query("select rotate_password($1,$2,$3)", [
      "albums",
      "hash-two",
      actor,
    ]);
    await pg.query("select rotate_password($1,$2,$3)", [
      "teachers",
      "hash-three",
      actor,
    ]);
    const r = await pg.query<{ space: string; version: number }>(
      "select space,version from access_settings order by space",
    );
    assert.deepEqual(r.rows, [
      { space: "albums", version: 1 },
      { space: "teachers", version: 2 },
    ]);
  });
  await t.test("요청 제한은 5회 이후 거부한다", async () => {
    for (let i = 0; i < 7; i++) {
      const r = await pg.query<{ ok: boolean }>(
        "select consume_attempt($1,5) as ok",
        ["test-key"],
      );
      assert.equal(r.rows[0].ok, i < 5);
    }
  });
  await t.test(
    "동시 비밀번호 변경도 두 공간에 같은 비밀번호를 저장할 수 없다",
    async () => {
      await pg.query("select rotate_password($1,$2,$3,$4)", [
        "teachers",
        "hash-4",
        actor,
        "same-secret-fingerprint",
      ]);
      await assert.rejects(
        () =>
          pg.query("select rotate_password($1,$2,$3,$4)", [
            "albums",
            "hash-5",
            actor2,
            "same-secret-fingerprint",
          ]),
        /unique constraint/,
      );
    },
  );
  await t.test(
    "anon/authenticated는 직접 읽기와 함수 실행 모두 차단된다",
    async () => {
      for (const role of ["anon", "authenticated"]) {
        await pg.exec(`set role ${role}`);
        try {
          await assert.rejects(
            () => pg.query("select * from entries"),
            /permission denied/,
          );
          await assert.rejects(
            () => pg.query("select * from access_settings"),
            /permission denied/,
          );
          await assert.rejects(() => save(base), /permission denied/);
        } finally {
          await pg.exec("reset role");
        }
      }
    },
  );
  await t.test(
    "파일 추가는 초안으로 되돌리고 삭제는 소유 항목의 파일만 정리한다",
    async () => {
      const first = await save({ ...base, status: "published" });
      const second = await save({ ...base, status: "published" });
      const asset1 = "44444444-4444-4444-8444-444444444444";
      const asset2 = "55555555-5555-4555-8555-555555555555";
      const intent = "66666666-6666-4666-8666-666666666666";
      await pg.query(
        "insert into upload_intents(id,entry_id,version,owner_id,name,size,path) values($1,$2,1,$3,$4,10,$5)",
        [intent, first, actor, "test.pdf", "quarantine-test"],
      );
      await pg.query("select attach_asset($1,$2::jsonb,$3)", [
        intent,
        JSON.stringify({
          id: asset1,
          name: "test.pdf",
          mime: "application/pdf",
          size: 10,
          bucket: "public-materials",
          path: first + "/file.pdf",
          thumb_path: null,
        }),
        actor,
      ]);
      const parent = await pg.query<{ status: string; version: number }>(
        "select status,version from entries where id=$1",
        [first],
      );
      assert.deepEqual(parent.rows[0], { status: "draft", version: 2 });
      await pg.query(
        "insert into assets(id,entry_id,name,mime,size,bucket,path) values($1,$2,$3,$4,10,$5,$6)",
        [
          asset2,
          second,
          "keep.pdf",
          "application/pdf",
          "public-materials",
          second + "/keep.pdf",
        ],
      );
      await assert.rejects(
        () =>
          pg.query("select edit_asset($1,1,$2,true,$3)", [asset1, "", actor]),
        /CONFLICT/,
      );
      await pg.query("select delete_entry($1,2,$2)", [first, actor]);
      assert.equal(
        (await pg.query("select id from assets where id=$1", [asset1])).rows
          .length,
        0,
      );
      assert.equal(
        (await pg.query("select id from assets where id=$1", [asset2])).rows
          .length,
        1,
      );
      const queued = await pg.query<{ path: string }>(
        "select path from storage_deletions",
      );
      assert.deepEqual(queued.rows, [{ path: first + "/file.pdf" }]);
    },
  );
  await pg.close();
});
