/**
 * KIZUNA Authentication & Form Validation Utilities
 * Kiểm tra tính hợp lệ của Email, Mật khẩu theo tiêu chuẩn bảo mật
 */

export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
  suggestedDomain?: string;
}

export interface PasswordCriteria {
  minLength: boolean;      // Tối thiểu 8 ký tự
  hasUpper: boolean;       // Ít nhất 1 chữ in hoa
  hasLower: boolean;       // Ít nhất 1 chữ thường
  hasNumber: boolean;      // Ít nhất 1 chữ số
  hasSpecial: boolean;     // Ít nhất 1 ký tự đặc biệt
}

export interface PasswordValidationResult {
  isValid: boolean;
  criteria: PasswordCriteria;
  error?: string;
  missingLabels: string[];
}

// Danh sách các dịch vụ email dùng 1 lần / rác thường gặp
const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com', 'temp-mail.org', '10minutemail.com', 'mailinator.com',
  'guerrillamail.com', 'throwawaymail.com', 'fakeinbox.com', 'sharklasers.com',
  'yopmail.com', 'dispostable.com', 'trashmail.com', 'getairmail.com',
  'mytemp.email', 'tempmailo.com', 'generator.email', 'fakemailgenerator.com',
  'crazymailing.com', 'nada.ltd', 'mohmal.com', 'burnermail.io', 'dropmail.me'
]);

// Danh sách phát hiện lỗi gõ sai tên miền Gmail và email thông dụng
const DOMAIN_TYPOS: Record<string, string> = {
  'gmai.com': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmaik.com': 'gmail.com',
  'gmail.cpm': 'gmail.com',
  'gmai.co': 'gmail.com',
  'yaho.com': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  'yaho.co': 'yahoo.com',
  'hotmial.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com'
};

/**
 * Kiểm tra định dạng email:
 * - Không để trống
 * - Phải có ký tự @ và duy nhất 1 ký tự @
 * - Không chứa khoảng trắng hoặc ký tự có dấu tiếng Việt
 * - Cấu trúc hợp lệ (tên@tênmiền.đuôi)
 * - Đuôi tên miền hợp lệ (tối thiểu 2 ký tự: .com, .vn, .edu.vn,...)
 * - Cảnh báo gõ sai chính tả tên miền (@gmail.com,...)
 * - Chặn email tạm thời / rác
 */
export function validateEmail(email: string): EmailValidationResult {
  const clean = (email || '').trim();

  if (!clean) {
    return { isValid: false, error: 'Vui lòng nhập địa chỉ email.' };
  }

  if (/\s/.test(clean)) {
    return { isValid: false, error: 'Địa chỉ email không được chứa khoảng trắng.' };
  }

  // Không cho phép ký tự tiếng Việt có dấu trong địa chỉ email
  if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(clean)) {
    return { isValid: false, error: 'Địa chỉ email không được chứa ký tự tiếng Việt có dấu.' };
  }

  if (!clean.includes('@')) {
    return { isValid: false, error: 'Email phải chứa ký tự "@" (Ví dụ: yourname@gmail.com).' };
  }

  const parts = clean.split('@');
  if (parts.length !== 2) {
    return { isValid: false, error: 'Địa chỉ email chỉ được chứa duy nhất 1 ký tự "@".' };
  }

  const [username, domain] = parts;
  if (!username || username.trim().length === 0) {
    return { isValid: false, error: 'Vui lòng nhập phần tên hộp thư trước ký tự "@".' };
  }

  if (!domain || domain.trim().length === 0) {
    return { isValid: false, error: 'Vui lòng nhập phần tên miền sau ký tự "@" (Ví dụ: gmail.com).' };
  }

  // Chuẩn regex email theo RFC
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(clean)) {
    return { isValid: false, error: 'Định dạng email không hợp lệ (Ví dụ hợp lệ: name@gmail.com).' };
  }

  // Kiểm tra domain có dấu chấm và đuôi miền
  const domainParts = domain.split('.');
  if (domainParts.length < 2 || domainParts.some(p => p.trim().length === 0)) {
    return { isValid: false, error: 'Tên miền email phải có phần đuôi hợp lệ (Ví dụ: .com, .vn, .edu.vn).' };
  }

  const tld = domainParts[domainParts.length - 1].toLowerCase();
  if (tld.length < 2) {
    return { isValid: false, error: 'Đuôi tên miền email không hợp lệ (cần tối thiểu 2 ký tự).' };
  }

  // Phát hiện gõ sai chính tả tên miền Gmail / Yahoo / Outlook
  const domainLower = domain.toLowerCase();
  if (DOMAIN_TYPOS[domainLower]) {
    const suggested = DOMAIN_TYPOS[domainLower];
    return {
      isValid: false,
      error: `Tên miền "@${domain}" có vẻ bị gõ sai chính tả. Bạn có muốn nhập "@${suggested}" không?`,
      suggestedDomain: suggested
    };
  }

  // Chặn hòm thư rác / dùng một lần
  if (DISPOSABLE_DOMAINS.has(domainLower)) {
    return {
      isValid: false,
      error: 'Vui lòng sử dụng địa chỉ email thực tế (như @gmail.com, @outlook.com, v.v.) để có thể nhận mã OTP.'
    };
  }

  return { isValid: true };
}

/**
 * Kiểm tra điều kiện mật khẩu khi đăng ký:
 * - Tối thiểu 8 ký tự
 * - Có chữ hoa (A-Z)
 * - Có chữ thường (a-z)
 * - Có chữ số (0-9)
 * - Có ký tự đặc biệt (!@#$%^&*...)
 */
export function validatePassword(password: string): PasswordValidationResult {
  const pwd = password || '';
  const criteria: PasswordCriteria = {
    minLength: pwd.length >= 8,
    hasUpper: /[A-Z]/.test(pwd),
    hasLower: /[a-z]/.test(pwd),
    hasNumber: /[0-9]/.test(pwd),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd)
  };

  const missingLabels: string[] = [];
  if (!criteria.minLength) missingLabels.push('tối thiểu 8 ký tự');
  if (!criteria.hasUpper) missingLabels.push('chữ in hoa (A-Z)');
  if (!criteria.hasLower) missingLabels.push('chữ thường (a-z)');
  if (!criteria.hasNumber) missingLabels.push('chữ số (0-9)');
  if (!criteria.hasSpecial) missingLabels.push('ký tự đặc biệt (!@#$%...)');

  const isValid = missingLabels.length === 0;
  const error = isValid
    ? undefined
    : `Mật khẩu chưa đủ điều kiện: cần thêm ${missingLabels.join(', ')}.`;

  return { isValid, criteria, error, missingLabels };
}
