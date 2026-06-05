import { BarChart3, Boxes, Clock, Home, Search, Settings, UserRound } from "lucide-react";
import Link from "next/link";

export function Nav() {
  return (
    <aside className="nav">
      <div>
        <span className="brand-label">RecoLab</span>
        <h1>AI Recommendation Engine</h1>
      </div>
      <nav className="nav-links">
        <Link href="/"><Home size={17} /> Feed</Link>
        <Link href="/catalog"><Search size={17} /> Catalog</Link>
        <Link href="/profile"><UserRound size={17} /> Profile</Link>
        <Link href="/history"><Clock size={17} /> History</Link>
        <Link href="/admin"><BarChart3 size={17} /> Admin</Link>
        <Link href="/items/aaaaaaaa-0001-4000-8000-000000000001"><Boxes size={17} /> Item Detail</Link>
        <Link href="/admin"><Settings size={17} /> Experiments</Link>
      </nav>
    </aside>
  );
}
