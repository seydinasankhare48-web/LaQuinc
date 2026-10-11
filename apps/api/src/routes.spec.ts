import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ModulesContainer, Reflector } from '@nestjs/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AUTHENTICATED, IS_PUBLIC, REQUIRE_TENANT, ROLES } from './auth/decorators';
import { createTestApp, type TestApp } from './test/harness';

let t: TestApp;
beforeAll(async () => {
  t = await createTestApp();
});
afterAll(() => t.close());

// Refus par défaut : toute route doit déclarer son niveau d'accès. Ce test échoue si une future route l'oublie.
describe('route access declarations', () => {
  it('every route declares @Public, @Authenticated, @RequireTenant or @Roles', () => {
    const reflector = new Reflector();
    const modules = t.app.get(ModulesContainer);
    const undeclared: string[] = [];
    let routes = 0;
    for (const mod of modules.values()) {
      for (const wrapper of mod.controllers.values()) {
        const proto = wrapper.metatype?.prototype as Record<string, unknown> | undefined;
        if (!proto) continue;
        for (const name of Object.getOwnPropertyNames(proto)) {
          const handler = proto[name];
          if (typeof handler !== 'function' || Reflect.getMetadata(METHOD_METADATA, handler) === undefined) continue;
          routes++;
          const targets = [handler, wrapper.metatype!];
          const declared = [IS_PUBLIC, AUTHENTICATED, REQUIRE_TENANT, ROLES].some(
            (key) => reflector.getAllAndOverride(key, targets) !== undefined,
          );
          if (!declared) {
            undeclared.push(`${wrapper.metatype!.name}.${name} (${String(Reflect.getMetadata(PATH_METADATA, handler))})`);
          }
        }
      }
    }
    expect(routes).toBeGreaterThanOrEqual(8);
    expect(undeclared).toEqual([]);
  });
});
