/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["bcrypt", "@prisma/client", "bullmq"],
  },
};

export default nextConfig;
