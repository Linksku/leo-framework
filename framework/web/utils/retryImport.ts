export default async function retryImport<T>(
  importer: () => Promise<T>,
  // 4 means total wait is at least 15 seconds
  retries = 4,
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await importer();
    } catch {}

    // eslint-disable-next-line no-await-in-loop
    await pause(1000 * (2 ** i));
  }

  return importer();
}
