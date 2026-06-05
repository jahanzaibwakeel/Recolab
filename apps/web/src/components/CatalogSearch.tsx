"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Filter, Search, SlidersHorizontal } from "lucide-react";
import type { CatalogItem, Domain } from "@recolab/shared";
import { RecoApi, type CatalogSearchResponse } from "../lib/api";

const domains: Array<"" | Domain> = ["", "movies", "courses", "jobs", "products"];
const sorts = [
  { value: "title", label: "Title" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "provider", label: "Provider" }
];

const emptyResponse: CatalogSearchResponse = {
  rows: [],
  total: 0,
  limit: 24,
  offset: 0,
  facets: { domains: [], genres: [], tags: [] }
};

function ItemCard({ item }: { item: CatalogItem }) {
  return (
    <article className="card catalog-card">
      <div className="card-head">
        <div>
          <Link href={`/items/${item.id}`}><h3>{item.title}</h3></Link>
          <p className="muted">{item.domain} - {item.provider}{item.releaseYear ? ` - ${item.releaseYear}` : ""}</p>
        </div>
      </div>
      <p className="muted">{item.description}</p>
      <div className="chips">
        {item.genres.slice(0, 4).map((genre) => <span className="chip" key={genre}>{genre}</span>)}
      </div>
      <div className="chips">
        {item.tags.slice(0, 5).map((tag) => <span className="chip" key={tag}>{tag}</span>)}
      </div>
    </article>
  );
}

export function CatalogSearch() {
  const [q, setQ] = useState("");
  const [domain, setDomain] = useState("");
  const [genre, setGenre] = useState("");
  const [tag, setTag] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [sort, setSort] = useState("title");
  const [data, setData] = useState<CatalogSearchResponse>(emptyResponse);
  const [status, setStatus] = useState("Loading catalog");

  const params = useMemo(() => ({
    q,
    domain,
    genre,
    tag,
    yearFrom,
    yearTo,
    sort,
    limit: 24
  }), [q, domain, genre, tag, yearFrom, yearTo, sort]);

  async function load(nextParams = params) {
    setStatus("Searching catalog");
    try {
      const response = await RecoApi.searchItems(nextParams);
      setData(response);
      setStatus(`${response.total} matching items`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Catalog search failed");
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => load().catch(() => undefined), 250);
    return () => window.clearTimeout(timeout);
  }, [params]);

  function applyFacet(key: "domain" | "genre" | "tag", value: string) {
    if (key === "domain") setDomain(value);
    if (key === "genre") setGenre(value);
    if (key === "tag") setTag(value);
  }

  function clearFilters() {
    setQ("");
    setDomain("");
    setGenre("");
    setTag("");
    setYearFrom("");
    setYearTo("");
    setSort("title");
  }

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Searchable catalog</p>
          <h2>Catalog Explorer</h2>
        </div>
        <button className="icon-button" title="Clear filters" onClick={clearFilters}><Filter size={16} /></button>
      </div>

      <section className="panel catalog-controls">
        <div className="toolbar">
          <label className="search-box">
            <Search size={17} />
            <input className="input" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search titles, providers, tags" />
          </label>
          <select className="select" value={domain} onChange={(event) => setDomain(event.target.value)}>
            {domains.map((option) => <option key={option || "all"} value={option}>{option || "All domains"}</option>)}
          </select>
          <input className="input" value={genre} onChange={(event) => setGenre(event.target.value)} placeholder="Genre" />
          <input className="input" value={tag} onChange={(event) => setTag(event.target.value)} placeholder="Tag" />
          <input className="input number-input" value={yearFrom} onChange={(event) => setYearFrom(event.target.value)} placeholder="From" />
          <input className="input number-input" value={yearTo} onChange={(event) => setYearTo(event.target.value)} placeholder="To" />
          <select className="select" value={sort} onChange={(event) => setSort(event.target.value)}>
            {sorts.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <div className="facet-row">
          <SlidersHorizontal size={16} />
          {data.facets.domains.slice(0, 4).map((facet) => (
            <button key={facet.value} className="chip chip-button" onClick={() => applyFacet("domain", facet.value)}>{facet.value} {facet.count}</button>
          ))}
          {data.facets.genres.slice(0, 6).map((facet) => (
            <button key={facet.value} className="chip chip-button" onClick={() => applyFacet("genre", facet.value)}>{facet.value} {facet.count}</button>
          ))}
          {data.facets.tags.slice(0, 6).map((facet) => (
            <button key={facet.value} className="chip chip-button" onClick={() => applyFacet("tag", facet.value)}>{facet.value} {facet.count}</button>
          ))}
        </div>
      </section>

      <p className="muted">{status}. Use this screen to inspect cold-start candidates, content features, and catalog coverage before feeding items into recommendations.</p>

      <section className="grid">
        {data.rows.map((item) => <ItemCard key={item.id} item={item} />)}
      </section>
    </>
  );
}
