import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    console.log('=== HttpExceptionFilter caught ===');
    console.log('path:', request.url);
    console.log('status:', exception.getStatus());
    console.log('message:', JSON.stringify(exception.getResponse()));

    response.status(exception.getStatus()).json({
      statusCode: exception.getStatus(),
      timestamp: new Date().toISOString(),
      path: request.url,
      message: exception.getResponse(),
    });
  }
}
