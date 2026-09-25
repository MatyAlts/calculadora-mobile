export class CalculationError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

export function calculate(input: unknown): number {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new CalculationError('INVALID_INPUT', 'Send an object with a, b, and operation.');
  }

  const body = input as Record<string, unknown>;
  if (Object.keys(body).some((key) => !['a', 'b', 'operation'].includes(key))) {
    throw new CalculationError('INVALID_INPUT', 'Only a, b, and operation are allowed.');
  }
  const { a, b, operation } = body;
  if (typeof a !== 'number' || !Number.isFinite(a) ||
      typeof b !== 'number' || !Number.isFinite(b)) {
    throw new CalculationError('INVALID_INPUT', 'Both operands must be finite numbers.');
  }

  let result: number;
  switch (operation) {
    case 'add': result = a + b; break;
    case 'subtract': result = a - b; break;
    case 'multiply': result = a * b; break;
    case 'divide':
      if (b === 0) {
        throw new CalculationError('DIVISION_BY_ZERO', 'Cannot divide by zero.');
      }
      result = a / b;
      break;
    default:
      throw new CalculationError('INVALID_OPERATION', 'Choose add, subtract, multiply, or divide.');
  }
  if (!Number.isFinite(result)) {
    throw new CalculationError('RESULT_OUT_OF_RANGE', 'The result is outside the supported numeric range.');
  }
  return result;
}
