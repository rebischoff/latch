import { PageScroll } from "@/components/shell/PageScroll";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";

const SettingsPage = async () => {
  await requireAuth(routes.settings);

  return (
    <PageScroll>
      <h2>Settings</h2>
      <p>Placeholder route — shell layout verify gate.</p>
    </PageScroll>
  );
};

export default SettingsPage;
