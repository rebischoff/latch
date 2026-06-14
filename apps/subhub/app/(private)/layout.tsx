import type { ReactNode } from "react";

type PrivateLayoutProps = {
  children: ReactNode;
};

// Passthrough only — each private page calls requireAuth with its explicit path.
const PrivateLayout = ({ children }: PrivateLayoutProps) => children;

export default PrivateLayout;
