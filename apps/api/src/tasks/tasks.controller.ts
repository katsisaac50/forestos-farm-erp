

// import {Body,Controller,Get,Patch,Param,Post} from '@nestjs/common';import {TasksService} from './tasks.service';import {CreateTaskDto} from './dto';
// @Controller('tasks') export class TasksController {constructor(private service:TasksService){} @Get() all(){return this.service.findAll();}@Post() create(@Body() dto:CreateTaskDto){return this.service.create(dto);}@Patch(':id') update(@Param('id') id:string,@Body() dto:Partial<CreateTaskDto>){return this.service.update(id,dto);}}
