import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** shadcn-svelte's class combiner. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
