import { SelectFromListPlaceholder } from "@/components/shell/SelectFromListPlaceholder";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";

const JobsPage = async () => {
  await requireAuth(routes.jobs.list);

  return (
    <SelectFromListPlaceholder
      title="Select a job"
      description="Choose a job from the list to view and edit its profile."
    />
  );
};

export default JobsPage;
