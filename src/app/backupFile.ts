/**
 * src/app/backupFile.ts: saves every task as a backup file (the phone's
 * format, which Import reads), and records when (V1 pass 2026-10-17: the
 * backup reminder counts from it).
 *
 * Layer: UI (a browser download). Used by Settings' EXPORT BACKUP and the
 * reminder toast's BACK UP.
 */
import { backupFileName, makeBackup } from '@/lib/backup';
import type { AppStore } from '@/store/createStore';

declare const __APP_VERSION__: string;
declare const __APP_BUILD__: number;

/** Downloads a backup of the store's tasks, records it, and says so. */
export function downloadBackup(actions: AppStore): void {
  const now = Date.now();
  const json = JSON.stringify(makeBackup(actions.exportDocument(), now, { version: __APP_VERSION__, build: __APP_BUILD__ }));
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = backupFileName(now);
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  actions.markBackedUp(now);
  actions.showToast('BACKUP SAVED', false);
}
