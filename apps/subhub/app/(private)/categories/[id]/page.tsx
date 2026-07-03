import { HydrationBoundary } from "@tanstack/react-query";

import { CategoryDetailForm } from "@/components/catalog/CategoryDetailForm";
import { toSearchParams } from "@/lib/next-search-params";
import { parseReturnContext } from "@/lib/picker-return-context";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import { prefetchSurfaceCreate, prefetchSurfaceDetail } from "@/lib/surfaces/prefetch-surface-query";

type CategoryIdPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const CategoryIdPage = async ({ params, searchParams }: CategoryIdPageProps) => {
  const { id } = await params;

  if (id === "new") {
    const resolvedSearchParams = await searchParams;
    const { returnTo } = parseReturnContext(toSearchParams(resolvedSearchParams));
    const parentId =
      typeof resolvedSearchParams.parent_id === "string"
        ? resolvedSearchParams.parent_id
        : undefined;

    await requireAuth(routes.categories.new);
    const { state, manifest } = await prefetchSurfaceCreate("category_detail", "new");

    return (
      <HydrationBoundary state={state}>
        <CategoryDetailForm
          categoryId="new"
          manifest={manifest}
          parentId={parentId}
          returnTo={returnTo}
        />
      </HydrationBoundary>
    );
  }

  await requireAuth(routes.categories.detail(id));
  const { state, manifest } = await prefetchSurfaceDetail("category_detail", id);

  return (
    <HydrationBoundary state={state}>
      <CategoryDetailForm categoryId={id} manifest={manifest} />
    </HydrationBoundary>
  );
};

export default CategoryIdPage;
