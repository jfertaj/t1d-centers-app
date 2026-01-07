// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',   // 👈 necesario para SSR en Amplify Hosting
  reactStrictMode: true,
  env: {
    // Pasar explícitamente la variable al runtime de Next.js
    ADMIN_TOKEN: process.env.ADMIN_TOKEN,
  },
};

module.exports = nextConfig;