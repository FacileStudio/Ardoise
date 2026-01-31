export interface AccountEncryptedData {
  accessToken: string;
  refreshToken: string;
  idToken: string;
}

export interface ContactEncryptedData {
  firstName: string;
  lastName: string;
}

export interface SessionEncryptedData {
  ipAddress: string;
  userAgent: string;
}

export interface UserEncryptedData {
  email: string;
  firstName: string;
  lastName: string;
  username: string;
}
