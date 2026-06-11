const HomePage = () => (
  <main>
    <h1>spike_business</h1>
    <p>
      Consumer harness for scoped row filtering on <code>widgets.scope_id</code>.
      Dev server defaults to port <code>3002</code> (policy spike uses{" "}
      <code>3001</code>).
    </p>
    <p>
      Proof lives in vitest:{" "}
      <code>lib/widget/scoped-visibility.test.ts</code>. A widget list UI is not
      wired yet.
    </p>
    <p>
      Run tests: <code>npm run test -w @latch/spike-business</code>
    </p>
  </main>
);

export default HomePage;
