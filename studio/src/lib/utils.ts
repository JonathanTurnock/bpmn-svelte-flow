import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** shadcn-svelte's class combiner. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// shadcn-svelte helper types, used by the generated ui/ components.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };

let counter = 0;

/** Short unique element id with a readable prefix. */
export function makeId(prefix: string, taken: (id: string) => boolean): string {
  for (;;) {
    counter += 1;
    const id = `${prefix}_${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    if (!taken(id)) return id;
  }
}

export function download(filename: string, text: string) {
  const blob = new Blob([text], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
