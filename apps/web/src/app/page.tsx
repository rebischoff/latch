import Link from "next/link";

const HomePage = (): React.ReactElement => (
  <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-10">
    <h1 className="text-3xl font-semibold">Latch</h1>
    <p className="mt-2 text-neutral-500">Field-level access-control pilot.</p>
    <Link
      href="/jobs"
      className="mt-6 inline-block w-fit text-blue-600 hover:underline dark:text-blue-400"
    >
      View jobs →
    </Link>
  </main>
);

export default HomePage;
