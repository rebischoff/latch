import { MasterDetailChromeLayout } from "@/components/shell/MasterDetailChromeLayout";
import { JobList } from "@/components/jobs/JobList";
import { MASTER_DETAIL_SURFACES } from "@/lib/master-detail-registry";

type JobsLayoutProps = {
  children: React.ReactNode;
};

const JobsLayout = async ({ children }: JobsLayoutProps) => (
  <MasterDetailChromeLayout
    listRoute={MASTER_DETAIL_SURFACES.jobs.listRoute}
    listSurfaceId="job_list"
    config={MASTER_DETAIL_SURFACES.jobs}
    list={<JobList />}
  >
    {children}
  </MasterDetailChromeLayout>
);

export default JobsLayout;
