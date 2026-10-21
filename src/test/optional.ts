// Helper: load a module that may not exist yet. If missing, return null
// so the test can `it.skip` itself with a clear message rather than blowing
// up the whole suite.
export async function tryImport<T = any>(spec: string): Promise<T | null> {
  try {
    return (await import(/* @vite-ignore */ spec)) as T;
  } catch (e: any) {
    if (
      /Cannot find module|Failed to (resolve|load)|ENOENT/i.test(
        e?.message ?? ''
      )
    ) {
      return null;
    }
    throw e;
  }
}
