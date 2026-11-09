import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Organization, OrganizationSchema } from './organization.schema';
import { OrganizationMembership, OrganizationMembershipSchema } from './organization-membership.schema';
import { OrganizationAudit, OrganizationAuditSchema } from './organization-audit.schema';
import { User, UserSchema } from '../auth/user.schema';
import { OrganizationsController } from './organizations.controller';
import { OrganizationAccessController } from './organization-access.controller';
import { OrganizationsService } from './organizations.service';
import { OrganizationAccessService } from './organization-access.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
      { name: OrganizationMembership.name, schema: OrganizationMembershipSchema },
      { name: OrganizationAudit.name, schema: OrganizationAuditSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [OrganizationsController, OrganizationAccessController],
  providers: [OrganizationsService, OrganizationAccessService],
  exports: [OrganizationAccessService],
})
export class OrganizationsModule {}