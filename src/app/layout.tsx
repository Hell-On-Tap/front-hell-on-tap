import type { Metadata } from "next";
import { Big_Shoulders, Chakra_Petch, Silkscreen } from "next/font/google";
import PixelBoot from "@/components/PixelBoot";
import ReportBugButton from "@/components/ReportBugButton";
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

// fonte pixel do nome H.O.T
const pixel = Silkscreen({
    variable: "--font-pixel",
    subsets: ["latin"],
    weight: "400",
});

export const metadata: Metadata = {
    title: "Hell on Tap",
    description: "FPS retrô no navegador: mira de Counter-Strike 1.6, cara de Doom. Crie uma sala e jogue com os amigos.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
    return (
        <html lang="pt-BR" className={`${display.variable} ${body.variable} ${pixel.variable}`}>
            <body>
                <PixelBoot />
                {children}
                <ReportBugButton />
            </body>
        </html>
    );
}
