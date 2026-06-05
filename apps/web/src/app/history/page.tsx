import { Nav } from "../../components/Nav";
import { UserHistoryView } from "../../components/UserHistoryView";
import { RecoApi } from "../../lib/api";

export default async function HistoryPage() {
  const users = await RecoApi.users();
  return (
    <div className="shell">
      <Nav />
      <main className="main">
        <UserHistoryView users={users} />
      </main>
    </div>
  );
}

