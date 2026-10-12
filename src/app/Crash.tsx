/**
 * src/app/Crash.tsx: what shows if the app fails, instead of a black page
 * (2026-10-12: 0.1.0 opened to a black screen after a reopen, from a render
 * loop; see store/selectors.ts NO_COUNTS).
 *
 *   > SOMETHING WENT WRONG.
 *   Your tasks are safe in this browser. …
 *   [ RELOAD ]  [ DOWNLOAD BACKUP ]
 *   the error, to send me
 *
 * Layer: UI. `CrashBoundary` catches a failure while rendering the app;
 * `CrashScreen` is also shown when the store itself can't start
 * (src/main.tsx). DOWNLOAD BACKUP saves the tasks the store holds (the
 * Settings backup format, which Import reads), when there is a store.
 */
import { Component, type ReactNode } from 'react';

import { backupFileName, makeBackup } from '@/lib/backup';
import type { StoreBundle } from '@/store/react';
import { Prompted } from './Prompted';

// Set by vite.config.ts (package.json's version, CHANGELOG.md's build).
declare const __APP_VERSION__: string;
declare const __APP_BUILD__: number;

/** The failure screen: the error, RELOAD, and DOWNLOAD BACKUP when the tasks are at hand. */
export function CrashScreen({ error, bundle }: { error: unknown; bundle?: StoreBundle }) {
  const text = error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error);
  const download = () => {
    const now = Date.now();
    const doc = bundle!.store.getState().exportDocument();
    const json = JSON.stringify(makeBackup(doc, now, { version: __APP_VERSION__, build: __APP_BUILD__ }));
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFileName(now);
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <main className="crash" role="alert">
      <h1 className="view-title"><Prompted>SOMETHING WENT WRONG.</Prompted></h1>
      <p>Your tasks are safe in this browser. Reloading usually fixes it; if it doesn’t, download a backup and send me the error below.</p>
      <div className="detail-actions">
        <button type="button" className="text-btn primary" onClick={() => location.reload()}>
          ↻ RELOAD
        </button>
        {bundle && (
          <button type="button" className="text-btn" onClick={download}>
            ⎕ DOWNLOAD BACKUP
          </button>
        )}
      </div>
      <pre className="crash-error">
        quest_log desktop {__APP_VERSION__} (build {__APP_BUILD__}){'\n'}
        {text}
      </pre>
    </main>
  );
}

/** Catches a failure anywhere in the app's render and shows CrashScreen instead. */
export class CrashBoundary extends Component<{ bundle: StoreBundle; children: ReactNode }, { error: unknown }> {
  override state: { error: unknown } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  override render() {
    return this.state.error !== null ? <CrashScreen error={this.state.error} bundle={this.props.bundle} /> : this.props.children;
  }
}
