import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/roles.decorator';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check() {
    return { status: 'ok', service: 'forestos-api', timestamp: new Date().toISOString() };
  }

  @Public()
  @Get('ready')
  readiness() {
    // Liveness/readiness distinction is documented: this endpoint is process-level only.
    // Database readiness must be added using a connection-aware health indicator.
    return { status: 'ready', service: 'forestos-api', timestamp: new Date().toISOString(), checks: { process: 'ok', database: 'not_checked' } };
  }
}
