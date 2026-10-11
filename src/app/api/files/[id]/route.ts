import { AppError, admin, db, fail, requireSpace } from "@/lib/server";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id))
      throw new AppError("파일을 찾을 수 없습니다.", 404);
    const client = db();
    const { data: file, error } = await client
      .from("assets")
      .select("*,entries!inner(status,audience,deleted_at)")
      .eq("id", id)
      .maybeSingle();
    if (error || !file || file.entries.deleted_at)
      throw new AppError("파일을 찾을 수 없습니다.", 404);
    if (!(await admin())) {
      if (file.entries.status !== "published")
        throw new AppError("파일을 찾을 수 없습니다.", 404);
      if (file.entries.audience !== "public")
        await requireSpace(file.entries.audience);
    }
    const url = new URL(request.url);
    const path =
      url.searchParams.has("thumb") && file.thumb_path
        ? file.thumb_path
        : file.path;
    const { data, error: signError } = await client.storage
      .from(file.bucket)
      .createSignedUrl(path, 60, {
        download: url.searchParams.has("download") ? file.name : undefined,
      });
    if (signError || !data)
      throw new AppError("파일을 열지 못했습니다. 다시 시도해 주세요.", 503);
    return Response.redirect(data.signedUrl, 307);
  } catch (e) {
    return fail(e);
  }
}
