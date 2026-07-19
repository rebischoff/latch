type RequisitionsLayoutProps = {
  children: React.ReactNode;
};

/** List-only material requests (task 56) — no master-detail chrome. */
const RequisitionsLayout = async ({ children }: RequisitionsLayoutProps) => (
  <>{children}</>
);

export default RequisitionsLayout;
