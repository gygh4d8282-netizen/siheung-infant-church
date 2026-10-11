import {
  randomBytes,
  scrypt as rawScrypt,
  timingSafeEqual,
  createHmac,
} from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(rawScrypt);
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash || hash.length !== 128) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  return timingSafeEqual(actual, Buffer.from(hash, "hex"));
}
export function signSession(
  space: string,
  version: number,
  secret: string,
  now = Date.now(),
) {
  const body = Buffer.from(
    JSON.stringify({ space, version, expires: now + 12 * 60 * 60 * 1000 }),
  ).toString("base64url");
  return (
    body + "." + createHmac("sha256", secret).update(body).digest("base64url")
  );
}
export function verifySession(
  token: string,
  space: string,
  version: number,
  secret: string,
  now = Date.now(),
) {
  try {
    const [body, signature, ...rest] = token.split(".");
    if (rest.length || !signature) return false;
    const expected = createHmac("sha256", secret).update(body).digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      return false;
    const data = JSON.parse(Buffer.from(body, "base64url").toString());
    return (
      data.space === space &&
      data.version === version &&
      Number.isFinite(data.expires) &&
      data.expires > now
    );
  } catch {
    return false;
  }
}
