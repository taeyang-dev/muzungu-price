import type { NextConfig } from "next";

const additionalOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

const allowedDevOrigins = Array.from(
  new Set(["localhost", "127.0.0.1", "192.168.123.34", ...additionalOrigins])
);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins
};

export default nextConfig;
