/**
 * Media Source Detector & Security Validator
 */

export type SourceType = 'direct_video' | 'youtube' | 'protected_service' | 'generic_web' | 'invalid';

export interface SourceAnalysis {
  type: SourceType;
  url: string;
  isEmbeddable: boolean;
  requiresScreenShare: boolean;
  noticeTitle?: string;
  noticeDescription?: string;
  directStreamUrl?: string;
}

export function analyzeMediaUrl(inputUrl: string): SourceAnalysis {
  const trimmed = inputUrl.trim();
  if (!trimmed) {
    return {
      type: 'invalid',
      url: '',
      isEmbeddable: false,
      requiresScreenShare: false,
      noticeTitle: 'Пустая ссылка',
      noticeDescription: 'Пожалуйста, введите URL адрес источника.',
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      type: 'invalid',
      url: trimmed,
      isEmbeddable: false,
      requiresScreenShare: false,
      noticeTitle: 'Некорректный адрес',
      noticeDescription: 'Указана недействительная ссылка. Убедитесь, что она начинается с https://',
    };
  }

  const pathname = parsed.pathname.toLowerCase();
  const hostname = parsed.hostname.toLowerCase();

  // 1. Direct HTML5 Video formats
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.m4v', '.mov'];
  const hasDirectExtension = videoExtensions.some((ext) => pathname.endsWith(ext));

  if (hasDirectExtension) {
    return {
      type: 'direct_video',
      url: trimmed,
      directStreamUrl: trimmed,
      isEmbeddable: true,
      requiresScreenShare: false,
    };
  }

  // 2. YouTube detection
  if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
    let videoId = '';
    if (hostname.includes('youtu.be')) {
      videoId = pathname.slice(1);
    } else {
      videoId = parsed.searchParams.get('v') || '';
    }

    return {
      type: 'youtube',
      url: trimmed,
      isEmbeddable: Boolean(videoId),
      requiresScreenShare: false,
      noticeTitle: 'YouTube источник',
      noticeDescription:
        'YouTube ролики можно смотреть синхронно через официальный встраиваемый плеер либо через трансляцию вкладки.',
    };
  }

  // 3. Known DRM protected streaming services (Netflix, Kinopoisk, Кинопоиск, IVI, Disney+, HBO, etc.)
  const protectedDomains = [
    'netflix.com',
    'kinopoisk.ru',
    'hd.kinopoisk.ru',
    'ivi.ru',
    'okko.tv',
    'amediateka.ru',
    'disneyplus.com',
    'max.com',
    'hbo.com',
    'primevideo.com',
    'apple.com/apple-tv-plus',
  ];

  if (protectedDomains.some((d) => hostname.includes(d))) {
    return {
      type: 'protected_service',
      url: trimmed,
      isEmbeddable: false,
      requiresScreenShare: true,
      noticeTitle: 'Защищённый медиасервис (DRM)',
      noticeDescription:
        'Данный сервис защищён технологиями DRM (Widevine/HDCP) и политиками безопасности CSP. Прямое встраивание в сторонние сайты заблокировано платформой. Для совместного просмотра используйте режим «Трансляция вкладки». Примечание: на некоторых браузерах может потребоваться отключить аппаратное ускорение, чтобы избежать чёрного экрана.',
    };
  }

  // 4. Generic web page
  return {
    type: 'generic_web',
    url: trimmed,
    isEmbeddable: false,
    requiresScreenShare: true,
    noticeTitle: 'Внешний веб-сайт',
    noticeDescription:
      'Веб-страницы обычно блокируют встраивание (X-Frame-Options/CSP). Рекомендуется открыть видео на источнике и запустить режим «Транслировать вкладку» со звуком.',
  };
}
