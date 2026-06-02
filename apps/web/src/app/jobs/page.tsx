import { fieldAllows, type Manifest } from "@latch/contracts";
import type { ProjectedJobListRow } from "@latch/dal";
import Link from "next/link";

import { getJobsDal, resolveContext } from "@/lib/latch";

type ListSearchParams = {
  status?: string;
};

type ColumnDef = {
  /** Field id this column renders; gated by manifest `read`. */
  field: ProjectedColumnField;
  header: string;
  render: (row: ProjectedJobListRow) => React.ReactNode;
};

type ProjectedColumnField = Exclude<keyof ProjectedJobListRow, "id">;

const dash = "—";

/**
 * Manifest-driven columns. Order is fixed; visibility mirrors the manifest.
 * The UI is never the security boundary — the DAL omits forbidden Fields,
 * so a denied column simply has no data even if it were rendered.
 */
const COLUMNS: ColumnDef[] = [
  {
    field: "summary",
    header: "Title",
    render: (row) => row.summary?.title ?? dash,
  },
  {
    field: "summary",
    header: "Status",
    render: (row) => row.summary?.status ?? dash,
  },
  {
    field: "summary",
    header: "Scheduled",
    render: (row) =>
      row.summary?.scheduled_at
        ? new Date(row.summary.scheduled_at).toLocaleString()
        : dash,
  },
  {
    field: "customer_site",
    header: "Customer",
    render: (row) => row.customer_site?.name ?? dash,
  },
  {
    field: "customer_site",
    header: "Site",
    render: (row) => row.customer_site?.label ?? dash,
  },
  {
    field: "financial_terms",
    header: "Contract amount",
    render: (row) => row.financial_terms?.contract_amount ?? dash,
  },
  {
    field: "assignments",
    header: "Assignees",
    render: (row) => row.assignments?.length ?? 0,
  },
];

const visibleColumns = (manifest: Manifest): ColumnDef[] =>
  COLUMNS.filter((column) => fieldAllows(manifest, column.field, "read"));

const JobsListPage = async (props: {
  searchParams: Promise<ListSearchParams>;
}): Promise<React.ReactElement> => {
  const { status } = await props.searchParams;
  const ctx = resolveContext({ surfaceId: "job_list" });
  const { rows, total } = getJobsDal().list(
    ctx,
    status ? { status } : undefined,
  );

  const columns = visibleColumns(ctx.manifest);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <header className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Jobs</h1>
        <span className="text-sm text-neutral-500">
          {total} {total === 1 ? "job" : "jobs"}
        </span>
      </header>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-left dark:border-neutral-800 dark:bg-neutral-900">
              {columns.map((column) => (
                <th
                  key={column.header}
                  className="px-4 py-2 font-medium text-neutral-600 dark:text-neutral-300"
                >
                  {column.header}
                </th>
              ))}
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="px-4 py-8 text-center text-neutral-500"
                >
                  No jobs to show.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-900 dark:hover:bg-neutral-900"
                >
                  {columns.map((column) => (
                    <td
                      key={column.header}
                      className="px-4 py-2 align-top"
                    >
                      {column.render(row)}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/jobs/${row.id}`}
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
};

export default JobsListPage;
