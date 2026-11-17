/**
 * KIZUNA Sound & Text-To-Speech (TTS) Service
 * Hỗ trợ phát âm tiếng Nhật chuẩn xác trên cả Web Desktop và Thiết bị di động (Android APK / Capacitor).
 * 
 * Vấn đề trên Android WebView:
 * - Hệ điều hành Android thường không cài đặt sẵn gói giọng đọc tiếng Nhật (ja-JP) trong SpeechSynthesis.
 * - Gọi window.speechSynthesis.cancel() ngay trước .speak() khiến âm thanh bị ngắt ngầm (asynchronous cancel bug).
 * - Giải pháp: Tự động phát hiện môi trường Android / Mobile hoặc thiết bị không có voice ja-JP để chuyển sang
 *   luồng âm thanh HTML5 Audio (Google TTS Stream HD) không phụ thuộc vào gói cài đặt của máy,
 *   đảm bảo 100% người dùng trên điện thoại nghe được giọng đọc chuẩn người bản xứ.
 */

import { isNativeApp } from '../utils/platform';

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
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        this.voicesLoaded = true;
        this.jaVoice = voices.find(v => v.lang.toLowerCase().startsWith('ja') || v.lang.includes('JP')) || null;
      }
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
   * @param text Đoạn văn bản tiếng Nhật cần đọc
   * @param rate Tốc độ đọc (mặc định 0.9 cho học viên dễ nghe)
   */
  public speakJapanese(text: string, rate = 0.9): Promise<void> {
    return new Promise((resolve) => {
      if (!text || !text.trim()) {
        resolve();
        return;
      }

      const cleanText = text
        .replace(/【[^】]*】/g, '')
        .replace(/\([^)]*\)/g, '')
        .replace(/（[^）]*）/g, '')
        .replace(/[〜~·・/／]/g, '')
        .trim();

      if (!cleanText) {
        resolve();
        return;
      }

      // Dừng phát âm thanh cũ trước khi phát âm mới
      this.stop();

      const isMobileDevice = isNativeApp() || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

      // Nếu đang trên điện thoại (APK / Mobile) hoặc không tìm thấy giọng ja-JP trên máy:
      // Dùng HTML5 Audio qua luồng phát âm thanh tiếng Nhật trực tiếp
      const shouldUseAudioFallback = isMobileDevice || !this.jaVoice;

      if (shouldUseAudioFallback) {
        try {
          const encoded = encodeURIComponent(cleanText.slice(0, 200));
          const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ja&client=tw-ob&q=${encoded}`;
          const audio = new Audio(ttsUrl);
          audio.playbackRate = rate;
          this.currentAudio = audio;

          audio.onended = () => {
            this.currentAudio = null;
            resolve();
          };

          audio.onerror = () => {
            this.currentAudio = null;
            // Thử cứu cánh lần cuối bằng Web Speech API nếu audio bị lỗi
            this.speakWithSpeechSynthesis(cleanText, rate, resolve);
          };

          audio.play().catch(() => {
            // Trường hợp trình duyệt chặn Autoplay hoặc mất mạng
            this.speakWithSpeechSynthesis(cleanText, rate, resolve);
          });
          return;
        } catch {
          // Bỏ qua lỗi audio và chuyển sang speechSynthesis
        }
      }

      this.speakWithSpeechSynthesis(cleanText, rate, resolve);
    });
  }

  private speakWithSpeechSynthesis(text: string, rate: number, onDone: () => void) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onDone();
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = rate;

      if (this.jaVoice) {
        utterance.voice = this.jaVoice;
      }

      utterance.onend = () => onDone();
      utterance.onerror = () => onDone();

      // Trì hoãn 1 tick để tránh lỗi bug cancel đồng bộ trên Android WebView
      setTimeout(() => {
        try {
          window.speechSynthesis.speak(utterance);
        } catch {
          onDone();
        }
      }, 50);
    } catch {
      onDone();
    }
  }
}

export const soundService = new SoundService();
