import { test } from 'node:test';
import assert from 'node:assert';
import { regexPrecheck } from '../src/postfilter.js';
import { fallbackResponse } from '../src/fallback.js';

test('regexPrecheck blocks unrecorded efficiency figures', () => {
  assert.equal(regexPrecheck('It reaches an efficiency of 91% in tests.').verdict, 'FAIL');
});

test('regexPrecheck blocks absolute guarantees', () => {
  assert.equal(regexPrecheck('This motor will definitely work for your application.').verdict, 'FAIL');
});

test('regexPrecheck blocks generic knowledge claims', () => {
  assert.equal(regexPrecheck('It is commonly known that BLDC motors are efficient.').verdict, 'FAIL');
});

test('regexPrecheck passes clean factual answers', () => {
  assert.equal(regexPrecheck('We use N35SH magnets working up to 150C. Would you like the inspection video?').verdict, 'PASS');
});

test('fallbackResponse is bilingual and carries reason', () => {
  const en = fallbackResponse('en', 'low_score');
  const zh = fallbackResponse('zh', 'filter_blocked');
  assert.ok(en.fallback && en.reply.includes('verified data'));
  assert.ok(zh.fallback && zh.reply.includes('工程师'));
});
