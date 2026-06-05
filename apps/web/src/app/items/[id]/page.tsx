import { Nav } from "../../../components/Nav";
import { RecoApi } from "../../../lib/api";

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item, similar] = await Promise.all([RecoApi.item(id), RecoApi.similar(id)]);
  return (
    <div className="shell">
      <Nav />
      <main className="main">
        <div className="topbar">
          <div>
            <p className="eyebrow">Item detail</p>
            <h2>{item.title}</h2>
          </div>
          <span className="score">{item.releaseYear ?? "Catalog"}</span>
        </div>
        <section className="panel">
          <p className="muted">{item.description}</p>
          <div className="chips">
            {[...item.genres, ...item.tags].map((value) => <span className="chip" key={value}>{value}</span>)}
          </div>
        </section>

        <section className="grid">
          {similar.map((row) => (
            <article className="card" key={row.item.id}>
              <div className="card-head">
                <h3>{row.item.title}</h3>
                <span className="score">{row.similarity}</span>
              </div>
              <p className="muted">{row.item.description}</p>
              <div className="explanation">
                <strong>Similar because</strong>
                <p className="muted">{row.matchedAttributes.length ? row.matchedAttributes.join(", ") : "metadata and catalog proximity"}</p>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}

