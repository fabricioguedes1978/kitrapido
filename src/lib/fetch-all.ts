/**
 * Busca todas as linhas de uma consulta, superando o limite padrão de
 * 1000 registros por requisição do PostgREST, paginando com .range().
 */
const PAGE_SIZE = 1000;

interface RangeableQuery<T> {
  range(from: number, to: number): PromiseLike<{ data: T[] | null; error: { message: string } | null }>;
}

export async function fetchAllRows<T>(makeQuery: () => RangeableQuery<T>): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await makeQuery().range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  return all;
}
