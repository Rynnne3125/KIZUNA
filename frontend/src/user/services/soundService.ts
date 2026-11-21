/**
 * KIZUNA Sound & Text-To-Speech (TTS) Service
 * Hỗ trợ phát âm tiếng Nhật chuẩn xác 100% trên cả Web Desktop và Thiết bị di động (Android APK / Capacitor).
 * 
 * Các nâng cấp kỹ thuật triệt để:
 * 1. Chống phát trùng âm thanh (Single Audio Channel với Session ID Generation):
 *    - Khi bắt đầu phát bất kỳ âm thanh mới nào, ngay lập tức huỷ bỏ toàn bộ các luồng âm thanh cũ (cả HTMLAudioElement và SpeechSynthesis).
 *    - Các callback, timeout hay fallback của âm thanh trước sẽ bị vô hiệu hoá lập tức thông qua session token, không bao giờ xảy ra hiện tượng 2 câu vang tiếng đè lên nhau.
 * 2. Tự động ngắt khi thoát màn hình / đóng modal / chuyển tab:
 *    - Hỗ trợ phương thức stop() triệt để.
 *    - Lắng nghe và phát event kizuna_sound_started / kizuna_sound_stopped để UI cập nhật trạng thái icon/nút (ví dụ nút "Dừng nghe bài đọc").
 * 3. Hỗ trợ toggle phát / dừng:
 *    - Đang phát mà bấm lại sẽ lập tức dừng lại thay vì phát lại từ đầu.
 * 4. Fallback đa tầng (Google TTS HD -> Google APIs TTS -> Youdao Japanese -> SpeechSynthesis) với No-Referrer.
 */

import { isNativeApp } from '../utils/platform';

/**
 * Chuẩn hoá văn bản tiếng Nhật trước khi gửi đến bộ đọc TTS
 */
export function normalizeJapaneseTextForSpeech(text: string): string {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text
    // 1. Loại bỏ các thẻ HTML / ruby nếu có
    .replace(/<rt>.*?<\/rt>/gi, '')
    .replace(/<[^>]+>/g, '')
    // 2. Chữ Hán kèm Furigana trong ngoặc: ưu tiên đọc âm Furigana (ví dụ 田中（たなか） -> たなか)
    .replace(/([一-龯]+)[（(]([ぁ-んァ-ヶ]+)[）)]/g, '$2')
    // 3. Loại bỏ các chú thích tiếng Việt trong ngoặc: (phương tiện), (nơi hành động), (khẳng định)...
    .replace(/[（(][^）)]*[a-zA-Zà-ỹÀ-Ỹ\u00C0-\u1EF9][^）)]*[）)]/g, '')
    // 4. Loại bỏ các từ chữ Latin / tiếng Việt trong câu tiếng Nhật
    .replace(/[a-zA-Zà-ỹÀ-Ỹ\u00C0-\u1EF9]+/g, ' ')
    // 5. Chuẩn hoá Okurigana trong Kanji: ひと.つ -> ひとつ, た.べる -> たべる, い.く -> いく
    .replace(/([ぁ-んァ-ヶ])\.([ぁ-んァ-ヶ])/g, '$1$2')
    // 6. Xử lý tiền tố / hậu tố trong từ điển Kanji: -び -> び, -か -> か, お- -> お
    .replace(/(^|[\s、,])[-–—]([ぁ-んァ-ヶ])/g, '$1$2')
    // 7. Chuẩn hoá các dấu phân cách, dấu cộng, bằng sang dấu phẩy tiếng Nhật để ngắt nhịp tự nhiên
    .replace(/[/／·・,+=＋＝]/g, '、')
    // 8. Xoá ký hiệu gợn sóng, ngoặc kép, ngoặc vuông thừa
    .replace(/[〜~()（）\s]+/g, ' ')
    .replace(/【[^】]*】/g, '')
    .replace(/[「」『』\[\]]/g, '')
    // 9. Gộp dấu phẩy và khoảng trắng liên tiếp
    .replace(/、+/g, '、')
    .replace(/^、|、$|^[\s、]+|[\s、]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned;
}

class SoundService {
  private currentAudio: HTMLAudioElement | null = null;
  private jaVoice: SpeechSynthesisVoice | null = null;
  private voicesLoaded = false;
  private sessionId = 0;
  private isPlayingAudio = false;
  private currentSpokenText = '';

  constructor() {
    this.initVoices();
  }

  private initVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const findVoice = () => {
      try {
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          this.voicesLoaded = true;
          this.jaVoice = voices.find(v => v.lang.toLowerCase().startsWith('ja') || v.lang.includes('JP')) || null;
        }
      } catch {}
    };

    findVoice();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = findVoice;
    }
  }

  /**
   * Kiểm tra xem hiện tại có đang phát âm thanh không
   */
  public isSpeaking(): boolean {
    return this.isPlayingAudio;
  }

  /**
   * Lấy đoạn văn bản đang được phát hiện tại
   */
  public getCurrentText(): string {
    return this.currentSpokenText;
  }

  /**
   * Dừng toàn bộ âm thanh hoặc giọng đọc đang phát ngay lập tức
   */
  public stop() {
    // Tăng session ID để vô hiệu hóa ngay lập tức mọi callback/timeout cũ đang chờ
    this.sessionId++;
    this.isPlayingAudio = false;
    this.currentSpokenText = '';

    if (this.currentAudio) {
      try {
        this.currentAudio.onended = null;
        this.currentAudio.onerror = null;
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio.removeAttribute('src');
        this.currentAudio.load();
      } catch {}
      this.currentAudio = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('kizuna_sound_stopped'));
    }
  }

  /**
   * Phát âm hoặc dừng câu tiếng Nhật (nếu đang phát chính câu đó thì dừng lại)
   */
  public toggleSpeak(rawText: string, rate = 0.9): Promise<void> {
    if (this.isPlayingAudio && this.currentSpokenText === rawText.trim()) {
      this.stop();
      return Promise.resolve();
    }
    return this.speakJapanese(rawText, rate);
  }

  /**
   * Phát âm câu / từ tiếng Nhật chuẩn xác, đảm bảo không trùng lặp âm thanh
   * @param rawText Đoạn văn bản tiếng Nhật cần đọc
   * @param rate Tốc độ đọc (mặc định 0.9 cho học viên dễ nghe)
   */
  public speakJapanese(rawText: string, rate = 0.9): Promise<void> {
    return new Promise((resolve) => {
      // 1. Dừng ngay lập tức âm thanh cũ
      this.stop();

      if (!rawText || !rawText.trim()) {
        resolve();
        return;
      }

      // Chuẩn hoá âm đọc tiếng Nhật hoàn chỉnh
      const cleanText = normalizeJapaneseTextForSpeech(rawText);

      if (!cleanText) {
        resolve();
        return;
      }

      const activeSession = this.sessionId;
      this.isPlayingAudio = true;
      this.currentSpokenText = rawText.trim();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('kizuna_sound_started', { detail: { text: rawText.trim() } }));
      }

      const handleDone = () => {
        if (this.sessionId === activeSession) {
          this.isPlayingAudio = false;
          this.currentSpokenText = '';
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('kizuna_sound_stopped'));
          }
        }
        resolve();
      };

      const isMobileDevice = isNativeApp() || (typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));

      // Trên điện thoại (Android APK / iOS / Mobile) hoặc máy tính không có voice ja-JP offline:
      // Ưu tiên Audio Stream không gửi Referer (Google TTS HD + Google APIs + Youdao ja)
      if (isMobileDevice || !this.jaVoice) {
        this.playAudioStream(cleanText, rate, handleDone, activeSession);
        return;
      }

      // Trên máy tính có cài voice ja-JP: Ưu tiên phát bằng SpeechSynthesis, nếu lỗi tự fallback sang Audio Stream
      this.speakWithSpeechSynthesis(cleanText, rate, (success) => {
        if (this.sessionId !== activeSession) {
          resolve();
          return;
        }
        if (!success) {
          this.playAudioStream(cleanText, rate, handleDone, activeSession);
        } else {
          handleDone();
        }
      }, activeSession);
    });
  }

  /**
   * Phát âm thanh qua Audio Stream đa tầng với cơ chế No-Referrer & Fallback tự động
   */
  private playAudioStream(cleanText: string, rate: number, onDone: () => void, activeSession: number) {
    if (this.sessionId !== activeSession) return;

    // Cắt chuỗi an toàn dưới 190 ký tự (giới hạn của TTS GET query)
    let safeSlice = cleanText.slice(0, 190);
    const lastPunctuation = Math.max(safeSlice.lastIndexOf('。'), safeSlice.lastIndexOf('、'), safeSlice.lastIndexOf(' '));
    if (safeSlice.length === 190 && lastPunctuation > 100) {
      safeSlice = safeSlice.slice(0, lastPunctuation + 1);
    }

    const encoded = encodeURIComponent(safeSlice);
    const sources: string[] = [
      `https://translate.google.com/translate_tts?ie=UTF-8&client=gtx&tl=ja&q=${encoded}`,
      `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&tl=ja&q=${encoded}`,
    ];

    if (safeSlice.length <= 15) {
      sources.push(`https://dict.youdao.com/dictvoice?audio=${encoded}&le=ja`);
    }

    let sourceIndex = 0;

    const tryNext = () => {
      // Nếu session đã bị thay thế hoặc đã dừng, dừng lại ngay lập tức
      if (this.sessionId !== activeSession) {
        return;
      }

      if (sourceIndex >= sources.length) {
        // Cả các luồng audio đều không tải được, thử cứu cánh cuối cùng bằng SpeechSynthesis
        this.speakWithSpeechSynthesis(cleanText, rate, () => onDone(), activeSession);
        return;
      }

      const url = sources[sourceIndex++];
      try {
        const audio = document.createElement('audio');
        audio.referrerPolicy = 'no-referrer';
        audio.preload = 'auto';
        audio.src = url;
        audio.playbackRate = rate;
        this.currentAudio = audio;

        let isEnded = false;
        const cleanupAndFinish = () => {
          if (this.sessionId !== activeSession) return;
          if (!isEnded) {
            isEnded = true;
            this.currentAudio = null;
            onDone();
          }
        };

        audio.onended = cleanupAndFinish;

        audio.onerror = () => {
          if (this.sessionId !== activeSession) return;
          this.currentAudio = null;
          tryNext();
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            if (this.sessionId !== activeSession) return;
            this.currentAudio = null;
            tryNext();
          });
        }
      } catch {
        if (this.sessionId !== activeSession) return;
        this.currentAudio = null;
        tryNext();
      }
    };

    tryNext();
  }

  /**
   * Phát âm thanh qua Web SpeechSynthesis API
   */
  private speakWithSpeechSynthesis(text: string, rate: number, onDone: (success: boolean) => void, activeSession: number) {
    if (this.sessionId !== activeSession) return;

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onDone(false);
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = rate;

      if (this.jaVoice) {
        utterance.voice = this.jaVoice;
      }

      let finished = false;
      utterance.onend = () => {
        if (this.sessionId !== activeSession) return;
        if (!finished) {
          finished = true;
          onDone(true);
        }
      };
      utterance.onerror = () => {
        if (this.sessionId !== activeSession) return;
        if (!finished) {
          finished = true;
          onDone(false);
        }
      };

      setTimeout(() => {
        if (this.sessionId !== activeSession) return;
        try {
          window.speechSynthesis.speak(utterance);
        } catch {
          if (!finished) {
            finished = true;
            onDone(false);
          }
        }
      }, 50);
    } catch {
      onDone(false);
    }
  }
}

export const soundService = new SoundService();
