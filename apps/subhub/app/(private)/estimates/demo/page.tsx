import { notFound } from "next/navigation";

import {
  DEMO_ESTIMATE,
  SPIKE_MANIFEST,
} from "@/components/estimates/estimate-spike-fixtures";
import { EstimateLineEditorSpike } from "@/components/estimates/EstimateLineEditorSpike";
import { PageScroll } from "@/components/shell/PageScroll";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";

const isSpikeEnabled = (): boolean =>
  process.env.NODE_ENV === "development" || process.env.LATCH_DEV_PLAYGROUND === "1";

const EstimateSpikePage = async () => {
  if (!isSpikeEnabled()) {
    notFound();
  }

  await requireAuth(routes.estimates.demo);

  return (
    <PageScroll>
      <EstimateLineEditorSpike estimate={DEMO_ESTIMATE} manifest={SPIKE_MANIFEST} />
    </PageScroll>
  );
};

export default EstimateSpikePage;
