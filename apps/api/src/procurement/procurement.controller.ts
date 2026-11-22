import { Body, Controller, Get, Headers, Param, Patch, Post, Query, Req, BadRequestException } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { ProcurementService } from './procurement.service';

@Controller('procurement')
@Roles('owner')
export class ProcurementController {
  constructor(private readonly service: ProcurementService) {}

  private org(organizationId?: string): string {
    if (!organizationId) throw new BadRequestException('X-Organization-Id header required');
    return organizationId;
  }

  @Get('dashboard')
  dashboard(@Headers('x-organization-id') organizationId?: string): Promise<any> {
    return this.service.dashboard(this.org(organizationId));
  }

  @Get('suppliers')
  suppliers(@Query() q: any, @Headers('x-organization-id') organizationId?: string): Promise<any[]> {
    return this.service.listSuppliers(q, this.org(organizationId));
  }

  @Post('suppliers')
  createSupplier(
    @Body() b: any,
    @Req() req: any,
    @Headers('x-organization-id') organizationId?: string,
  ): Promise<any> {
    return this.service.createSupplier(b, req.user?.sub || req.user?.email || 'owner', this.org(organizationId));
  }

  @Patch('suppliers/:id')
  updateSupplier(
    @Param('id') id: string,
    @Body() b: any,
    @Headers('x-organization-id') organizationId?: string,
  ): Promise<any> {
    return this.service.updateSupplier(id, b, this.org(organizationId));
  }

  @Get('requests')
  requests(@Headers('x-organization-id') organizationId?: string): Promise<any[]> {
    return this.service.listRequests(this.org(organizationId));
  }

  @Post('requests')
  createRequest(
    @Body() b: any,
    @Req() req: any,
    @Headers('x-organization-id') organizationId?: string,
  ): Promise<any> {
    return this.service.createRequest(b, req.user?.sub || req.user?.email || 'owner', this.org(organizationId));
  }

  @Patch('requests/:id')
  updateRequest(
    @Param('id') id: string,
    @Body() b: any,
    @Headers('x-organization-id') organizationId?: string,
  ): Promise<any> {
    return this.service.updateRequest(id, b, this.org(organizationId));
  }

  @Get('orders')
  orders(@Headers('x-organization-id') organizationId?: string): Promise<any[]> {
    return this.service.listOrders(this.org(organizationId));
  }

  @Post('orders')
  createOrder(
    @Body() b: any,
    @Req() req: any,
    @Headers('x-organization-id') organizationId?: string,
  ): Promise<any> {
    return this.service.createOrder(b, req.user?.sub || req.user?.email || 'owner', this.org(organizationId));
  }

  @Patch('orders/:id')
  updateOrder(
    @Param('id') id: string,
    @Body() b: any,
    @Headers('x-organization-id') organizationId?: string,
  ): Promise<any> {
    return this.service.updateOrder(id, b, this.org(organizationId));
  }

  @Get('receipts')
  receipts(
    @Query('orderId') id?: string,
    @Headers('x-organization-id') organizationId?: string,
  ): Promise<any[]> {
    return this.service.listReceipts(id, this.org(organizationId));
  }

  @Post('receipts')
  createReceipt(
    @Body() b: any,
    @Req() req: any,
    @Headers('x-organization-id') organizationId?: string,
  ): Promise<any> {
    return this.service.createReceipt(b, req.user?.sub || req.user?.email || 'owner', this.org(organizationId));
  }
}