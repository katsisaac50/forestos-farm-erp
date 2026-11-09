/**
 * Helpers for consistently applying organization scoping to Mongo queries.
 *
 * Adoption guidance:
 * - Use organizationFilter(context, filters) for reads and updates.
 * - Use organizationDocument(context, payload) for creates.
 * - Do not spread user-provided objects after organizationId; that could
 *   override the trusted tenant ID.
 * - These helpers are not a substitute for membership resolution or tests.
 */
import {
  OrganizationContext,
  requireOrganizationContext,
} from './organization-context';

export type OrganizationFilter = Record<string, unknown> & { organizationId: string };

export function organizationFilter(
  rawContext: OrganizationContext | undefined | null,
  filters: Record<string, unknown> = {},
): OrganizationFilter {
  const context = requireOrganizationContext(rawContext);
  const { organizationId: _untrustedOrganizationId, ...safeFilters } = filters;
  return { ...safeFilters, organizationId: context.organizationId };
}

export function organizationDocument<T extends Record<string, unknown>>(
  rawContext: OrganizationContext | undefined | null,
  payload: T,
): T & { organizationId: string; createdBy: string } {
  const context = requireOrganizationContext(rawContext);
  const { organizationId: _untrustedOrganizationId, createdBy: _untrustedCreatedBy, ...safePayload } = payload;
  return {
    ...safePayload,
    organizationId: context.organizationId,
    createdBy: context.userId,
  } as T & { organizationId: string; createdBy: string };
}
