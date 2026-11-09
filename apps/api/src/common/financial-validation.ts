import { BadRequestException } from '@nestjs/common';

export function requireMonth(value: unknown): string {
  const month = String(value ?? '');
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new BadRequestException('month must use YYYY-MM format');
  return month;
}
export function requireNonNegativeMoney(value: unknown, field: string): number {
  const amount = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(amount) || amount < 0) throw new BadRequestException(`${field} must be a finite non-negative amount`);
  return amount;
}
export function requireText(value: unknown, field: string, min = 1, max = 2000): string {
  const text = String(value ?? '').trim();
  if (text.length < min || text.length > max) throw new BadRequestException(`${field} must be between ${min} and ${max} characters`);
  return text;
}
export function parseBusinessDate(value: unknown, field = 'date'): string {
  const date = String(value ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new BadRequestException(`${field} must use YYYY-MM-DD`);
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw new BadRequestException(`${field} must be a real calendar date`);
  return date;
}