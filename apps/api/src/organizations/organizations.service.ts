import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Organization } from './organization.schema';
import { OrganizationMembership } from './organization-membership.schema';
import { OrganizationAudit } from './organization-audit.schema';
import { User } from '../auth/user.schema';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectModel(Organization.name) private orgs: Model<Organization>,
    @InjectModel(OrganizationMembership.name) private memberships: Model<OrganizationMembership>,
    @InjectModel(OrganizationAudit.name) private audit: Model<OrganizationAudit>,
    @InjectModel(User.name) private users: Model<User>,
  ) {}

  async list() {
    const items = await this.orgs.find({}).sort({ createdAt: -1 }).limit(500).lean();
    return {
      items,
      total: items.length,
      limit: 500,
      note: 'Registry view only; listing does not grant access to organization data.',
    };
  }

  async create(b: any, actor: string) {
    const slug = String(b?.slug || '').trim().toLowerCase();
    const name = String(b?.name || '').trim();
    const reason = String(b?.reason || '').trim();
    const currency = String(b?.baseCurrency || 'UGX').trim().toUpperCase();
    const timezone = String(b?.timezone || 'Africa/Kampala').trim();

    if (!/^[a-z0-9][a-z0-9-]{2,62}$/.test(slug))
      throw new BadRequestException('slug must be 3–63 lowercase letters, numbers, or hyphens');
    if (!name || name.length > 160)
      throw new BadRequestException('name is required (max 160 characters)');
    if (reason.length < 10 || reason.length > 1000)
      throw new BadRequestException('reason must contain 10–1000 characters');
    if (!/^[A-Z]{3}$/.test(currency))
      throw new BadRequestException('baseCurrency must be a 3-letter currency code');

    try {
      const d = await this.orgs.create({
        slug,
        name,
        status: 'active',
        baseCurrency: currency,
        timezone,
        country: String(b?.country || 'Uganda').trim().slice(0, 80),
        createdBy: actor,
        recordVersion: 1,
      });
      await this.audit.create({
        organizationId: String(d._id),
        actor,
        action: 'organization_created',
        reason,
        details: { slug, name, currency, timezone },
      });
      return {
        organization: d.toObject(),
        note: 'No membership is granted automatically; a separate authorized membership grant is required.',
      };
    } catch (e: any) {
      if (e?.code === 11000) throw new ConflictException('Organization slug already exists');
      throw e;
    }
  }

  async addMembership(b: any, actor: string) {
    const organizationId = String(b?.organizationId || '').trim();
    const userIdRaw = String(b?.userId || '').trim().toLowerCase();
    const role = String(b?.role || '');
    const reason = String(b?.reason || '').trim();

    if (!organizationId || !userIdRaw)
      throw new BadRequestException('organizationId and userId are required');

    // NEW: validate the userId is a valid Mongo ObjectId
    if (!Types.ObjectId.isValid(userIdRaw)) {
      throw new BadRequestException(
        'userId must be a valid 24-character Mongo ObjectId (not an email address)',
      );
    }

    if (!['owner', 'admin', 'manager', 'field_worker', 'finance', 'viewer'].includes(role))
      throw new BadRequestException('Unsupported membership role');
    if (reason.length < 10 || reason.length > 1000)
      throw new BadRequestException('reason must contain 10–1000 characters');

    // NEW: verify the organization exists and is active
    const org = await this.orgs.findById(organizationId).lean();
    if (!org) throw new NotFoundException('Organization not found');
    if (org.status !== 'active')
      throw new ConflictException('Organization is suspended');

    // NEW: verify the target user actually exists
    const targetUser = await this.users.findById(userIdRaw).select('_id email active').lean();
    if (!targetUser) {
      throw new NotFoundException('User not found. Create the user account first via /api/auth/users.');
    }
    if (!targetUser.active) {
      throw new ConflictException('User account is deactivated.');
    }

    try {
      const m = await this.memberships.create({
        organizationId,
        userId: userIdRaw,
        role,
        status: 'active',
        addedBy: actor,
      });
      await this.audit.create({
        organizationId,
        actor,
        action: 'membership_added',
        reason,
        details: { userId: userIdRaw, role, membershipId: String(m._id) },
      });
      return m.toObject();
    } catch (e: any) {
      if (e?.code === 11000) throw new ConflictException('Membership already exists');
      throw e;
    }
  }

  async membershipsFor(id: string) {
    if (!(await this.orgs.findById(id).lean()))
      throw new NotFoundException('Organization not found');
    const items = await this.memberships
      .find({ organizationId: id })
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();
    return { organizationId: id, items, total: items.length };
  }

  async history(id: string, limit = 100) {
    if (!(await this.orgs.findById(id).lean()))
      throw new NotFoundException('Organization not found');
    return this.audit
      .find({ organizationId: id })
      .sort({ createdAt: -1 })
      .limit(Math.max(1, Math.min(500, Math.floor(Number(limit) || 100))))
      .lean();
  }
}