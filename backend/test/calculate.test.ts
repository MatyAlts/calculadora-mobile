import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculate, CalculationError } from '../src/calculate.js';

test('calculates the four operations, negative numbers, zero, and decimals', () => {
  for (const [operation, result] of [['add', 12], ['subtract', 4], ['multiply', 32], ['divide', 2]]) {
    assert.equal(calculate({ a: 8, b: 4, operation }), result);
  }
  assert.equal(calculate({ a: -2.5, b: 0.5, operation: 'add' }), -2);
  assert.equal(calculate({ a: 0, b: 5, operation: 'divide' }), 0);
  assert.ok(Math.abs(calculate({ a: 0.1, b: 0.2, operation: 'add' }) - 0.3) < 1e-10);
});

test('rejects invalid bodies and non-finite operands without coercion', () => {
  const invalid: unknown[] = [null, undefined, [], 4, {}, { a: 1, b: 2, operation: 'add', extra: true }];
  for (const value of ['1', '', null, false, NaN, Infinity, -Infinity]) {
    invalid.push({ a: value, b: 2, operation: 'add' });
    invalid.push({ a: 2, b: value, operation: 'add' });
  }
  for (const input of invalid) {
    assert.throws(() => calculate(input), { code: 'INVALID_INPUT' });
  }
});

test('rejects unsupported operations, zero divisors, and overflow', () => {
  assert.throws(() => calculate({ a: 1, b: 2, operation: 'power' }), CalculationError);
  for (const b of [0, -0]) {
    assert.throws(() => calculate({ a: 1, b, operation: 'divide' }), { code: 'DIVISION_BY_ZERO' });
  }
  assert.throws(() => calculate({ a: 1e308, b: 1e308, operation: 'multiply' }), { code: 'RESULT_OUT_OF_RANGE' });
});
