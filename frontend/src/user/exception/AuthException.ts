export class KizunaException extends Error {
  public statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'KizunaException';
    this.statusCode = statusCode;
  }
}

export class AuthenticationException extends KizunaException {
  constructor(message = 'Xác thực tài khoản thất bại') {
    super(message, 401);
    this.name = 'AuthenticationException';
  }
}

export class ForbiddenAccessException extends KizunaException {
  constructor(message = 'Quyền truy cập bị từ chối (403 Forbidden)') {
    super(message, 403);
    this.name = 'ForbiddenAccessException';
  }
}

export class ResourceNotFoundException extends KizunaException {
  constructor(message = 'Tài nguyên không tồn tại') {
    super(message, 404);
    this.name = 'ResourceNotFoundException';
  }
}
