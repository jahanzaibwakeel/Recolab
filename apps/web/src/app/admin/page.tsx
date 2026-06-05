import { Nav } from "../../components/Nav";
import { AdminDashboard } from "../../components/AdminDashboard";
import { RecoApi } from "../../lib/api";

export default async function AdminPage() {
  const users = await RecoApi.users();
  return (
    <div className="shell">
      <Nav />
      <main className="main">
        <AdminDashboard users={users} />
      </main>
    </div>
  );
}

