import { describe, it, expect } from 'vitest';
import {
  generateRoomCode,
  isValidRoomCode,
  extractRoomCode,
  computeLivePlaybackState,
} from './index';

describe('Room Code & Multi-Viewer Sync Utilities', () => {
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

  it('should extract room code from full invite URLs', () => {
    expect(extractRoomCode('https://alexcrdaf.github.io/maxify-party/?room=k7mx42')).toBe('K7MX42');
    expect(extractRoomCode('https://example.com/#room=ab34cd&foo=1')).toBe('AB34CD');
    expect(extractRoomCode('  z9y8x7  ')).toBe('Z9Y8X7');
  });

  it('should advance live playback currentTime for late-joining viewers when playing', () => {
    const fiveSecondsAgo = Date.now() - 5000;
    const synced = computeLivePlaybackState({
      sourceUrl: 'https://example.com/movie.mp4',
      sourceType: 'direct_video',
      isPlaying: true,
      currentTime: 120,
      playbackRate: 1,
      lastUpdated: fiveSecondsAgo,
      sentBy: 'host',
    });

    expect(synced.currentTime).toBeGreaterThanOrEqual(124.8);
    expect(synced.currentTime).toBeLessThan(126.5);
  });
});
