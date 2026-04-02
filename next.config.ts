import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Habilita o hook src/instrumentation.ts para inicialização do OpenTelemetry
    instrumentationHook: true,
  },
};

export default nextConfig;
