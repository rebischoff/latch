import { routes } from "./nav-routes";
import { sanitizeReturnTo } from "./surface-navigation";

export { sanitizeReturnTo };

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
