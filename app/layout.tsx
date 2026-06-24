import "./globals.css";
import "remixicon/fonts/remixicon.css";
import { Toaster } from "react-hot-toast";
import NextTopLoader from "nextjs-toploader";

export const metadata = {
  title: "PansaStore | Premium Digital Assets",
  description: "Platform pembelian aplikasi dan produk digital premium.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="bg-gray-50 font-sans antialiased text-slate-900">
        <NextTopLoader
          color="#059669"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
        />

        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              border: "1px solid #e2e8f0",
              padding: "16px",
              color: "#0f172a",
              borderRadius: "12px",
              background: "#ffffff",
              boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
              fontWeight: "500",
              fontSize: "14px",
            },
          }}
        />

        {children}
      </body>
    </html>
  );
}
