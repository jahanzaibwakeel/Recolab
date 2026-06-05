import { Nav } from "../../components/Nav";
import { ProfileEditor } from "../../components/ProfileEditor";
import { PrivacyControls } from "../../components/PrivacyControls";
import { RecoApi } from "../../lib/api";

export default async function ProfilePage() {
  const users = await RecoApi.users();
  return (
    <div className="shell">
      <Nav />
      <main className="main">
        <ProfileEditor users={users} />
        <PrivacyControls users={users} />
      </main>
    </div>
  );
}
