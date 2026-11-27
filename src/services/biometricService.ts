import { Profile } from '../types/database.types';

const BIOMETRIC_ENABLED_PREFIX = 'app_expense_biometric_enabled_';
const BIOMETRIC_CRED_PREFIX = 'app_expense_biometric_cred_';

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const biometricService = {
  /**
   * Kiểm tra thiết bị & trình duyệt có hỗ trợ xác thực sinh trắc học (Vân tay / Face ID) không
   */
  async isSupported(): Promise<boolean> {
    if (
      typeof window === 'undefined' ||
      !window.PublicKeyCredential ||
      !navigator.credentials
    ) {
      return false;
    }
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  },

  /**
   * Kiểm tra người dùng đã bật khóa sinh trắc học trên thiết bị này chưa
   */
  isEnabled(userId: string): boolean {
    if (typeof localStorage === 'undefined') return false;
    return (
      localStorage.getItem(`${BIOMETRIC_ENABLED_PREFIX}${userId}`) === 'true' &&
      Boolean(localStorage.getItem(`${BIOMETRIC_CRED_PREFIX}${userId}`))
    );
  },

  /**
   * Đăng ký Vân tay / Khuôn mặt cho tài khoản hiện tại trên thiết bị
   */
  async register(user: Profile): Promise<void> {
    const supported = await this.isSupported();
    if (!supported) {
      throw new Error(
        'Thiết bị hoặc trình duyệt này chưa hỗ trợ Vân tay / Khuôn mặt (yêu cầu HTTPS và cảm biến sinh trắc học).'
      );
    }

    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const userIdBytes = new TextEncoder().encode(user.id);

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'ExpensePro - Quản Lý Chi Tiêu',
          id: window.location.hostname,
        },
        user: {
          id: userIdBytes,
          name: user.email,
          displayName: user.full_name,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },   // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null;

    if (!credential) {
      throw new Error('Không thể tạo khóa xác thực sinh trắc học');
    }

    const credId = bufferToBase64Url(credential.rawId);
    localStorage.setItem(`${BIOMETRIC_CRED_PREFIX}${user.id}`, credId);
    localStorage.setItem(`${BIOMETRIC_ENABLED_PREFIX}${user.id}`, 'true');
  },

  /**
   * Tắt khóa sinh trắc học trên thiết bị
   */
  disable(userId: string): void {
    localStorage.removeItem(`${BIOMETRIC_ENABLED_PREFIX}${userId}`);
    localStorage.removeItem(`${BIOMETRIC_CRED_PREFIX}${userId}`);
  },

  /**
   * Xác thực Vân tay / Khuôn mặt để mở khóa ứng dụng
   */
  async verify(userId: string): Promise<boolean> {
    const credId = localStorage.getItem(`${BIOMETRIC_CRED_PREFIX}${userId}`);
    if (!credId) return false;

    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const credIdBytes = base64UrlToUint8Array(credId);

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname,
        allowCredentials: [
          {
            type: 'public-key',
            id: credIdBytes as BufferSource,
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    });

    return Boolean(assertion);
  },
};
