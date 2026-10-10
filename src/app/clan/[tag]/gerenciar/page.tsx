import type { Metadata } from "next";
import { Suspense } from "react";
import ClanManage from "@/components/clans/ClanManage";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = { title: "Gerenciar clã | Hell on Tap", robots: { index: false } };

type Props = { params: Promise<{ tag: string }> };

export default function ManageClanPage({ params }: Props) {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={null}>
        <ManageContent params={params} />
      </Suspense>
    </>
  );
}

async function ManageContent({ params }: Props) {
  const { tag } = await params;
  return <ClanManage tag={decodeURIComponent(tag)} />;
}
