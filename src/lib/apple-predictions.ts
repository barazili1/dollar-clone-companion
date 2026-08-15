/* Apple of Fortune predictions (m1..m50 => 10 rows of 5 cells) */

const APPLE_BASE = 'https://arfoush1-default-rtdb.europe-west1.firebasedatabase.app/m11';

export const VIP_APPLE_CODE = '7arfoushx11';

export const ROWS = 10;
export const ROW_CELLS = 5;

/** Number of rotten apples per row (row 0 = m1..m5 = bottom row). */
export const ROW_ROTTEN = [1, 1, 1, 1, 2, 2, 2, 3, 3, 4];

/** values[row][cell] => "0" safe, "1" rotten */
export type AppleMatrix = string[][];

const key = (row: number, cell: number) => `m${row * ROW_CELLS + cell + 1}`;

function emptyMatrix(): AppleMatrix {
  return Array.from({ length: ROWS }, () => Array.from({ length: ROW_CELLS }, () => '0'));
}

export function randomMatrix(): AppleMatrix {
  const matrix = emptyMatrix();
  for (let row = 0; row < ROWS; row++) {
    const indexes = Array.from({ length: ROW_CELLS }, (_, i) => i);
    for (let i = indexes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indexes[i], indexes[j]] = [indexes[j]!, indexes[i]!];
    }
    for (const cell of indexes.slice(0, ROW_ROTTEN[row] ?? 1)) {
      matrix[row]![cell] = '1';
    }
  }
  return matrix;
}

export function isVipAppleCode(code: string | null | undefined) {
  return (code || '').trim().toLowerCase() === VIP_APPLE_CODE;
}

export async function fetchAppleMatrix(): Promise<AppleMatrix> {
  const res = await fetch(`${APPLE_BASE}.json`);
  if (!res.ok) throw new Error('Firebase read failed');
  const data = (await res.json()) as Record<string, Record<string, string>> | null;
  if (!data) throw new Error('Firebase empty');
  const matrix = emptyMatrix();
  for (let row = 0; row < ROWS; row++) {
    for (let cell = 0; cell < ROW_CELLS; cell++) {
      const k = key(row, cell);
      const value = data[k]?.[k];
      matrix[row]![cell] = String(value ?? '0') === '1' ? '1' : '0';
    }
  }
  return matrix;
}

export async function pushAppleMatrix(matrix: AppleMatrix): Promise<void> {
  const body: Record<string, Record<string, string>> = {};
  for (let row = 0; row < ROWS; row++) {
    for (let cell = 0; cell < ROW_CELLS; cell++) {
      const k = key(row, cell);
      body[k] = { [k]: matrix[row]![cell]! };
    }
  }
  const res = await fetch(`${APPLE_BASE}.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Firebase write failed');
}
