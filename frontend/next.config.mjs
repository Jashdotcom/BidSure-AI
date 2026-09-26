/** @type {import('next').NextConfig} */
const backendUrl =
  process.env.BACKEND_URL ||
  process.env.INTERNAL_API_URL ||
  (process.env.NODE_ENV === "production" ? "http://backend:8000" : "http://127.0.0.1:8000");

const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/dashboard/tenders",
        destination: "/tenders",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/auth/:path*",
        destination: `${backendUrl}/auth/:path*`,
      },
      {
        source: "/bidder-portal/:path*",
        destination: `${backendUrl}/bidder-portal/:path*`,
      },
      {
        source: "/bidders/:path*",
        destination: `${backendUrl}/bidders/:path*`,
      },
      {
        source: "/tenders/:path*",
        destination: `${backendUrl}/tenders/:path*`,
      },
      {
        source: "/compliance/:path*",
        destination: `${backendUrl}/compliance/:path*`,
      },
      {
        source: "/reports/:path*",
        destination: `${backendUrl}/reports/:path*`,
      },
      {
        source: "/audit/:path*",
        destination: `${backendUrl}/audit/:path*`,
      },
      {
        source: "/dashboard-api/:path*",
        destination: `${backendUrl}/dashboard/:path*`,
      },
    ];
  },
};

export default nextConfig;
