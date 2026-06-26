import { routes } from "./nav-routes";

export const PROVISION_USER_PARAMS = {
  linkPartyId: "linkPartyId",
  returnTo: "returnTo",
} as const;

export type ProvisionUserContext = {
  linkPartyId: string | null;
  returnTo: string | null;
};

type SearchParamsLike = {
  get(name: string): string | null;
};

/** Same-origin relative path only — rejects open redirects. */
export const sanitizeReturnTo = (
  returnTo: string | null | undefined,
  fallback: string,
): string => {
  if (!returnTo) {
    return fallback;
  }

  const trimmed = returnTo.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("://")) {
    return fallback;
  }

  return trimmed;
};

export const buildProvisionUserUrl = ({
  partyId,
  returnTo,
}: {
  partyId: string;
  returnTo: string;
}): string => {
  const params = new URLSearchParams();
  params.set(PROVISION_USER_PARAMS.linkPartyId, partyId);
  params.set(PROVISION_USER_PARAMS.returnTo, returnTo);
  return `${routes.users.new}?${params.toString()}`;
};

export const parseProvisionContext = (
  searchParams: SearchParamsLike,
  fallbackReturnTo: string,
): ProvisionUserContext & { safeReturnTo: string } => {
  const linkPartyId = searchParams.get(PROVISION_USER_PARAMS.linkPartyId);
  const returnTo = searchParams.get(PROVISION_USER_PARAMS.returnTo);

  return {
    linkPartyId,
    returnTo,
    safeReturnTo: sanitizeReturnTo(returnTo, fallbackReturnTo),
  };
};
