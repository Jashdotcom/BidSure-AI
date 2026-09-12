/** @type {import('next').NextConfig} */
const backendUrl =
  process.env.BACKEND_URL ||
  process.env.INTERNAL_API_URL ||
  (process.env.NODE_ENV === "production" ? "http://backend:8000" : "http://localhost:8001");

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
