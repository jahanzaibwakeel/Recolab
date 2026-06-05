import { Nav } from "../components/Nav";
import { DemoGuide } from "../components/DemoGuide";
import { RecommendationFeed } from "../components/RecommendationFeed";
import { RecoApi } from "../lib/api";

export default async function HomePage() {
  const users = await RecoApi.users();
  return (
    <div className="shell">
      <Nav />
      <main className="main">
        <DemoGuide />
        <RecommendationFeed initialUsers={users} />
      </main>
    </div>
  );
}
