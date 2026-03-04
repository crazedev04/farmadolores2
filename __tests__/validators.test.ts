import { accountActionSchema, dataReportSchema } from '../src/admin/validators';

describe('admin validators', () => {
  test('data report reason requires minimum length', () => {
    const invalid = dataReportSchema.safeParse({ reason: 'corto' });
    expect(invalid.success).toBe(false);

    const valid = dataReportSchema.safeParse({
      reason: 'El telefono publicado no responde desde ayer.',
    });
    expect(valid.success).toBe(true);
  });

  test('account action requires a uid', () => {
    const invalid = accountActionSchema.safeParse({ uid: 'short' });
    expect(invalid.success).toBe(false);

    const valid = accountActionSchema.safeParse({ uid: 'abcdefghijklmno12345' });
    expect(valid.success).toBe(true);
  });
});
