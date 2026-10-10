import type { Metadata } from "next";
import ClansHub from "@/components/clans/ClansHub";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Clãs | Hell on Tap",
  description: "Encontre um clã, crie o seu e jogue em time no Hell on Tap.",
};

export default function ClansPage() {
  return (
    <>
      <SiteHeader />
      <ClansHub />
    </>
  );
}
