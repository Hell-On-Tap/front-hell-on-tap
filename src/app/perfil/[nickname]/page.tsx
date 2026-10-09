import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import ProfileView, { ProfileSkeleton, ProfileUnavailable } from "@/components/profile/ProfileView";
import SiteHeader from "@/components/SiteHeader";
import { fetchProfile, imageUrl, type Profile } from "@/lib/profile-api";

type Props = { params: Promise<{ nickname: string }> };

// Perfil público: qualquer pessoa vê, com ou sem conta.

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { nickname } = await params;
  const profile = await fetchProfile(decodeURIComponent(nickname)).catch(() => null);
  if (!profile) return { title: "Perfil não encontrado | Hell on Tap" };

  const name = profile.displayName ?? profile.nickname;
  const title = `${name} (@${profile.nickname}) | Hell on Tap`;
  const description = profile.bio ?? `Perfil de ${name} no Hell on Tap.`;
  const image = imageUrl(profile.avatarUrl) ?? "/logo-pixel.png";
  // prévia bonita quando o link é colado no WhatsApp, Discord etc.
  return { title, description, openGraph: { title, description, images: [image] }, twitter: { card: "summary" } };
}

export default function ProfilePage({ params }: Props) {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileContent params={params} />
      </Suspense>
    </>
  );
}

async function ProfileContent({ params }: Props) {
  const nickname = decodeURIComponent((await params).nickname);
  let profile: Profile | null;
  try {
    profile = await fetchProfile(nickname);
  } catch {
    return <ProfileUnavailable />;
  }
  if (!profile) notFound();
  // /perfil/IGOR vira /perfil/Igor (endereço oficial, como a pessoa escreveu)
  if (profile.nickname !== nickname) redirect(`/perfil/${encodeURIComponent(profile.nickname)}`);
  return <ProfileView profile={profile} />;
}
