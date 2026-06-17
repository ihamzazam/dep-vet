import type { Metadata } from "next";
import { Archivo, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

const grotesk = Space_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DepVet — audit your dependencies before you install",
  description:
    "Paste your package.json and instantly see which dependencies are dangerous. Live CVE data plus abandonment, typosquat, and install-script checks — one verdict, a prioritized fix list. No signup.",
  applicationName: "DepVet",
  keywords: [
    "dependency security",
    "package.json audit",
    "supply chain",
    "typosquat",
    "CVE",
    "npm",
  ],
  openGraph: {
    title: "DepVet — supply-chain scanner",
    description:
      "Audit your package.json before you install. CVEs, abandonment, typosquats, and malicious install-scripts in one verdict.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${jetbrains.variable} ${grotesk.variable} antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
