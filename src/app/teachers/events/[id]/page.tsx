import { Detail } from "@/components/detail";
export const metadata = {
  title: "교사 일정",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Detail id={(await params).id} kind="event" base="/teachers" teacherEvent />
  );
}
