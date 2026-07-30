export interface EmailSenderPort {
  sendPasswordReset(email: string, resetUrl: string): Promise<void>;
  sendEmailVerification(email: string, verifyUrl: string): Promise<void>;
}
