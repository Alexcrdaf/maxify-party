import { describe, it, expect } from 'vitest';
import { analyzeMediaUrl } from './mediaDetector';

describe('Media Detector', () => {
  it('identifies direct mp4 and webm videos as embeddable', () => {
    const mp4Result = analyzeMediaUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
    expect(mp4Result.type).toBe('direct_video');
    expect(mp4Result.isEmbeddable).toBe(true);
    expect(mp4Result.requiresScreenShare).toBe(false);

    const webmResult = analyzeMediaUrl('https://example.com/movie.webm');
    expect(webmResult.type).toBe('direct_video');
    expect(webmResult.isEmbeddable).toBe(true);
  });

  it('detects DRM protected streaming services like Netflix and Kinopoisk', () => {
    const netflixResult = analyzeMediaUrl('https://www.netflix.com/watch/80057281');
    expect(netflixResult.type).toBe('protected_service');
    expect(netflixResult.isEmbeddable).toBe(false);
    expect(netflixResult.requiresScreenShare).toBe(true);

    const kinopoiskResult = analyzeMediaUrl('https://hd.kinopoisk.ru/film/4365327');
    expect(kinopoiskResult.type).toBe('protected_service');
    expect(kinopoiskResult.requiresScreenShare).toBe(true);
  });

  it('handles invalid or empty URLs safely', () => {
    const emptyResult = analyzeMediaUrl('');
    expect(emptyResult.type).toBe('invalid');

    const invalidResult = analyzeMediaUrl('not-a-valid-url');
    expect(invalidResult.type).toBe('invalid');
  });
});
