import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "agent-home",
  description: "Private, auditable task home for one agent.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
