/** Reads an index the caller already keeps in range, for code under `noUncheckedIndexedAccess`. */
export const at = <T>(list: readonly T[], i: number) => list[i] as T;
