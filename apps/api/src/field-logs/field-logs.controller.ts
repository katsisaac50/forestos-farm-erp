import {Body,Controller,Get,Patch,Param,Post} from '@nestjs/common';import {FieldLogsService} from './field-logs.service';import {CreateFieldLogDto} from './dto';
@Controller('field-logs') export class FieldLogsController {
 constructor(private service:FieldLogsService){}
 @Get() all(){return this.service.findAll();}
 @Post() create(@Body() dto:CreateFieldLogDto){return this.service.create(dto);}
 @Patch(':id') update(@Param('id') id:string,@Body() dto:Partial<CreateFieldLogDto>){return this.service.update(id,dto);}
}
