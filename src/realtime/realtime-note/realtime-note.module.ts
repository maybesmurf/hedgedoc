import { Module } from '@nestjs/common';

import { LoggerModule } from '../../logger/logger.module';
import { PermissionsModule } from '../../permissions/permissions.module';
import { SessionModule } from '../../session/session.module';
import { UsersModule } from '../../users/users.module';
import { RealtimeNoteService } from './realtime-note.service';

@Module({
  imports: [LoggerModule, UsersModule, PermissionsModule, SessionModule],
  exports: [RealtimeNoteService],
  providers: [RealtimeNoteService],
})
export class RealtimeNoteModule {}
