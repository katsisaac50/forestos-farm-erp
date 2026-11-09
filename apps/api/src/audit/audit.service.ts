import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditEvent } from './audit.schema';

/** Trusted identity must come from the authenticated server-side request context. */
export interface AuditTenantContext {
  tenantId: string;
  actorEmail: string;
}

@Injectable()
export class AuditService {
  constructor(@InjectModel(AuditEvent.name) private readonly model: Model<AuditEvent>) {}

  /**
   * Compatibility writer for legacy call sites. Events written here have no tenantId
   * and are intentionally excluded from tenant-scoped listings until reconciled.
   * New tenant-aware call sites should use recordForTenant().
   */
  record(actorEmail:string,action:string,entityType:string,entityId:string,summary:string,metadata?:Record<string,unknown>) {
    return this.model.create({ actorEmail: actorEmail.toLowerCase(), action, entityType, entityId, summary, metadata });
  }

  /** Explicitly attributes an event to a validated tenant and actor. */
  recordForTenant(context: AuditTenantContext, action: string, entityType: string, entityId: string, summary: string, metadata?: Record<string, unknown>) {
    const tenantId = typeof context?.tenantId === 'string' ? context.tenantId.trim() : '';
    const actorEmail = typeof context?.actorEmail === 'string' ? context.actorEmail.trim().toLowerCase() : '';
    if (!tenantId || !actorEmail) throw new ForbiddenException('Trusted tenant and actor context are required for tenant-aware audit events');
    return this.model.create({ tenantId, actorEmail, action, entityType, entityId, summary, metadata });
  }

  /** Tenant-scoped listing. Missing tenant context fails closed. */
  list(tenantId: string, limit = 100) {
    const trustedTenantId = typeof tenantId === 'string' ? tenantId.trim() : '';
    if (!trustedTenantId) throw new ForbiddenException('Tenant context is required to list audit events');
    const safeLimit = Math.min(Math.max(Number.isFinite(limit) ? Math.trunc(limit) : 100, 1), 200);
    return this.model.find({ tenantId: trustedTenantId }).sort({ createdAt: -1 }).limit(safeLimit).lean();
  }
}
