import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseOperand, prepareRequest } from '../src/lib/calculator-input';

test('accepts signed decimals and a decimal comma', () => {
  for (const [text, value] of [['-2.5', -2.5], [' 3,5 ', 3.5], ['.5', 0.5], ['0', 0]] as const) {
    assert.equal(parseOperand(text, 'Number'), value);
  }
  assert.deepEqual(prepareRequest('8', '4', 'add'), { a: 8, b: 4, operation: 'add' });
});

test('rejects blank, incomplete, non-decimal, and ambiguous input', () => {
  for (const value of ['', ' ', '-', '1.', '1,2.3', '1,000,000', '12abc', 'Infinity', '0x10', '9'.repeat(320)]) {
    assert.throws(() => parseOperand(value, 'Number'), Error, value);
  }
  assert.throws(() => prepareRequest('8', '-0', 'divide'), /divide by zero/);
});
