export class AdminException extends Error {
  public statusCode: number;

  constructor(message: string, statusCode = 403) {
    super(message);
    this.name = 'AdminException';
    this.statusCode = statusCode;
  }
}

export class AdminAccessDeniedException extends AdminException {
  constructor(message = 'Bạn không có quyền quản trị viên (ROLE_ADMIN)') {
    super(message, 403);
    this.name = 'AdminAccessDeniedException';
  }
}

export class AdminOperationFailedException extends AdminException {
  constructor(message = 'Thao tác quản trị thất bại') {
    super(message, 500);
    this.name = 'AdminOperationFailedException';
  }
}
