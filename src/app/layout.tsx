import type { Metadata } from "next";
import { Big_Shoulders, Chakra_Petch } from "next/font/google";
import "./globals.css";

const display = Big_Shoulders({
  variable: "--font-display",
  subsets: ["latin"],
});

const body = Chakra_Petch({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Hell on Tap",
  description:
    "FPS retrô no navegador: mira de Counter-Strike 1.6, cara de Doom. Crie uma sala e jogue com os amigos.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
