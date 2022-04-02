/*
 * SPDX-FileCopyrightText: 2022 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { Logger } from '@nestjs/common';
import { Decoder } from 'lib0/decoding';
import WebSocket from 'ws';

import { User } from '../../users/user.entity';
import { MessageType } from '../message-type.enum';
import { ConnectionKeepAlivePing } from './connection-keep-alive-ping';
import {
  encodeAwarenessMessage,
  encodeInitialSyncMessage,
} from './encode-utils';
import { RealtimeNote } from './realtime-note';

/**
 * This class warps the connection from a client to a {@link RealtimeNote} and adds some additional methods.
 */
export class WebsocketConnection {
  protected readonly logger = new Logger(WebsocketConnection.name);
  private connectionKeepAlivePing: ConnectionKeepAlivePing;

  /**
   * Instantiates the websocket connection wrapper for a websocket connection.
   *
   * Besides, sending the initial data to the client, a ping-pong connection test is set up.
   *
   * @param websocket The client's raw websocket.
   * @param user The user of the client
   * @param realtimeNote The {@link RealtimeNote} that the client connected to.
   */
  constructor(
    private websocket: WebSocket,
    private user: User,
    private realtimeNote: RealtimeNote,
  ) {
    this.connectionKeepAlivePing = new ConnectionKeepAlivePing(websocket);
    this.sendInitialSync();
    this.sendAwarenessState();
    this.websocket.on('close', () => {
      this.disconnect();
    });
    this.websocket.on('error', (error) => {
      this.logger.error(
        'Error in websocket connection.',
        error.message,
        'handleConnection',
      );
      this.disconnect();
    });
  }

  /**
   * Initializes the Yjs client by sending the first step of the handshake.
   */
  public sendInitialSync(): void {
    this.send(encodeInitialSyncMessage(this.realtimeNote.getYDoc()));
  }

  /**
   * Sends the awareness state of the assigned {@link RealtimeNote} to the client.
   */
  public sendAwarenessState(): void {
    this.send(encodeAwarenessMessage(this.realtimeNote.getAwareness()));
  }

  /**
   * Sends binary data to the client. Closes the connection on errors.
   *
   * @param content The binary data to send.
   */
  public send(content: Uint8Array): void {
    if (this.websocket.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      this.websocket.send(content);
    } catch (error: unknown) {
      this.websocket.close();
    }
  }

  /**
   * Closes the websocket connection and removes the client from the linked {@link RealtimeNote}.
   */
  public disconnect(): void {
    this.websocket.close();
    this.realtimeNote.removeClient(this);
  }

  /**
   * Processes an incoming message.
   *
   * @param messageType The message type
   * @param decoder The decoder that contains the message payload
   */
  public handleIncomingMessage(
    messageType: MessageType,
    decoder: Decoder,
  ): void {
    this.realtimeNote.handleIncomingMessage(messageType, decoder, this);
  }
}
