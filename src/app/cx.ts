/** src/app/cx.ts: joins class names, skipping falsy ones (`cx('row', selected && 'selected')`). */
export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(' ');
}
