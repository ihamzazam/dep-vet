import type { Metadata } from "next";
import Script from "next/script";
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
      <body>
        {children}
        <Script
          id="pendo-install"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(apiKey){(function(p,e,n,d,o){var v,w,x,y,z;o=p[d]=p[d]||{};o._q=o._q||[];v=['initialize','identify','updateOptions','pageLoad','track','trackAgent'];for(w=0,x=v.length;w<x;++w)(function(m){o[m]=o[m]||function(){o._q[m===v[0]?'unshift':'push']([m].concat([].slice.call(arguments,0)));};})(v[w]);y=e.createElement(n);y.async=!0;y.src='https://cdn.pendo.io/agent/static/'+apiKey+'/pendo.js';z=e.getElementsByTagName(n)[0];z.parentNode.insertBefore(y,z);})(window,document,'script','pendo');})('6888ce82-dbf6-4b0d-9867-6e0e955ae72b');`,
          }}
        />
      </body>
    </html>
  );
}
