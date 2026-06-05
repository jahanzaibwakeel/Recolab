import type { CatalogItem, Domain } from "@recolab/shared";
import { query } from "../db/pool.js";
import { mapItem } from "./repository.js";

export type CatalogSort = "title" | "newest" | "oldest" | "provider";

export interface CatalogSearchParams {
  q?: string;
  domain?: Domain;
  genre?: string;
  tag?: string;
  yearFrom?: number;
  yearTo?: number;
  sort?: CatalogSort;
  limit?: number;
  offset?: number;
}

export interface CatalogSearchResult {
  rows: CatalogItem[];
  total: number;
  limit: number;
  offset: number;
  facets: {
    domains: Array<{ value: string; count: number }>;
    genres: Array<{ value: string; count: number }>;
    tags: Array<{ value: string; count: number }>;
  };
}

const sortSql: Record<CatalogSort, string> = {
  title: "title ASC",
  newest: "release_year DESC NULLS LAST, title ASC",
  oldest: "release_year ASC NULLS LAST, title ASC",
  provider: "provider ASC, title ASC"
};
const domains = new Set(["movies", "courses", "jobs", "products"]);

function boundedNumber(value: number | undefined, fallback: number, min: number, max: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Number(value)));
}

export function parseCatalogSearchParams(queryParams: Record<string, unknown>): CatalogSearchParams {
  const sort = String(queryParams.sort ?? "title");
  return {
    q: typeof queryParams.q === "string" ? queryParams.q.trim() : undefined,
    domain: typeof queryParams.domain === "string" && domains.has(queryParams.domain) ? queryParams.domain as Domain : undefined,
    genre: typeof queryParams.genre === "string" ? queryParams.genre.trim() : undefined,
    tag: typeof queryParams.tag === "string" ? queryParams.tag.trim() : undefined,
    yearFrom: queryParams.yearFrom ? Number(queryParams.yearFrom) : undefined,
    yearTo: queryParams.yearTo ? Number(queryParams.yearTo) : undefined,
    sort: sort in sortSql ? sort as CatalogSort : "title",
    limit: boundedNumber(queryParams.limit ? Number(queryParams.limit) : undefined, 24, 1, 100),
    offset: boundedNumber(queryParams.offset ? Number(queryParams.offset) : undefined, 0, 0, 10000)
  };
}

export async function searchCatalog(params: CatalogSearchParams): Promise<CatalogSearchResult> {
  const values: unknown[] = [];
  const where: string[] = [];

  function bind(value: unknown) {
    values.push(value);
    return `$${values.length}`;
  }

  if (params.q) {
    const needle = `%${params.q}%`;
    const placeholder = bind(needle);
    where.push(`(
      title ILIKE ${placeholder}
      OR description ILIKE ${placeholder}
      OR provider ILIKE ${placeholder}
      OR array_to_string(genres, ' ') ILIKE ${placeholder}
      OR array_to_string(tags, ' ') ILIKE ${placeholder}
    )`);
  }
  if (params.domain) where.push(`domain = ${bind(params.domain)}`);
  if (params.genre) where.push(`genres && ARRAY[${bind(params.genre)}]::text[]`);
  if (params.tag) where.push(`tags && ARRAY[${bind(params.tag)}]::text[]`);
  if (Number.isFinite(params.yearFrom)) where.push(`release_year >= ${bind(params.yearFrom)}`);
  if (Number.isFinite(params.yearTo)) where.push(`release_year <= ${bind(params.yearTo)}`);

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const limit = boundedNumber(params.limit, 24, 1, 100);
  const offset = boundedNumber(params.offset, 0, 0, 10000);

  const [items, domains, genres, tags] = await Promise.all([
    query(
      `
        SELECT *, count(*) OVER() AS total_count
        FROM items
        ${whereSql}
        ORDER BY ${sortSql[params.sort ?? "title"]}
        LIMIT ${bind(limit)}
        OFFSET ${bind(offset)}
      `,
      values
    ),
    query<{ value: string; count: number }>("SELECT domain AS value, count(*)::int AS count FROM items GROUP BY domain ORDER BY count DESC, domain ASC"),
    query<{ value: string; count: number }>("SELECT genre AS value, count(*)::int AS count FROM items, unnest(genres) AS genre GROUP BY genre ORDER BY count DESC, genre ASC LIMIT 24"),
    query<{ value: string; count: number }>("SELECT tag AS value, count(*)::int AS count FROM items, unnest(tags) AS tag GROUP BY tag ORDER BY count DESC, tag ASC LIMIT 24")
  ]);

  return {
    rows: items.rows.map(mapItem),
    total: Number(items.rows[0]?.total_count ?? 0),
    limit,
    offset,
    facets: {
      domains: domains.rows,
      genres: genres.rows,
      tags: tags.rows
    }
  };
}
