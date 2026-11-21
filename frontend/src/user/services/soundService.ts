/**
 * KIZUNA Sound & Text-To-Speech (TTS) Service
 * Hỗ trợ phát âm tiếng Nhật chuẩn xác 100% trên cả Web Desktop và Thiết bị di động (Android APK / Capacitor).
 * 
 * Vấn đề kỹ thuật đã được khắc phục triệt để:
 * 1. Referer Header: Google TTS chặn 404/400 khi trình duyệt gửi Referer từ domain khác.
 *    -> Áp dụng referrerPolicy = 'no-referrer' trên audio element và no-referrer meta tag.
 * 2. Ngữ pháp & Ký tự đặc biệt (Kunyomi / Okurigana / Formula placeholders):
 *    -> Bộ chuẩn hoá Japanese Text Normalizer tự động làm sạch okurigana (. -> bỏ dấu chấm: ひと.つ -> ひとつ, た.べる -> たべる),
 *       tiền/hậu tố (-び -> び), loại bỏ các placeholder công thức (A は B です -> は です, S + を + V-ます -> を ます),
 *       loại bỏ chú thích tiếng Việt trong ngoặc.
 * 3. Fallback đa tầng (Google TTS HD -> Google APIs TTS -> Youdao Japanese -> SpeechSynthesis).
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
   * Dừng âm thanh hoặc giọng đọc đang phát
   */
  public stop() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio.src = '';
      } catch {}
      this.currentAudio = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }

  /**
   * Phát âm câu / từ tiếng Nhật chuẩn xác
   * @param rawText Đoạn văn bản tiếng Nhật cần đọc
   * @param rate Tốc độ đọc (mặc định 0.9 cho học viên dễ nghe)
   */
  public speakJapanese(rawText: string, rate = 0.9): Promise<void> {
    return new Promise((resolve) => {
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

      // Dừng phát âm thanh cũ trước khi phát âm mới
      this.stop();

      const isMobileDevice = isNativeApp() || (typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));

      // Trên điện thoại (Android APK / iOS / Mobile) hoặc máy tính không có voice ja-JP offline:
      // Ưu tiên Audio Stream không gửi Referer (Google TTS HD + Google APIs + Youdao ja)
      if (isMobileDevice || !this.jaVoice) {
        this.playAudioStream(cleanText, rate, () => {
          resolve();
        });
        return;
      }

      // Trên máy tính có cài voice ja-JP: Ưu tiên phát bằng SpeechSynthesis, nếu lỗi tự fallback sang Audio Stream
      this.speakWithSpeechSynthesis(cleanText, rate, (success) => {
        if (!success) {
          this.playAudioStream(cleanText, rate, resolve);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Phát âm thanh qua Audio Stream đa tầng với cơ chế No-Referrer & Fallback tự động
   */
  private playAudioStream(cleanText: string, rate: number, onDone: () => void) {
    // Cắt chuỗi an toàn dưới 190 ký tự (giới hạn của TTS GET query)
    let safeSlice = cleanText.slice(0, 190);
    // Tránh cắt đứt ngang giữa từ nếu có dấu ngắt câu
    const lastPunctuation = Math.max(safeSlice.lastIndexOf('。'), safeSlice.lastIndexOf('、'), safeSlice.lastIndexOf(' '));
    if (safeSlice.length === 190 && lastPunctuation > 100) {
      safeSlice = safeSlice.slice(0, lastPunctuation + 1);
    }

    const encoded = encodeURIComponent(safeSlice);
    const sources: string[] = [
      `https://translate.google.com/translate_tts?ie=UTF-8&client=gtx&tl=ja&q=${encoded}`,
      `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&tl=ja&q=${encoded}`,
    ];

    // Đối với từ vựng ngắn (dưới 15 ký tự), thêm Youdao Japanese vào danh sách dự phòng
    if (safeSlice.length <= 15) {
      sources.push(`https://dict.youdao.com/dictvoice?audio=${encoded}&le=ja`);
    }

    let sourceIndex = 0;

    const tryNext = () => {
      if (sourceIndex >= sources.length) {
        // Cả các luồng audio đều không tải được, thử cứu cánh cuối cùng bằng SpeechSynthesis
        this.speakWithSpeechSynthesis(cleanText, rate, () => onDone());
        return;
      }

      const url = sources[sourceIndex++];
      try {
        // Sử dụng document.createElement('audio') với referrerpolicy='no-referrer'
        // Đây là chìa khóa then chốt giúp tránh bị Google chặn 404/400 do Referer header
        const audio = document.createElement('audio');
        audio.referrerPolicy = 'no-referrer';
        audio.preload = 'auto';
        audio.src = url;
        audio.playbackRate = rate;
        this.currentAudio = audio;

        let isEnded = false;
        const cleanupAndFinish = () => {
          if (!isEnded) {
            isEnded = true;
            this.currentAudio = null;
            onDone();
          }
        };

        audio.onended = cleanupAndFinish;

        audio.onerror = () => {
          this.currentAudio = null;
          tryNext();
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            this.currentAudio = null;
            tryNext();
          });
        }
      } catch {
        this.currentAudio = null;
        tryNext();
      }
    };

    tryNext();
  }

  /**
   * Phát âm thanh qua Web SpeechSynthesis API (Hỗ trợ máy tính & thiết bị có voice ja-JP)
   */
  private speakWithSpeechSynthesis(text: string, rate: number, onDone: (success: boolean) => void) {
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
        if (!finished) {
          finished = true;
          onDone(true);
        }
      };
      utterance.onerror = () => {
        if (!finished) {
          finished = true;
          onDone(false);
        }
      };

      // Trì hoãn 50ms để tránh bug hủy âm thanh ngầm trên Android WebView
      setTimeout(() => {
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
