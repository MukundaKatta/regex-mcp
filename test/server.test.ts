import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { findMatches } from '../src/server.js';

test('finds all matches of a simple pattern', () => {
  const r = findMatches('\\d+', 'a1 b22 c333');
  assert.equal(r.match_count, 3);
  assert.deepEqual(
    r.matches.map((m) => m.match),
    ['1', '22', '333'],
  );
});

test('records start/end positions', () => {
  const r = findMatches('\\d+', 'a1 b22');
  assert.equal(r.matches[0].start, 1);
  assert.equal(r.matches[0].end, 2);
  assert.equal(r.matches[1].start, 4);
  assert.equal(r.matches[1].end, 6);
});

test('captures numbered groups', () => {
  const r = findMatches('(\\w+)=(\\d+)', 'x=1 y=22');
  assert.deepEqual(r.matches[0].groups, ['x', '1']);
  assert.deepEqual(r.matches[1].groups, ['y', '22']);
});

test('captures named groups', () => {
  const r = findMatches('(?<key>\\w+)=(?<val>\\d+)', 'x=1');
  assert.deepEqual(r.matches[0].named_groups, { key: 'x', val: '1' });
});

test('forces global flag', () => {
  const r = findMatches('a', 'aaa');
  assert.equal(r.match_count, 3);
  assert.ok(r.flags.includes('g'));
});

test('case-insensitive flag works', () => {
  const r = findMatches('foo', 'FOO foo Foo', 'i');
  assert.equal(r.match_count, 3);
});

test('rejects invalid pattern', () => {
  assert.throws(() => findMatches('[', 'x'));
});

test('rejects unknown flag', () => {
  assert.throws(() => findMatches('a', 'a', 'z'));
});

test('respects max_matches cap', () => {
  const r = findMatches('a', 'aaaaa', '', 3);
  assert.equal(r.match_count, 3);
});

test('handles zero-width pattern without infinite loop', () => {
  const r = findMatches('(?=a)', 'aaa');
  // 3 zero-width matches before each 'a'.
  assert.equal(r.match_count, 3);
});

test('unmatched optional groups become null', () => {
  const r = findMatches('(a)(b)?', 'a');
  assert.deepEqual(r.matches[0].groups, ['a', null]);
});

test('returns empty result when there are no matches', () => {
  const r = findMatches('z+', 'abc');
  assert.equal(r.match_count, 0);
  assert.deepEqual(r.matches, []);
});

test('max_matches of 0 yields no matches', () => {
  const r = findMatches('a', 'aaa', '', 0);
  assert.equal(r.match_count, 0);
});

test('rejects non-string pattern', () => {
  // @ts-expect-error intentionally passing a non-string
  assert.throws(() => findMatches(123, 'x'), /pattern must be a string/);
});

test('rejects non-string text', () => {
  // @ts-expect-error intentionally passing a non-string
  assert.throws(() => findMatches('a', undefined), /text must be a string/);
});

test('rejects negative max_matches', () => {
  assert.throws(() => findMatches('a', 'a', '', -1), /non-negative integer/);
});
