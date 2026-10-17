/**
 * src/app/pages/TrashPage.tsx: deleted tasks, kept 7 days (the phone's Trash).
 *
 * Layer: UI. Each deleted task (with what was inside it) can be restored to
 * where it was, or deleted for good; EMPTY TRASH deletes them all. Deleting
 * for good asks first: it's the one thing UNDO can't bring back after the
 * app restarts.
 */
import { trashed } from '@/lib/bulk';
import { TRASH_DAYS } from '@/lib/purge';
import { subtreeIds } from '@/lib/tree';
import { useActions, useAppStore } from '@/store/react';

import { ago } from '../ago';
import { G } from '../glyphs';
import { useOpenDialog } from '../menu';
import { useMinute } from '../useMinute';
import { Page } from './Page';
import { Prompted } from '../Prompted';

const DAY = 86_400_000;

export function TrashPage() {
  const tasks = useAppStore((s) => s.tasks);
  const actions = useActions();
  const openDialog = useOpenDialog();
  const now = useMinute();
  const items = trashed(tasks);
  return (
    <Page title="TRASH">
      <p className="dim">Deleted tasks are kept for {TRASH_DAYS} days, then removed for good.</p>
      {items.length === 0 ? (
        <p className="empty"><Prompted>TRASH IS EMPTY.</Prompted></p>
      ) : (
        <>
          <div className="list">
            {items.map((t) => {
              const inside = subtreeIds(tasks, t.id).length - 1;
              const left = Math.max(0, Math.ceil((t.deletedAt! + TRASH_DAYS * DAY - now) / DAY));
              return (
                <div key={t.id} className="row trash-row">
                  <div className="title-col">
                    <span className="title">{t.title || 'Untitled'}</span>
                    <div className="meta">
                      {inside > 0 && <span>+{inside} inside</span>}
                      <span>
                        deleted {ago(t.deletedAt!, now)} · {left} {left === 1 ? 'day' : 'days'} left
                      </span>
                    </div>
                  </div>
                  <button type="button" className="text-btn" onClick={() => actions.restoreFromTrash(t.id)}>
                    RESTORE
                  </button>
                  <button
                    type="button"
                    className="text-btn danger"
                    onClick={() =>
                      openDialog({ title: 'Delete for good', message: `"${t.title || 'Untitled'}" can't be brought back after this.`, ok: 'DELETE', danger: true, onOk: () => actions.purgeFromTrash([t.id]) })
                    }
                  >
                    DELETE
                  </button>
                </div>
              );
            })}
          </div>
          <div className="trash-actions">
            <button
              type="button"
              className="text-btn danger"
              onClick={() =>
                openDialog({ title: 'Empty Trash', message: `All ${items.length} tasks in Trash are deleted for good.`, ok: 'EMPTY', danger: true, onOk: () => actions.purgeFromTrash(items.map((t) => t.id)) })
              }
            >
              {G.delete} EMPTY TRASH
            </button>
          </div>
        </>
      )}
    </Page>
  );
}
