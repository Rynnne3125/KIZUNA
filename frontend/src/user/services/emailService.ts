import emailjs from '@emailjs/browser';

export const OFFICIAL_SENDER_EMAIL = 'phongtt.23it@vku.udn.vn';
const BACKEND_API_URL = 'http://localhost:3000/api/v1';

export interface SendOtpParams {
  toEmail: string;
  toName: string;
  otpCode: string;
}

export interface SendOtpResult {
  success: boolean;
  message: string;
  sender: string;
}

export const emailService = {
  /**
   * Email chính thức được dùng để gửi mã xác thực OTP
   */
  getSenderEmail(): string {
    return OFFICIAL_SENDER_EMAIL;
  },

  /**
   * Gửi mã OTP xác thực thực tế đến địa chỉ email của học viên
   */
  async sendOtpEmail({ toEmail, toName, otpCode }: SendOtpParams): Promise<SendOtpResult> {
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

    // 1. Gửi qua EmailJS Cloud nếu đã thiết lập các biến trong frontend/.env
    if (serviceId && templateId && publicKey) {
      try {
        const templateParams = {
          email: toEmail, // EmailJS template {{email}}
          to_email: toEmail, // EmailJS template {{to_email}}
          user_email: toEmail,
          to: toEmail,
          recipient: toEmail,
          to_name: toName || 'Học viên KIZUNA',
          user_name: toName || 'Học viên KIZUNA',
          name: toName || 'Học viên KIZUNA',
          otp_code: otpCode, // EmailJS template {{otp_code}}
          otp: otpCode,
          code: otpCode,
          passcode: otpCode,
          sender_email: OFFICIAL_SENDER_EMAIL,
          from_name: 'KIZUNA - Học tiếng Nhật',
          reply_to: OFFICIAL_SENDER_EMAIL,
          app_name: 'KIZUNA Japanese Learning Platform',
          time: '5 phút',
          expires_in: '5 phút'
        };

        const response = await emailjs.send(
          serviceId,
          templateId,
          templateParams,
          publicKey
        );

        console.log('[EmailJS] Gửi email OTP thành công:', response.status, response.text);
        return {
          success: true,
          message: `Mã OTP đã được gửi đến hộp thư ${toEmail} từ ${OFFICIAL_SENDER_EMAIL}.`,
          sender: OFFICIAL_SENDER_EMAIL
        };
      } catch (err: any) {
        console.error('[EmailJS] Lỗi gửi email chi tiết:', err);
        const detail = err?.text || err?.message || 'Lỗi gửi qua dịch vụ EmailJS';
        throw new Error(`Không thể gửi email OTP: ${detail}. Vui lòng kiểm tra lại cấu hình EmailJS.`);
      }
    }

    // 2. Gửi qua Backend Spring Boot API (JavaMailSender / Google Workspace SMTP) nếu không dùng EmailJS
    try {
      const response = await fetch(`${BACKEND_API_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: toEmail,
          fullName: toName,
          code: otpCode,
          sender: OFFICIAL_SENDER_EMAIL
        })
      });

      if (response.ok) {
        return {
          success: true,
          message: `Mã OTP đã được gửi đến hộp thư ${toEmail} từ ${OFFICIAL_SENDER_EMAIL}.`,
          sender: OFFICIAL_SENDER_EMAIL
        };
      }
    } catch {
      // Backend server không hoạt động trên localhost:3000
    }

    throw new Error(`Chưa hoàn tất cấu hình gửi mail trong .env. Vui lòng kiểm tra VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, VITE_EMAILJS_PUBLIC_KEY.`);
  }
};
