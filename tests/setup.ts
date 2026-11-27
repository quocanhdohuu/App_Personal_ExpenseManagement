// Setup mock environment for Vitest
import 'fake-indexeddb/auto';

const storage: Record<string, string> = {};

if (typeof globalThis.localStorage === 'undefined' || !globalThis.localStorage.getItem) {
  globalThis.localStorage = {
    getItem: (key: string) => storage[key] ?? null,
    setItem: (key: string, val: string) => { storage[key] = String(val); },
    removeItem: (key: string) => { delete storage[key]; },
    clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
    key: (i: number) => Object.keys(storage)[i] ?? null,
    length: 0,
  } as Storage;
}

if (typeof globalThis.navigator === 'undefined') {
  (globalThis as any).navigator = { onLine: true };
}

if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = globalThis;
}

if (!globalThis.window.addEventListener) {
  globalThis.window.addEventListener = () => {};
  globalThis.window.removeEventListener = () => {};
}
