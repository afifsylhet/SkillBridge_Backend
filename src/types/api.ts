// Shared response envelope types. See prd.md §5.1 / §5.2.

export type ApiSuccess<T> = {
  success: true;
  data: T;
  message?: string;
};

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTH_REQUIRED'
  | 'INVALID_CREDENTIALS'
  | 'USER_BANNED'
  | 'EMAIL_TAKEN'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'BAD_STATE'
  | 'INTERNAL_ERROR';

export type ApiFailure = {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type Role = 'STUDENT' | 'TUTOR' | 'ADMIN';

export type AuthUser = {
  id: string;
  role: Role;
  email: string;
};
