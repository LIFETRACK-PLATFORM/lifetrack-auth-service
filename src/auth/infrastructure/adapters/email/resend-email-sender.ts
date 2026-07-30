import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import type { EmailSenderPort } from '../../../domain/ports/email-sender.port';
import { envs } from '../../../../config/envs';

@Injectable()
export class ResendEmailSender implements EmailSenderPort {
  private readonly logger = new Logger(ResendEmailSender.name);
  private readonly resend = new Resend(envs.resendApiKey);

  async sendPasswordReset(email: string, resetUrl: string): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: 'LifeTrack <onboarding@resend.dev>',
      to: [email],
      subject: 'Restablece tu contraseña de LifeTrack',
      html: `<p>Solicitaste restablecer tu contraseña.</p><p><a href="${resetUrl}">Haz clic aquí para elegir una nueva contraseña</a></p><p>Si no fuiste tú, ignora este correo.</p>`,
    });

    if (error) {
      // No se propaga: un fallo de envío no debe romper la respuesta neutra
      // del flujo de forgot-password (ver design.md, riesgo de dependencia externa).
      this.logger.error(
        `Fallo al enviar email de reset a ${email}: ${error.message}`,
      );
    }
  }

  async sendEmailVerification(email: string, verifyUrl: string): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: 'LifeTrack <onboarding@resend.dev>',
      to: [email],
      subject: 'Confirma tu email de LifeTrack',
      html: `<p>Gracias por registrarte en LifeTrack.</p><p><a href="${verifyUrl}">Haz clic aquí para confirmar tu email y activar tu cuenta</a></p><p>Si no fuiste tú, ignora este correo.</p>`,
    });

    if (error) {
      // No se propaga: un fallo de envío no debe revertir el registro ya
      // creado (ver design.md, mismo criterio que sendPasswordReset).
      this.logger.error(
        `Fallo al enviar email de verificación a ${email}: ${error.message}`,
      );
    }
  }
}
