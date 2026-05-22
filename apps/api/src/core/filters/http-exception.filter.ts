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

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: '',
      error: '',
    };

    const exceptionError =
      exception instanceof Error ? exception : new Error(String(exception));

    if (exceptionResponse && typeof exceptionResponse === 'object') {
      const responseObj = exceptionResponse as Record<string, unknown>;
      const msgVal = responseObj.message;
      errorResponse.message = Array.isArray(msgVal)
        ? msgVal.join(', ')
        : typeof msgVal === 'string'
          ? msgVal
          : exceptionError.message;
      errorResponse.error =
        typeof responseObj.error === 'string' ? responseObj.error : '';
    } else {
      errorResponse.message = exceptionError.message || 'Internal server error';
      errorResponse.error =
        status === Number(HttpStatus.INTERNAL_SERVER_ERROR)
          ? 'Internal Server Error'
          : '';
    }

    // Ghi log chi tiết
    if (status === Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
      this.logger.error(
        `[${request.method}] ${request.url} - Error: ${exceptionError.message}`,
        exceptionError.stack,
      );
    } else {
      this.logger.warn(
        `[${request.method}] ${request.url} - Warning: ${errorResponse.message}`,
      );
    }

    response.status(status).json(errorResponse);
  }
}
