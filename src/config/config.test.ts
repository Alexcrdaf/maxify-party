import { describe, it, expect } from 'vitest';
import { generateRoomCode, isValidRoomCode } from './index';

describe('Room Code Utilities', () => {
  it('should generate a 6-character room code', () => {
    const code = generateRoomCode();
    expect(code).toBeDefined();
    expect(code.length).toBe(6);
  });

  it('should only use alphanumeric characters excluding ambiguous symbols (0, O, 1, I)', () => {
    const code = generateRoomCode();
    expect(isValidRoomCode(code)).toBe(true);
    expect(code).not.toMatch(/[01OI]/);
  });

  it('should validate valid room codes correctly', () => {
    expect(isValidRoomCode('K7MX42')).toBe(true);
    expect(isValidRoomCode('ABCD')).toBe(true);
    expect(isValidRoomCode('23456789')).toBe(true);
  });

  it('should reject invalid or empty codes', () => {
    expect(isValidRoomCode('')).toBe(false);
    expect(isValidRoomCode('A')).toBe(false);
    expect(isValidRoomCode('INVALID#CODE!')).toBe(false);
  });
});
