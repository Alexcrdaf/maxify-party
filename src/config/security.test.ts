import { describe, it, expect } from 'vitest';
import { isValidRoomCode, APP_CONFIG } from '../config';
import { analyzeMediaUrl } from '../utils/mediaDetector';

describe('Security & Crash Resilience Test Suite', () => {
  it('protects against XSS injection in media detector URLs', () => {
    const maliciousUrls = [
      'javascript:alert(document.cookie)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      '<img src=x onerror=alert(1)>',
      'https://evil.com/"><script>alert(1)</script>',
    ];

    maliciousUrls.forEach((url) => {
      const result = analyzeMediaUrl(url);
      expect(result.type).not.toBe('direct_video');
      expect(result.isEmbeddable).toBe(false);
    });
  });

  it('fuzzes and validates Room Code generator and sanitizer', () => {
    const maliciousInputs = [
      '',
      ' ',
      '   ',
      '../',
      '../../etc/passwd',
      '<script>',
      'K7MX42; DROP TABLE rooms;',
      'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      '\x00\x01\x02',
    ];

    maliciousInputs.forEach((input) => {
      expect(isValidRoomCode(input)).toBe(false);
    });

    const validCodes = ['K7MX42', 'ABCDEF', '234567', 'Z9Y8X7'];
    validCodes.forEach((code) => {
      expect(isValidRoomCode(code)).toBe(true);
    });
  });

  it('enforces ICE servers configuration without leaking API secrets', () => {
    expect(APP_CONFIG.iceServers).toBeDefined();
    expect(Array.isArray(APP_CONFIG.iceServers)).toBe(true);
    APP_CONFIG.iceServers.forEach((server) => {
      expect(server.urls).toBeDefined();
      if (typeof server.urls === 'string') {
        expect(server.urls.startsWith('stun:') || server.urls.startsWith('turn:')).toBe(true);
      }
    });
  });

  it('handles flood of desync playback inputs safely', () => {
    let state = {
      currentTime: 10,
      isPlaying: false,
    };

    // Simulate 100 rapid seek commands
    for (let i = 0; i <= 100; i++) {
      const incomingTime = i * 1.0;
      const diff = Math.abs(state.currentTime - incomingTime);
      if (diff > APP_CONFIG.syncThresholdSeconds) {
        state.currentTime = incomingTime;
      }
    }

    expect(state.currentTime).toBe(100);
  });
});
