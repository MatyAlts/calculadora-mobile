export type Operation = 'add' | 'subtract' | 'multiply' | 'divide';
export type CalculationRequest = { a: number; b: number; operation: Operation };

export function parseOperand(text: string, label: string): number {
  const normalized = text.trim().replace(',', '.');
  if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized)) {
    throw new Error(`${label}: enter a number, such as -2 or 3.5. Do not use thousands separators.`);
  }
  const number = Number(normalized);
  if (!Number.isFinite(number)) throw new Error(`${label}: the number is too large.`);
  return number;
}

export function prepareRequest(first: string, second: string, operation: Operation): CalculationRequest {
  const a = parseOperand(first, 'First number');
  const b = parseOperand(second, 'Second number');
  if (operation === 'divide' && b === 0) throw new Error('Cannot divide by zero.');
  return { a, b, operation };
}
