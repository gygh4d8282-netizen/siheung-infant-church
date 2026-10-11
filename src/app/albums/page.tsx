import Link from "next/link";
import { canRead } from "@/lib/server";
import { entries, assets } from "@/lib/data";
import { dateLabel } from "@/lib/types";
import { PageTitle, Empty } from "@/components/ui";
import { AccessGate, LockButton } from "@/components/access";
export const metadata = {
  title: "비공개 사진첩",
  robots: { index: false, follow: false },
};
export default async function Albums() {
  const access = await canRead("albums");
  const items = access ? await entries("album") : [];
  const albums = await Promise.all(
    items.map(async (item) => ({ item, photos: await assets(item) })),
  );
  return (
    <div className="wrap page">
      <div className="section-heading">
        <PageTitle
          eyebrow="OUR LITTLE MOMENTS"
          title="소중한 순간, 함께 나눠요"
          description="활동 작품과 교구, 함께한 공간의 모습을 담는 비공개 사진첩입니다."
        />
        {access && <LockButton space="albums" />}
      </div>
      {!access ? (
        <AccessGate space="albums" />
      ) : albums.length ? (
        <div className="album-grid">
          {albums.map(({ item, photos }) => {
            const cover =
              photos.find((p) => p.id === item.cover_id) || photos[0];
            return (
              <Link
                className="album-card"
                key={item.id}
                href={"/albums/" + item.id}
              >
                {cover && (
                  <img
                    src={"/api/files/" + cover.id + "?thumb=1"}
                    alt={cover.alt}
                  />
                )}
                <div>
                  <small>
                    {dateLabel(item.activity_date)} · 사진 {photos.length}장
                  </small>
                  <h2>{item.title}</h2>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <Empty text="아직 등록된 앨범이 없습니다." />
      )}
    </div>
  );
}
