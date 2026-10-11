import { entries } from "@/lib/data";
import { PageTitle } from "@/components/ui";
import { FilteredList } from "@/components/filtered-list";
export const metadata = { title: "가정 신앙 활동" };
export default async function Family() {
  return (
    <div className="wrap page">
      <PageTitle
        eyebrow="TOGETHER AT HOME"
        title="집에서도, 함께 자라요"
        description="부모님과 아이가 함께하는 말씀, 찬양, 활동지를 만나보세요."
      />
      <FilteredList items={await entries("family")} kind="family" />
    </div>
  );
}
