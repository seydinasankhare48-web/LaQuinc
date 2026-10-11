import { describe, expect, it } from 'vitest';
import { createTenantSchema, e164PhoneSchema, updateMembershipRoleSchema, updateTenantSchema } from './index';

describe('schemas', () => {
  it('accepts a valid tenant and trims text', () => {
    expect(createTenantSchema.parse({ name: '  Quincaillerie Ndiaye ' }).name).toBe('Quincaillerie Ndiaye');
  });
  it('rejects a too short name and unknown roles', () => {
    expect(createTenantSchema.safeParse({ name: 'A' }).success).toBe(false);
    expect(updateMembershipRoleSchema.safeParse({ role: 'admin' }).success).toBe(false);
  });
  it('requires at least one field to update a tenant', () => {
    expect(updateTenantSchema.safeParse({}).success).toBe(false);
    expect(updateTenantSchema.safeParse({ ninea: null }).success).toBe(true);
  });
  it('validates E.164 phones', () => {
    expect(e164PhoneSchema.safeParse('+221771234567').success).toBe(true);
    expect(e164PhoneSchema.safeParse('771234567').success).toBe(false);
  });
});
