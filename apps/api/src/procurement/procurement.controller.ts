import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { ProcurementService } from './procurement.service';

@Controller('procurement')
@Roles('owner')
export class ProcurementController {
  constructor(private readonly service: ProcurementService) {}

  @Get('dashboard')
  dashboard(): Promise<any> {
    return this.service.dashboard();
  }

  @Get('suppliers')
  suppliers(@Query() q: any): Promise<any[]> {
    return this.service.listSuppliers(q);
  }

  @Post('suppliers')
  createSupplier(@Body() b: any, @Req() req: any): Promise<any> {
    return this.service.createSupplier(b, req.user?.sub || req.user?.email || 'owner');
  }

  @Patch('suppliers/:id')
  updateSupplier(@Param('id') id: string, @Body() b: any): Promise<any> {
    return this.service.updateSupplier(id, b);
  }

  @Get('requests')
  requests(): Promise<any[]> {
    return this.service.listRequests();
  }

  @Post('requests')
  createRequest(@Body() b: any, @Req() req: any): Promise<any> {
    return this.service.createRequest(b, req.user?.sub || req.user?.email || 'owner');
  }

  @Patch('requests/:id')
  updateRequest(@Param('id') id: string, @Body() b: any): Promise<any> {
    return this.service.updateRequest(id, b);
  }

  // ---- TS7056 fix ----
  @Get('orders')
  orders(): Promise<any[]> {
    return this.service.listOrders();
  }

  // ---- TS7056 fix ----
  @Post('orders')
  createOrder(@Body() b: any, @Req() req: any): Promise<any> {
    return this.service.createOrder(b, req.user?.sub || req.user?.email || 'owner');
  }

  @Patch('orders/:id')
  updateOrder(@Param('id') id: string, @Body() b: any): Promise<any> {
    return this.service.updateOrder(id, b);
  }

  // ---- TS7056 fix ----
  @Get('receipts')
  receipts(@Query('orderId') id?: string): Promise<any[]> {
    return this.service.listReceipts(id);
  }

  // ---- TS7056 fix ----
  @Post('receipts')
  createReceipt(@Body() b: any, @Req() req: any): Promise<any> {
    return this.service.createReceipt(b, req.user?.sub || req.user?.email || 'owner');
  }
}
