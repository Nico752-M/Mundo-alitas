import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // node-oracledb se carga tal cual en el servidor, sin empaquetarlo.
  serverExternalPackages: ["oracledb"]
};

export default nextConfig;
