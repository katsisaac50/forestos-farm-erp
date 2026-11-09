import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Organization, OrganizationDocument } from './organization.schema';
import {
  OrganizationMembership,
  OrganizationMembershipDocument,
} from './organization-membership.schema';
import { OrganizationContext } from './organization-context';

@Injectable()
export class OrganizationAccessService {
  constructor(
    @InjectModel(Organization.name)
    private readonly organizations: Model<OrganizationDocument>,
    @InjectModel(OrganizationMembership.name)
    private readonly memberships: Model<OrganizationMembershipDocument>,
  ) {}

  /**
   * Resolve a verified active organization context for a user.
   * The organization ID is only a selector: membership and organization status
   * are checked against the database on every call.
   */
  async resolveContext(userId: string, requestedOrganizationId: string): Promise<OrganizationContext> {
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(requestedOrganizationId)) {
      throw new NotFoundException('Organization or membership not found');
    }

    const organization = await this.organizations.findOne({
      _id: new Types.ObjectId(requestedOrganizationId),
      status: 'active',
    }).lean();

    if (!organization) {
      throw new NotFoundException('Organization or membership not found');
    }

    // Membership schema stores both references as strings, so query with the
    // canonical string IDs rather than BSON ObjectId values.
    const membership = await this.memberships.findOne({
      userId: String(userId),
      organizationId: String(requestedOrganizationId),
      status: 'active',
    }).lean();

    if (!membership) {
      throw new ForbiddenException('No active membership for the selected organization');
    }

    return {
      organizationId: String(organization._id),
      userId: String(userId),
      roles: Array.isArray((membership as any).roles)
        ? (membership as any).roles
        : (typeof (membership as any).role === 'string' && (membership as any).role
            ? [(membership as any).role]
            : []),
    };
  }

  async listMyOrganizations(userId: string) {
    if (!Types.ObjectId.isValid(userId)) return [];
    const memberships = await this.memberships.find({
      userId: String(userId),
      status: 'active',
    }).lean();

    const organizationIds = memberships
      .map((m: any) => String(m.organizationId))
      .filter((id: string) => Types.ObjectId.isValid(id));
    if (!organizationIds.length) return [];

    const organizations = await this.organizations.find({
      _id: { $in: organizationIds.map((id: string) => new Types.ObjectId(id)) },
      status: 'active',
    }).lean();

    const byId = new Map(organizations.map((o: any) => [String(o._id), o]));
    return memberships.flatMap((m: any) => {
      const org = byId.get(String(m.organizationId));
      return org ? [{
        organizationId: String(org._id),
        slug: org.slug,
        name: org.name,
        roles: Array.isArray(m.roles)
          ? m.roles
          : (typeof m.role === 'string' && m.role ? [m.role] : []),
      }] : [];
    });
  }
}
