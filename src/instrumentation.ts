/**
 * Next.js Instrumentation Hook (experimental.instrumentationHook: true)
 * Referência: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * O guard NEXT_RUNTIME === 'nodejs' garante que o SDK OpenTelemetry só seja
 * inicializado no runtime Node.js — nunca no Edge Runtime ou no cliente.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerOtel } = await import(
      "./lib/observability/register"
    );
    registerOtel();
  }
}
