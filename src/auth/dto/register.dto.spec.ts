import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';

describe('RegisterDto', () => {
  const base = {
    firstName: 'Andrea',
    lastName: 'Pérez',
    password: 'secret123',
  };

  it('rechaza emails de 1 carácter (a@g.com)', async () => {
    const dto = plainToInstance(RegisterDto, { ...base, email: 'a@g.com' });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('email');
  });

  it('rechaza dominios desechables (mailinator.com)', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...base,
      email: 'usuario@mailinator.com',
    });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(Object.keys(errors[0].constraints ?? {})).toContain(
      'isNotDisposableEmail',
    );
  });

  it('acepta un email personal válido', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...base,
      email: 'algo.prueba@gmail.com',
    });
    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });
});
