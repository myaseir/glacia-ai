import type { Metadata } from "next";
import { Montserrat, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({ 
  subsets: ["latin"], 
  variable: "--font-montserrat" 
});

const cormorant = Cormorant_Garamond({ 
  subsets: ["latin"], 
  variable: "--font-cormorant",
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic']
});

export const metadata: Metadata = {
  title: "Glacia AI | Voice Assistant Agent",
  description: "Next-generation voice interface by Glacia Labs. Experience seamless AI interaction with ultra-low latency.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body 
        className={`
          ${montserrat.variable} 
          ${cormorant.variable} 
          font-sans 
          bg-zinc-950 
          text-zinc-100 
          antialiased 
          flex 
          flex-col 
          min-h-screen
        `}
      >
        {/* You can add your Glacia Labs Navbar here later */}
        <main className="flex-grow">
          {children}
        </main>
        
        {/* Consider adding a minimalist footer for Glacia Labs */}
      </body>
    </html>
  );
}