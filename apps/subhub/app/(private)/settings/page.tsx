import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";

const SettingsPage = async () => {
  await requireAuth(routes.settings);

  return (
    <div style={{ padding: 24 }}>
      <h2>Settings</h2>
      <p>Placeholder route — shell layout verify gate.</p>
    </div>
  );
};

export default SettingsPage;
