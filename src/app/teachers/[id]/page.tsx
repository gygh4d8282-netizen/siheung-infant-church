import { Detail } from "@/components/detail";
export const metadata = {
  title: "교사 자료",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <Detail id={(await params).id} kind="teachers" base="/teachers" />;
}
