import { Body, Controller, Post, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { RegistryBatchDto } from './dto';
import { RegistryPersistenceService } from './registry-persistence.service';

@Controller('registry-persistence')
export class RegistryPersistenceController {
  constructor(private readonly service: RegistryPersistenceService) {}
  @Post('batches')
  async commit(@Req() req: Request & { user?: Record<string, any> }, @Body() body: RegistryBatchDto) {
    // Tenant identity must originate in a verified JWT claim, never a body/header supplied by the caller.
    const tenantId = req.user?.organizationId || req.user?.tenantId;
    if (typeof tenantId !== 'string' || !tenantId.trim()) throw new UnauthorizedException('Session has no organization/tenant claim');
    return this.service.commit(tenantId, body);
  }
}
