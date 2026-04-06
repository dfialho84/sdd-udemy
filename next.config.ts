import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No Next.js 15+, o hook src/instrumentation.ts é ativado automaticamente
  // desde que a função 'register' seja exportada do arquivo.
  // Não é mais necessário experimental.instrumentationHook
};

export default nextConfig;
