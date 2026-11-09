// src/common/mongo-exception.filter.ts
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class MongoExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception?.code === 11000) {
      return res.status(409).json({
        statusCode: 409,
        message: 'Duplicate key',
        error: 'Conflict',
      });
    }
    if (exception?.name === 'CastError') {
      return res.status(400).json({
        statusCode: 400,
        message: `Invalid ${exception.path ?? 'id'} format`,
        error: 'Bad Request',
      });
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return res.status(status).json(exception.getResponse());
    }
    return res.status(500).json({
      statusCode: 500,
      message: exception?.message ?? 'Internal server error',
      error: 'Internal Server Error',
    });
  }
}