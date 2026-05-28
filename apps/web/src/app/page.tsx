import { PACKAGE_NAME } from "@latch/contracts";
import Link from "next/link";

const docLinks = [
  { href: "/docs/planning/vision.md", label: "Vision", note: "in repo: docs/planning/" },
  { href: "/docs/planning/requirements.md", label: "Requirements" },
  { href: "/docs/planning/glossary.md", label: "Glossary (Module, Field, …)" },
  { href: "/docs/roadmap.md", label: "Roadmap" },
  { href: "/docs/planning/open-questions.md", label: "Open questions" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <main className="mx-auto flex max-w-2xl flex-col gap-10 px-6 py-16">
        <header className="flex flex-col gap-3">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Phase 0 — planning
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            Latch{" "}
            <span className="sr-only">({PACKAGE_NAME} workspace linked)</span>
          </h1>
          <p className="text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
            Business data platform: Next.js, PostgreSQL, granular access control
            via <strong>Modules</strong> and <strong>Fields</strong>, audit logging,
            soft/hard delete, and accept/reject trails.
          </p>
        </header>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            API
          </h2>
          <Link
            href="/api/health"
            className="w-fit rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            GET /api/health
          </Link>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Planning docs (repository)
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Open these paths in your editor or on GitHub. They are not served as
            web pages yet.
          </p>
          <ul className="flex flex-col gap-2">
            {docLinks.map((item) => (
              <li
                key={item.href}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <code className="text-sm">{item.href}</code>
                <span className="ml-2 text-sm text-zinc-500">— {item.label}</span>
                {item.note ? (
                  <p className="mt-1 text-xs text-zinc-400">{item.note}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          <p>
            <strong className="text-zinc-800 dark:text-zinc-200">Local Postgres:</strong>{" "}
            <code>docker compose up -d</code> then set{" "}
            <code>DATABASE_URL</code> from <code>.env.example</code>.
          </p>
        </section>
      </main>
    </div>
  );
}
