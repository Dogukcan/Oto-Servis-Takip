import type { NextConfig } from "next";

const hamBasePath = process.env.TELEFON_BASE_PATH || "";
const basePath =
  hamBasePath.length > 1 && hamBasePath.endsWith("/")
    ? hamBasePath.slice(0, -1)
    : hamBasePath === "/"
      ? ""
      : hamBasePath;

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  ...(basePath ? { basePath } : {}),
  env: {
    TELEFON_BASE_PATH: basePath,
  },
};

export default nextConfig;
