import { notFound } from "next/navigation";

import {
  DEMO_ESTIMATE,
  SPIKE_MANIFEST,
} from "@/components/estimates/estimate-spike-fixtures";
import { EstimateLineEditorSpike } from "@/components/estimates/EstimateLineEditorSpike";
import { PageScroll } from "@/components/shell/PageScroll";
import { requireAuth } from "@/lib/require-auth";

type EstimateSpikePageProps = {
  params: Promise<{ id: string }>;
};

const isSpikeEnabled = (): boolean =>
  process.env.NODE_ENV === "development" || process.env.LATCH_DEV_PLAYGROUND === "1";

const EstimateSpikePage = async ({ params }: EstimateSpikePageProps) => {
  if (!isSpikeEnabled()) {
    notFound();
  }

  const { id } = await params;

  if (id !== DEMO_ESTIMATE.id) {
    notFound();
  }

  await requireAuth(`/estimates/${id}`);

  return (
    <PageScroll>
      <EstimateLineEditorSpike estimate={DEMO_ESTIMATE} manifest={SPIKE_MANIFEST} />
    </PageScroll>
  );
};

export default EstimateSpikePage;
