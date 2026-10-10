// Pure layout of the pinned rows. No DOM, no Obsidian — tested in tests/layout.test.ts.
//
// The explorer gives us the chain of open ancestor folders that enclose the top of the list
// (outermost first). Each pinned row ("slot") shows one or more of those levels:
//   - up to maxRows levels: one row per level, exactly like VS Code's sticky scroll;
//   - more than maxRows: the extra levels share one row as a grey path.
//       'deep'  → outer levels keep their own rows, the deeper ones merge into the last row;
//       'outer' → outer levels merge into the first row, the nearest levels keep their own rows.

export type MergeMode = 'deep' | 'outer';

export interface Level {
	/** Bottom of the folder's subtree, in px from the top of the visible list. */
	bottom: number;
}

export interface Slot {
	/** Indices into the level chain, outermost first. */
	levels: number[];
	/** Top of the row in px from the top of the visible list (negative while pushed out). */
	top: number;
	merged: boolean;
}

/** Line (px from the top of the visible list) that decides whether level k gets pinned. */
export function probeLine(k: number, rowH: number, maxRows: number): number {
	return Math.min(k, Math.max(1, maxRows) - 1) * rowH;
}

/**
 * A row never sits lower than its slot, and is pushed up once its folder ends,
 * so the next sibling folder slides it out instead of overlapping it.
 */
function slotTop(slot: number, bottom: number, rowH: number): number {
	return Math.min(slot * rowH, bottom - rowH);
}

export function layoutStack(levels: Level[], rowH: number, maxRows: number, mode: MergeMode): Slot[] {
	const n = levels.length;
	const cap = Math.max(1, Math.floor(maxRows));
	if (n === 0) return [];
	if (n <= cap) {
		return levels.map((l, k) => ({ levels: [k], top: slotTop(k, l.bottom, rowH), merged: false }));
	}
	const range = (from: number, to: number) => Array.from({ length: to - from }, (_, i) => from + i);
	if (mode === 'outer') {
		const m = n - cap + 1; // levels 0..m-1 share the first row
		const slots: Slot[] = [{ levels: range(0, m), top: slotTop(0, levels[m - 1].bottom, rowH), merged: true }];
		for (let j = m; j < n; j++) {
			slots.push({ levels: [j], top: slotTop(j - m + 1, levels[j].bottom, rowH), merged: false });
		}
		return slots;
	}
	const slots: Slot[] = [];
	for (let k = 0; k < cap - 1; k++) {
		slots.push({ levels: [k], top: slotTop(k, levels[k].bottom, rowH), merged: false });
	}
	// The nearest folder ends first, so it decides when the merged row is pushed out.
	slots.push({ levels: range(cap - 1, n), top: slotTop(cap - 1, levels[n - 1].bottom, rowH), merged: true });
	return slots;
}

/**
 * After collapsing a folder at this depth, the row where it should sit so it stays
 * under the rows that will still be pinned above it (its ancestors).
 */
export function slotAfterCollapse(depth: number, maxRows: number): number {
	return Math.min(depth, Math.max(1, Math.floor(maxRows)));
}
