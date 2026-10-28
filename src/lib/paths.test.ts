import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cleanPath, isZh, localize } from './paths.ts';

test('a published path drops .html, index and trailing slashes but keeps the root', () => {
  const cases: [string, string][] = [
    ['/', '/'],
    ['', '/'],
    ['/index.html', '/'],
    ['/gps-go/', '/gps-go'],
    ['/gps-go.html', '/gps-go'],
    ['/gps-go/index.html', '/gps-go'],
    ['/gps-go/guide.html', '/gps-go/guide'],
    ['/zh-hans.html', '/zh-hans'],
  ];
  for (const [input, want] of cases) assert.equal(cleanPath(input), want, input);
});

test('every page pairs with its other-language page, homes included', () => {
  const pairs: [string, string][] = [
    ['/', '/zh-hans'],
    ['/privacy', '/zh-hans/privacy'],
    ['/gps-go/support', '/zh-hans/gps-go/support'],
  ];
  for (const [en, zh] of pairs) {
    assert.equal(localize(en, true), zh, en);
    assert.equal(localize(zh, false), en, zh);
    assert.equal(localize(en, false), en, en);
    assert.equal(localize(zh, true), zh, zh);
  }
  assert.equal(isZh('/zh-hansel'), false);
});
