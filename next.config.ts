import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // node-oracledb se carga tal cual en el servidor, sin empaquetarlo.
  serverExternalPackages: ["oracledb"],

  // El sitio de la marca (carpeta public/) pasa a ser el inicio.
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", destination: "/index.html" },
        { source: "/menu", destination: "/menu.html" },
        { source: "/lugar", destination: "/lugar.html" }
      ],
      afterFiles: [],
      fallback: []
    };
  },

  // La antigua portada de coworking ahora vive en la pestaña Coworking de "Lugar".
  async redirects() {
    return [{ source: "/coworking", destination: "/lugar.html#coworking", permanent: false }];
  }
};

export default nextConfig;
