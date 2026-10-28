import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cleanPath } from './paths.ts';

test('a published path drops .html, index and trailing slashes but keeps the root', () => {
  const cases: [string, string][] = [
    ['/', '/'],
    ['', '/'],
    ['/index.html', '/'],
    ['/gps-go/', '/gps-go'],
    ['/gps-go.html', '/gps-go'],
    ['/gps-go/index.html', '/gps-go'],
    ['/gps-go/guide.html', '/gps-go/guide'],
  ];
  for (const [input, want] of cases) assert.equal(cleanPath(input), want, input);
});
