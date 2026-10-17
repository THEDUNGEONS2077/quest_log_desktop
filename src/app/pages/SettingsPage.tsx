/**
 * src/app/pages/SettingsPage.tsx: settings, and your data (backup, import,
 * daily snapshots).
 *
 * Layer: UI. Settings save as they change. Data:
 *   - EXPORT BACKUP downloads every task as a file (the phone's backup
 *     format: it can be imported on the phone, and the phone's on here);
 *   - IMPORT BACKUP reads a file, shows what's in it, then MERGE (adds only
 *     what isn't here) or REPLACE (swaps everything). Both can be undone;
 *   - the daily snapshots (the last 3 days) can each be restored.
 * Nothing is uploaded: files go between this browser and your disk.
 */
import { type ChangeEvent, useRef, useState } from 'react';

import { backupFileName, countDocument, type DocCounts, makeBackup } from '@/lib/backup';
import { formatMinutes } from '@/lib/dates';
import type { TasksDocument } from '@/lib/types';
import { BackupError, parseBackup } from '@/store/backup';
import { useActions, useAppStore } from '@/store/react';
import { TEXT_SIZES, type TextSize } from '@/store/settings';

import { cx } from '../cx';
import { useOpenDialog } from '../menu';
import { Page } from './Page';

declare const __APP_VERSION__: string;
declare const __APP_BUILD__: number;

function countsLabel(c: DocCounts): string {
  return [`${c.active} active`, `${c.completed} completed`, ...(c.trash ? [`${c.trash} in trash`] : [])].join(' · ');
}

export function SettingsPage() {
  const settings = useAppStore((s) => s.settings);
  const actions = useActions();
  const openDialog = useOpenDialog();
  const file = useRef<HTMLInputElement>(null);
  const [incoming, setIncoming] = useState<{ doc: TasksDocument; label: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exportBackup = () => {
    const now = Date.now();
    const json = JSON.stringify(makeBackup(actions.exportDocument(), now, { version: __APP_VERSION__, build: __APP_BUILD__ }));
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFileName(now);
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    actions.showToast('BACKUP SAVED', false);
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setError(null);
    try {
      const { doc, exportedAt } = parseBackup(await f.text());
      const when = exportedAt ? new Date(exportedAt).toLocaleString() : 'an unknown date';
      setIncoming({ doc, label: `From ${when}: ${countsLabel(countDocument(doc))}` });
    } catch (err) {
      setError(err instanceof BackupError ? err.message : "That file isn't a quest_log backup.");
    }
  };

  const snapshots = actions.listSnapshots();

  return (
    <Page title="SETTINGS">
      <section className="settings-group">
        <h2 className="section-title">BEHAVIOUR</h2>
        <label className="setting">
          <span>Default time for dates without one (@fri)</span>
          <input
            type="time"
            value={formatMinutes(settings.defaultTimeMinutes)}
            onChange={(e) => {
              const [h, m] = e.target.value.split(':').map(Number);
              if (h !== undefined && m !== undefined) actions.updateSettings({ defaultTimeMinutes: h * 60 + m });
            }}
          />
        </label>
        <label className="setting">
          <span>Move completed tasks to Trash after</span>
          <select value={String(settings.autoClearCompleted)} onChange={(e) => actions.updateSettings({ autoClearCompleted: e.target.value === 'off' ? 'off' : (Number(e.target.value) as 30 | 90) })}>
            <option value="off">never</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
          </select>
        </label>
        <label className="setting">
          <span>Text size</span>
          <select value={String(settings.textSize)} onChange={(e) => actions.updateSettings({ textSize: Number(e.target.value) as TextSize })}>
            {TEXT_SIZES.map((size) => (
              <option key={size} value={size}>
                {size === 100 ? '100% (standard)' : `${size}%`}
              </option>
            ))}
          </select>
        </label>
        <label className="setting">
          <span>Reduce motion</span>
          <select value={settings.reduceMotion} onChange={(e) => actions.updateSettings({ reduceMotion: e.target.value as 'system' | 'on' | 'off' })}>
            <option value="system">follow the system</option>
            <option value="on">on</option>
            <option value="off">off</option>
          </select>
        </label>
      </section>

      <section className="settings-group">
        <h2 className="section-title">YOUR DATA</h2>
        <p className="dim">Your tasks live only in this browser. Back them up to a file now and then; the file also moves tasks to and from the phone app.</p>
        <div className="button-row">
          <button type="button" className="text-btn primary" onClick={exportBackup}>
            ↧ EXPORT BACKUP
          </button>
          <button type="button" className="text-btn" onClick={() => file.current?.click()}>
            ↥ IMPORT BACKUP…
          </button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => void onFile(e)} />
        </div>
        {error && <p className="overdue">{error}</p>}
        {incoming && (
          <div className="import-preview">
            <p>{incoming.label}</p>
            <div className="button-row">
              <button
                type="button"
                className="text-btn primary"
                onClick={() => {
                  actions.importTasks(incoming.doc, 'merge');
                  setIncoming(null);
                }}
              >
                MERGE (add what's new)
              </button>
              <button
                type="button"
                className="text-btn danger"
                onClick={() =>
                  openDialog({
                    title: 'Replace everything',
                    message: "Every task here is replaced by the backup's. You can undo this.",
                    ok: 'REPLACE',
                    onOk: () => {
                      actions.importTasks(incoming.doc, 'replace');
                      setIncoming(null);
                    },
                  })
                }
              >
                REPLACE
              </button>
              <button type="button" className="text-btn" onClick={() => setIncoming(null)}>
                CANCEL
              </button>
            </div>
          </div>
        )}
        <h3 className="section-title">DAILY SNAPSHOTS</h3>
        {snapshots.length === 0 ? (
          <p className="dim">None yet: one is kept each day you use the app (the last 3).</p>
        ) : (
          snapshots.map((s) => (
            <div key={s.key} className={cx('setting')}>
              <span>
                {s.date} · {countsLabel(s.counts)}
              </span>
              <button
                type="button"
                className="text-btn"
                onClick={() => openDialog({ title: `Restore ${s.date}`, message: 'Every task is replaced by that day\'s copy. You can undo this.', ok: 'RESTORE', onOk: () => actions.restoreSnapshot(s.key) })}
              >
                RESTORE
              </button>
            </div>
          ))
        )}
      </section>

      <p className="dim small">
        quest_log desktop v{__APP_VERSION__} (build {__APP_BUILD__}) · offline · no analytics · nothing leaves this browser
      </p>
    </Page>
  );
}
