import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { ResendProvider } from './providers/resend.provider';

describe('MailService', () => {
  let service: MailService;
  const provider = { send: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: ResendProvider, useValue: provider },
        {
          provide: ConfigService,
          useValue: new ConfigService({
            MAIL_FROM: 'onboarding@resend.dev',
            FRONTEND_URL: 'http://localhost:8081',
          }),
        },
      ],
    }).compile();

    service = module.get(MailService);
  });

  it('usa el remitente configurado en MAIL_FROM', async () => {
    provider.send.mockResolvedValue({ id: 'mail-1' });

    await service.send({
      to: 'test@example.com',
      subject: 'Hola',
      template: 'welcome',
      data: { name: 'Emerson' },
    });

    expect(provider.send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'onboarding@resend.dev',
        to: 'test@example.com',
        subject: 'Hola',
      }),
    );
  });

  it('reemplaza las variables {{name}} del template', async () => {
    provider.send.mockResolvedValue({ id: 'mail-2' });

    await service.sendTest('test@example.com', 'Emerson');
    const call = provider.send.mock.calls[0] as [{ html: string }];
    const html = call[0].html;

    expect(html).toContain('Hola Emerson');
    expect(html).not.toContain('{{name}}');
  });

  it('propaga los errores del proveedor', async () => {
    provider.send.mockRejectedValue(
      new Error('Mail no configurado: falta RESEND_API_KEY'),
    );

    await expect(
      service.send({
        to: 'test@example.com',
        subject: 'Hola',
        template: 'welcome',
        data: {},
      }),
    ).rejects.toThrow('RESEND_API_KEY');
  });
});
