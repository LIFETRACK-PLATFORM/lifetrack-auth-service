import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CleanupExpiredRegistrationsUseCase } from '../../../application/use-cases/cleanup-expired-registrations.use-case';

@Injectable()
export class CleanupExpiredRegistrationsScheduler {
  private readonly logger = new Logger(CleanupExpiredRegistrationsScheduler.name);

  constructor(
    private readonly cleanupExpiredRegistrationsUseCase: CleanupExpiredRegistrationsUseCase,
  ) {}

  @Cron(CronExpression.EVERY_WEEK)
  async handleCleanup(): Promise<void> {
    const deletedCount = await this.cleanupExpiredRegistrationsUseCase.execute();
    if (deletedCount > 0) {
      this.logger.log(
        `Se eliminaron ${deletedCount} cuentas nunca confirmadas`,
      );
    }
  }
}
