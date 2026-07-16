import { SelectFromListPlaceholder } from "@/components/shell/SelectFromListPlaceholder";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";

const JobsPage = async () => {
  await requireAuth(routes.jobs.list);

  return (
    <SelectFromListPlaceholder
      title="Select a job"
      description="Choose a job from the list, or New for service/warranty/blank project shells. Sold contract lines come from estimate Win — do not edit sold $ on the job."
    />
  );
};

export default JobsPage;
