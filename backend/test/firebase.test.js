import { describe, it, expect } from 'vitest';
import { wrapCollection } from '../src/lib/firebase.js';

describe('collection compatibility', () => {
  it('adds list() for collections that do not natively implement it', async () => {
    const collection = {
      id: 'events',
      async get() {
        return {
          docs: [
            { id: 'a', data: () => ({ ok: true }) },
            { id: 'b', data: () => ({ ok: false }) },
          ],
        };
      },
    };

    const wrapped = wrapCollection(collection);

    expect(typeof wrapped.list).toBe('function');
    await expect(wrapped.list()).resolves.toEqual([
      { id: 'a', ok: true },
      { id: 'b', ok: false },
    ]);
  });
});
