import { entries } from "@/lib/data";
import { PageTitle } from "@/components/ui";
import { Calendar } from "@/components/calendar";
export const metadata = { title: "일정" };
export default async function CalendarPage() {
  return (
    <div className="wrap page">
      <PageTitle
        eyebrow="OUR CALENDAR"
        title="함께하는 날들"
        description="예배와 행사 일정을 확인해 주세요."
      />
      <Calendar items={await entries("event")} />
    </div>
  );
}
