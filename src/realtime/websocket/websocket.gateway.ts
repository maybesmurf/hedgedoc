/*
 * SPDX-FileCopyrightText: 2022 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { OnGatewayConnection, WebSocketGateway } from '@nestjs/websockets';
import { parse as parseCookie } from 'cookie';
import { IncomingMessage } from 'http';
import WebSocket from 'ws';

import { ConsoleLoggerService } from '../../logger/console-logger.service';
import { NotesService } from '../../notes/notes.service';
import { PermissionsService } from '../../permissions/permissions.service';
import { SessionService } from '../../session/session.service';
import { UsersService } from '../../users/users.service';
import { HEDGEDOC_SESSION } from '../../utils/session';
import { RealtimeNoteService } from '../realtime-note/realtime-note.service';
import { WebsocketConnection } from '../realtime-note/websocket-connection';
import { extractNoteIdFromRealtimePath } from './extract-note-id-from-realtime-path';

/**
 * Gateway implementing the realtime logic required for realtime note editing.
 */
@WebSocketGateway({ path: '/realtime/' })
export class WebsocketGateway implements OnGatewayConnection {
  constructor(
    private readonly logger: ConsoleLoggerService,
    private noteService: NotesService,
    private realtimeNoteService: RealtimeNoteService,
    private userService: UsersService,
    private permissionsService: PermissionsService,
    private sessionService: SessionService,
  ) {
    this.logger.setContext(WebsocketGateway.name);
  }

  /**
   * Handler that is called for each new WebSocket client connection.
   * Checks whether the requested URL path is valid, whether the requested note
   * exists and whether the requesting user has access to the note.
   * Closes the connection to the client if one of the conditions does not apply.
   *
   * @param clientSocket The WebSocket client object.
   * @param req The underlying HTTP request of the WebSocket connection.
   */
  async handleConnection(
    clientSocket: WebSocket,
    req: IncomingMessage,
  ): Promise<void> {
    this.logger.log(
      `New realtime connection from ${req.socket.remoteAddress ?? 'unknown'}`,
      'handleConnection',
    );
    clientSocket.binaryType = 'arraybuffer';

    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) {
      this.logger.error(
        'Connection denied. No cookie header present.',
        '',
        'handleConnection',
      );
      clientSocket.close();
      return;
    }
    const sessionCookie = parseCookie(cookieHeader);
    const cookieContent = sessionCookie[HEDGEDOC_SESSION];

    // const unsignedCookieContent = unsign();
    // TODO Verify signature of cookie content
    if (!cookieContent) {
      this.logger.error(
        `No ${HEDGEDOC_SESSION} cookie found`,
        '',
        'handleConnection',
      );
      clientSocket.close();
      return;
    }
    try {
      const sessionId = cookieContent.slice(2).split('.')[0];
      const username = await this.sessionService.getUsernameFromSessionId(
        sessionId,
      );

      const user = await this.userService.getUserByUsername(username);
      const note = await this.noteService.getNoteByIdOrAlias(
        extractNoteIdFromRealtimePath(req.url ?? ''),
      );

      if (!(await this.permissionsService.mayRead(user, note))) {
        this.logger.error(
          `Access denied to note '${note.id}' for user '${user.username}'`,
          '',
          'handleConnection',
        );
        clientSocket.close();
        return;
      }

      const realtimeNote =
        await this.realtimeNoteService.getOrCreateRealtimeNote(
          note.id,
          async () => (await this.noteService.getLatestRevision(note)).content,
        );

      if (clientSocket.readyState !== WebSocket.OPEN) {
        this.logger.error(
          `Socket was closed before initialize`,
          '',
          'handleConnection',
        );
        clientSocket.close();
        return;
      }

      const connection = new WebsocketConnection(
        clientSocket,
        user,
        realtimeNote,
      );

      realtimeNote.connectClient(connection);
      this.logger.debug(
        `Connection to note '${note.id}' (${note.publicId}) by user '${user.username}'`,
      );
    } catch (error: unknown) {
      this.logger.error(
        `Unknown error occurred while initializing: ${
          (error as Error).message
        }`,
        (error as Error).stack,
        'handleConnection',
      );
      clientSocket.close();
    }
  }
}
