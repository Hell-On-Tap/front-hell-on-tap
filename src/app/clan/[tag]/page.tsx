import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ClanView, { ClanSkeleton, ClanUnavailable } from "@/components/clans/ClanView";
import SiteHeader from "@/components/SiteHeader";
import { fetchClan, type Clan } from "@/lib/clan-api";
import { imageUrl } from "@/lib/profile-api";

type Props = { params: Promise<{ tag: string }> };

// Página pública do clã: qualquer pessoa vê, com ou sem conta.

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params;
  const clan = await fetchClan(decodeURIComponent(tag)).catch(() => null);
  if (!clan) return { title: "Clã não encontrado | Hell on Tap" };
  const title = `[${clan.tag}] ${clan.name} | Hell on Tap`;
  const description = clan.description ?? `Clã ${clan.name} no Hell on Tap, com ${clan.memberCount} membros.`;
  const image = imageUrl(clan.logoUrl) ?? "/logo-pixel.png";
  return { title, description, openGraph: { title, description, images: [image] }, twitter: { card: "summary" } };
}

export default function ClanPage({ params }: Props) {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<ClanSkeleton />}>
        <ClanContent params={params} />
      </Suspense>
    </>
  );
}

async function ClanContent({ params }: Props) {
  const tag = decodeURIComponent((await params).tag);
  let clan: Clan | null;
  try {
    clan = await fetchClan(tag);
  } catch {
    return <ClanUnavailable />;
  }
  if (!clan) notFound();
  return <ClanView clan={clan} />;
}
