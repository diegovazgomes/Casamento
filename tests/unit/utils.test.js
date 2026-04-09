import { describe, expect, it } from 'vitest';
import { cloneDeep, mergeDeep } from '../../assets/js/utils.js';

describe('utils', () => {
  it('mergeDeep merges nested objects', () => {
    const base = { a: 1, nested: { x: 1, y: 2 } };
    const override = { nested: { y: 3, z: 4 } };

    const merged = mergeDeep(base, override);

    expect(merged).toEqual({ a: 1, nested: { x: 1, y: 3, z: 4 } });
    expect(base.nested.y).toBe(2);
  });

  it('mergeDeep replaces arrays by override clone', () => {
    const merged = mergeDeep({ list: [1, 2] }, { list: [3] });
    expect(merged).toEqual({ list: [3] });
  });

  it('cloneDeep returns independent copy', () => {
    const original = { a: { b: 2 }, c: [1, 2] };
    const cloned = cloneDeep(original);
    cloned.a.b = 9;
    cloned.c.push(3);

    expect(original).toEqual({ a: { b: 2 }, c: [1, 2] });
  });
});