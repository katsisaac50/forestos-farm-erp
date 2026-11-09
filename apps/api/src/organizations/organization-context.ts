/**
 * Phase 86 — request-scoped organization context primitives.
 *
 * Security note:
 * These primitives do not themselves establish tenant isolation. They provide
 * a typed, fail-closed boundary for modules to adopt. Never trust an
 * organization ID supplied by a query string/body/header without resolving
 * the authenticated user's active membership server-side.
 */
export interface OrganizationContext {
  organizationId: string;
  userId: string;
  roles: string[];
}

export const ORGANIZATION_CONTEXT_KEY = 'forestOS.organizationContext';

export class OrganizationContextError extends Error {
  constructor(message = 'An active organization context is required') {
    super(message);
    this.name = 'OrganizationContextError';
  }
}

export function requireOrganizationContext(
  context: OrganizationContext | undefined | null,
): OrganizationContext {
  if (!context || !context.organizationId || !context.userId || !Array.isArray(context.roles)) {
    throw new OrganizationContextError();
  }
  return context;
}

export function hasOrganizationRole(
  context: OrganizationContext,
  allowedRoles: string[],
): boolean {
  return context.roles.some((role) => allowedRoles.includes(role));
}
