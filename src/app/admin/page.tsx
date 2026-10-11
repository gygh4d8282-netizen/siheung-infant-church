import { admin, configured, db } from "@/lib/server";
import { settings, entryColumns, assetColumns } from "@/lib/data";
import { AdminLogin } from "@/components/admin-login";
import { AdminPanel } from "@/components/admin-panel";
import { PageTitle } from "@/components/ui";
import type { Entry } from "@/lib/types";
export const metadata = {
  title: "관리자 운영",
  robots: { index: false, follow: false },
};
export default async function Admin({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string; authError?: string }>;
}) {
  const query = await searchParams;
  const user = await admin();
  if (!user || query.reset)
    return (
      <div className="wrap page">
        <PageTitle
          eyebrow="FOR ADMINISTRATORS"
          title="관리자 운영 공간"
          description="관리 권한을 부여받은 교사의 개인 계정으로 로그인해 주세요."
        />
        {!configured() && (
          <div className="notice">
            연결 준비 중입니다. 운영 안내에 따라 Supabase와 서버 환경 변수를
            설정하면 관리자 기능을 사용할 수 있습니다.
          </div>
        )}
        <AdminLogin
          reset={!!user && !!query.reset}
          authError={!!query.authError}
        />
      </div>
    );
  const [info, { data: items, error }, { data: files, error: fileError }] =
    await Promise.all([
      settings(),
      db()
        .from("entries")
        .select(entryColumns)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false }),
      db().from("assets").select(assetColumns).order("position"),
    ]);
  if (error || fileError) throw new Error("관리 자료 조회 실패");
  return (
    <div className="wrap page admin-page">
      <AdminPanel
        settings={info.data}
        settingsVersion={info.version}
        entries={(items || []) as Entry[]}
        assets={files || []}
      />
    </div>
  );
}
