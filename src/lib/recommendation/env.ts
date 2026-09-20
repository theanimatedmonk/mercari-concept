export function catalogEnv(name: string) {
  const runtime = globalThis as { process?: { env?: Record<string, string | undefined> } };
  return runtime.process?.env?.[name]?.trim() || '';
}

export function catalogFlag(name: string, defaultValue = true) {
  const raw = catalogEnv(name);
  if (!raw) return defaultValue;
  return !/^0|false|no|off$/i.test(raw);
}
