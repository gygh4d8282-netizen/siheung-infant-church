import assert from "node:assert/strict";
const origin = "http://127.0.0.1:3000";
for (const path of [
  "/",
  "/about",
  "/news",
  "/family",
  "/calendar",
  "/teachers",
  "/albums",
  "/admin",
]) {
  const response = await fetch(origin + path);
  assert.equal(response.status, 200, path);
  const html = (await response.text()).replace(/<!--.*?-->/gs, "");
  assert.ok(html.includes("시흥제일교회"), path);
  assert.match(response.headers.get("cache-control") || "", /no-store/, path);
  if (path === "/teachers") assert.ok(html.includes("자료실 비밀번호"));
  if (path === "/albums") assert.ok(html.includes("사진첩 비밀번호"));
  console.log("PASS page", path);
}
for (const path of ["/api/admin", "/api/uploads"]) {
  const response = await fetch(origin + path, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ action: "save" }),
  });
  assert.equal(response.status, 401, path);
  console.log("PASS anonymous blocked", path);
}
const forged = await fetch(origin + "/api/admin", {
  method: "POST",
  headers: {
    origin: "https://untrusted.invalid",
    "content-type": "application/json",
  },
  body: "{}",
});
assert.equal(forged.status, 403);
const privateFile = await fetch(
  origin + "/api/files/11111111-1111-4111-8111-111111111111",
);
assert.equal(privateFile.status, 503);
assert.ok(!privateFile.headers.get("location"));
console.log("PASS forged origin and unconfigured storage fail closed");
