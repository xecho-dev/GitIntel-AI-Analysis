import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // 允许未定义的 env 变量在客户端使用（必须有 NEXT_PUBLIC_ 前缀）
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },

  // Vercel 环境下使用 serverExternalPackages 优化冷启动
  serverExternalPackages: [],

  // 图片域名配置（如果后续接入 CDN/OSS）
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
