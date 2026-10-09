import type { Metadata } from "next";
import NotFoundScene from "@/components/NotFoundScene";

export const metadata: Metadata = {
  title: "Fora do mapa | Hell on Tap",
};

export default function NotFound() {
  return <NotFoundScene />;
}
