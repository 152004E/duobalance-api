import * as dns from 'node:dns';
import { IsRealEmailConstraint } from './is-real-email';

jest.mock('node:dns', () => ({
  ...jest.requireActual<typeof import('node:dns')>('node:dns'),
  promises: {
    resolveMx: jest.fn(),
  },
}));

describe('IsRealEmailConstraint', () => {
  let constraint: IsRealEmailConstraint;
  const resolveMx = dns.promises.resolveMx as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    constraint = new IsRealEmailConstraint();
  });

  it('rechaza dominios sin registro MX (usuario@g.com)', async () => {
    const error: NodeJS.ErrnoException = new Error('domain not found');
    error.code = 'ENOTFOUND';
    resolveMx.mockRejectedValue(error);

    await expect(constraint.validate('usuario@g.com')).resolves.toBe(false);
    expect(resolveMx).toHaveBeenCalledWith('g.com');
  });

  it('rechaza dominios inexistentes sin registros MX', async () => {
    const error: NodeJS.ErrnoException = new Error('no data');
    error.code = 'ENODATA';
    resolveMx.mockRejectedValue(error);

    await expect(
      constraint.validate('algo@asdfkjsdhfksjdflkj.com'),
    ).resolves.toBe(false);
  });

  it('acepta dominios con registro MX (gmail.com)', async () => {
    resolveMx.mockResolvedValue([
      { exchange: 'gmail-smtp-in.l.google.com', priority: 10 },
    ]);

    await expect(constraint.validate('algo.prueba@gmail.com')).resolves.toBe(
      true,
    );
  });

  it('rechaza formatos inválidos sin consultar DNS', async () => {
    await expect(constraint.validate('correo-invalido')).resolves.toBe(false);
    expect(resolveMx).not.toHaveBeenCalled();
  });

  it('rechaza emails con local part de 1 carácter', async () => {
    resolveMx.mockResolvedValue([{ exchange: 'mx.example.com', priority: 10 }]);

    await expect(constraint.validate('a@example.com')).resolves.toBe(false);
  });

  it('fail-open ante errores transitorios de DNS', async () => {
    const error: NodeJS.ErrnoException = new Error('timeout');
    error.code = 'ETIMEOUT';
    resolveMx.mockRejectedValue(error);

    await expect(constraint.validate('usuario@example.com')).resolves.toBe(
      true,
    );
  });

  it('cachea el resultado del dominio entre llamadas', async () => {
    resolveMx.mockResolvedValue([{ exchange: 'mx.example.com', priority: 10 }]);

    await constraint.validate('uno@example.com');
    await constraint.validate('dos@example.com');

    expect(resolveMx).toHaveBeenCalledTimes(1);
  });
});
