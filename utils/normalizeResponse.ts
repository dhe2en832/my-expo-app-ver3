// utils/normalizeResponse.ts
export function normalizeSuccess(message: string, data: any) {
  return {
    success: true,
    message,
    data,
  };
}

export function normalizeError(message: string, errors: any = null) {
  return {
    success: false,
    message,
    errors,
  };
}
