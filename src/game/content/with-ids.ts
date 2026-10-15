// A table written without the id of each entry: the entry takes the key it sits under. Only to keep the first download smaller (the tables
// are in it); the result has the same entries, in the same order, as if every id had been written out.
export const withIds = <V extends { id: string }>(table: Record<string, Omit<V, 'id'>>): Record<string, V> =>
  Object.fromEntries(Object.entries(table).map(([id, entry]) => [id, { id, ...entry } as V]))
