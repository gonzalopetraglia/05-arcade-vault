import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["192.168.0.13"],
  // Memoización automática de componentes (SPEC 13). Los memo y callbacks
  // estables a mano se mantienen: el Compiler se salta en silencio lo que no
  // puede compilar.
  reactCompiler: true,
};

export default nextConfig;
