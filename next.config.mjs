/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["maplibre-gl"],
  async redirects() {
    return [
      {
        source: "/graph",
        destination: "/",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
