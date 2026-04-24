import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prepare for Your Call | Insurance Pro Agencies",
  description: "Complete this quick form before your discovery call with Dave so we can prepare the best options for you.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        {children}
      </body>
    </html>
  );
}
