import { Body, Controller, Post } from '@nestjs/common';
import { MailService } from './mail.service';
import { TestMailDto } from './dto/test-mail.dto';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  /** ⚠️ Endpoint TEMPORAL para validar la integración. Eliminar tras verificar la recepción. */
  @Post('test')
  async test(@Body() dto: TestMailDto) {
    const result = await this.mailService.sendTest(
      dto.to,
      dto.name ?? 'Emerson',
    );
    return { message: 'Correo de prueba enviado correctamente', ...result };
  }
}
