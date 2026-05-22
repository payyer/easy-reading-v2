import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : null;

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: '',
      error: '',
    };

    if (exceptionResponse && typeof exceptionResponse === 'object') {
      const responseObj = exceptionResponse as Record<string, any>;
      errorResponse.message = Array.isArray(responseObj.message)
        ? responseObj.message.join(', ')
        : responseObj.message || exception.message;
      errorResponse.error = responseObj.error || '';
    } else {
      errorResponse.message = exception.message || 'Internal server error';
      errorResponse.error = status === HttpStatus.INTERNAL_SERVER_ERROR ? 'Internal Server Error' : '';
    }

    // Ghi log chi tiết
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${request.method}] ${request.url} - Error: ${exception.message}`,
        exception.stack,
      );
    } else {
      this.logger.warn(
        `[${request.method}] ${request.url} - Warning: ${errorResponse.message}`,
      );
    }

    response.status(status).json(errorResponse);
  }
}
