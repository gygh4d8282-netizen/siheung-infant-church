import { entries } from "@/lib/data";
import { EntryList, PageTitle } from "@/components/ui";
export const metadata = { title: "부서 소식" };
export default async function News() {
  const items = await entries("news");
  items.sort((a, b) => Number(b.important) - Number(a.important));
  return (
    <div className="wrap page">
      <PageTitle
        eyebrow="OUR NEWS"
        title="우리 부서 이야기"
        description="영유아교회의 공지와 새로운 소식을 전합니다."
      />
      <EntryList items={items} base="/news" />
    </div>
  );
}
