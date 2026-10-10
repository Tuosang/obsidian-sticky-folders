import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutStack, probeLine, slotAfterCollapse } from '../src/layout.ts';

const H = 25;
// Five open levels whose subtrees all reach far below the viewport.
const deep5 = [9000, 8000, 7000, 6000, 5000].map(bottom => ({ bottom }));

test('within the cap every level gets its own row', () => {
	const slots = layoutStack(deep5.slice(0, 3), H, 4, 'deep');
	assert.deepEqual(slots.map(s => s.levels), [[0], [1], [2]]);
	assert.deepEqual(slots.map(s => s.top), [0, 25, 50]);
	assert.ok(slots.every(s => !s.merged));
});

test('deep mode keeps outer rows and merges the deeper levels into the last row', () => {
	const slots = layoutStack(deep5, H, 4, 'deep');
	assert.deepEqual(slots.map(s => s.levels), [[0], [1], [2], [3, 4]]);
	assert.deepEqual(slots.map(s => s.merged), [false, false, false, true]);
	assert.deepEqual(slots.map(s => s.top), [0, 25, 50, 75]);
});

test('outer mode merges the outer levels into the first row', () => {
	const slots = layoutStack(deep5, H, 4, 'outer');
	assert.deepEqual(slots.map(s => s.levels), [[0, 1], [2], [3], [4]]);
	assert.deepEqual(slots.map(s => s.merged), [true, false, false, false]);
	assert.deepEqual(slots.map(s => s.top), [0, 25, 50, 75]);
});

test('a cap of one row is a single merged row', () => {
	for (const mode of ['deep', 'outer'] as const) {
		const slots = layoutStack(deep5, H, 1, mode);
		assert.deepEqual(slots.map(s => s.levels), [[0, 1, 2, 3, 4]]);
		assert.equal(slots[0].top, 0);
	}
});

test('the row of a folder that is ending is pushed up by the next sibling', () => {
	// Nearest folder ends 90 px into the list: its row (slot 3, 75 px) must move up to 65 px.
	const levels = [9000, 8000, 7000, 90].map(bottom => ({ bottom }));
	assert.equal(layoutStack(levels, H, 4, 'deep')[3].top, 65);
	// Merged row follows the nearest folder too.
	const merged = [9000, 8000, 7000, 6000, 90].map(bottom => ({ bottom }));
	assert.equal(layoutStack(merged, H, 4, 'deep')[3].top, 65);
	// Outer mode: the merged first row is pushed by the deepest level it holds.
	const outer = [9000, 20, 20, 20, 20].map(bottom => ({ bottom }));
	assert.equal(layoutStack(outer, H, 4, 'outer')[0].top, -5);
});

test('levels that would merge are probed at the bottom of the pinned rows', () => {
	assert.deepEqual([0, 1, 2, 3, 4, 5].map(k => probeLine(k, H, 4)), [0, 25, 50, 75, 100, 100]);
	assert.deepEqual([0, 1, 2].map(k => probeLine(k, H, 1)), [0, 25, 25]);
});

test('a folder collapsed in place is not hidden behind the merged row of its previous sibling', () => {
	// Collapsing a level-4 folder (cap 4) puts its row at the stack bottom (slot 4, 100 px).
	// The previous sibling's subtree ends exactly there, so it must not be probed as pinned.
	const slot = slotAfterCollapse(4, 4);
	const previousSiblingBottom = slot * H;
	assert.equal(slot, 4);
	assert.ok(!(previousSiblingBottom > probeLine(4, H, 4)));
});

test('a collapsed folder lands under the rows that stay pinned', () => {
	assert.equal(slotAfterCollapse(2, 4), 2);
	assert.equal(slotAfterCollapse(4, 4), 4);
	assert.equal(slotAfterCollapse(7, 4), 4);
	assert.equal(slotAfterCollapse(0, 4), 0);
});

test('no levels, no rows', () => {
	assert.deepEqual(layoutStack([], H, 4, 'deep'), []);
});
