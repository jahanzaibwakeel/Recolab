import { CatalogSearch } from "../../components/CatalogSearch";
import { Nav } from "../../components/Nav";

export default function CatalogPage() {
  return (
    <div className="shell">
      <Nav />
      <main className="main">
        <CatalogSearch />
      </main>
    </div>
  );
}
