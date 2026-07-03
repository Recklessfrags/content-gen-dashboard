import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./aurora.css";

export const metadata: Metadata = {
  title: "Control Room",
  description: "Run a multi-character faceless-video operation.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#05050A" },
    { media: "(prefers-color-scheme: light)", color: "#F8F9FA" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const themeScript = `try{var t=localStorage.getItem("aurora-theme");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t;}}catch(e){}`;

  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
