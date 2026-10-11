import Link from "next/link";
import { canRead } from "@/lib/server";
import { entries } from "@/lib/data";
import { PageTitle, Empty } from "@/components/ui";
import { AccessGate, LockButton } from "@/components/access";
import { FilteredList } from "@/components/filtered-list";
import { dateLabel } from "@/lib/types";
export const metadata = {
  title: "교사 자료실",
  robots: { index: false, follow: false },
};
export default async function Teachers() {
  const access = await canRead("teachers");
  if (!access)
    return (
      <div className="wrap page">
        <PageTitle
          eyebrow="TEACHERS"
          title="교사 자료실"
          description="예배를 준비하는 선생님들을 위한 공간입니다."
        />
        <AccessGate space="teachers" />
      </div>
    );
  const [items, events] = await Promise.all([
    entries("teachers"),
    entries("event", true),
  ]);
  return (
    <div className="wrap page">
      <div className="section-heading">
        <PageTitle
          eyebrow="TEACHERS"
          title="교사 자료실"
          description="함께 준비하고, 함께 나누는 교육 자료와 일정"
        />
        <LockButton space="teachers" />
      </div>
      <h2>교육 자료</h2>
      <FilteredList items={items} kind="teachers" />
      <section className="section">
        <h2>교사 일정</h2>
        {events.length ? (
          <div className="entry-list">
            {events.map((e) => (
              <Link
                className="entry-row"
                key={e.id}
                href={"/teachers/events/" + e.id}
              >
                <h3>{e.title}</h3>
                <span>
                  {dateLabel(e.start_at, !e.all_day)} {e.all_day ? "종일" : ""}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <Empty text="아직 등록된 교사 일정이 없습니다." />
        )}
      </section>
    </div>
  );
}
