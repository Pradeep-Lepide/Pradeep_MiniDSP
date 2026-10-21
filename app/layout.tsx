import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";

import "./styles.css";

export const metadata: Metadata = {
  title: "MiniDSP",
  description: "Training-only data discovery and classification",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <link
          rel="stylesheet"
          href="https://lepide-design-system.vercel.app/v1/lepidus.css"
        />
      </head>
      <body>
        {children}
        <Script
          src="https://lepide-design-system.vercel.app/v1/lepidus.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
