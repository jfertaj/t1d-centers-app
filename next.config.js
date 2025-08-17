// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',   // 👈 necesario para SSR en Amplify Hosting
  reactStrictMode: true,
};

module.exports = nextConfig;