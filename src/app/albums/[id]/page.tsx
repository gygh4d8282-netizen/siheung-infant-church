import { Detail } from "@/components/detail";
export const metadata = {
  title: "비공개 앨범",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <Detail id={(await params).id} kind="album" base="/albums" />;
}
