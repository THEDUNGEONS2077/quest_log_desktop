/**
 * src/__tests__/setup.ts: Vitest setup, run before every test file.
 *
 * The lib tests were written for Jest in the phone app (copied as-is), so
 * Jest's global is mapped to Vitest's equivalent. The time zone is fixed by
 * the test script (TZ=Europe/London), as the phone's Jest setup did.
 */
import { vi } from 'vitest';

(globalThis as unknown as { jest: typeof vi }).jest = vi;
