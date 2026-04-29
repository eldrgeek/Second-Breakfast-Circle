export async function tryImport<T = any>(spec: string): Promise<T | null> {
  try {
    return (await import(/* @vite-ignore */ spec)) as T;
  } catch (e: any) {
    if (
      /Cannot find module|Failed to (resolve|load)|ENOENT/i.test(e?.message ?? '')
    ) {
      return null;
    }
    throw e;
  }
}
