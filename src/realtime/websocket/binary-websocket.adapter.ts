/*
 * SPDX-FileCopyrightText: 2022 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { INestApplication, Logger } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import { MessageMappingProperties } from '@nestjs/websockets';
import { decoding } from 'lib0';
import WebSocket, { Server, ServerOptions } from 'ws';

import { MessageType } from '../message-type.enum';

/**
 * Sets up a websocket server that handles binary decoded realtime messages.
 */
export class BinaryWebsocketAdapter extends WsAdapter {
  protected readonly logger = new Logger(BinaryWebsocketAdapter.name);

  constructor(private app: INestApplication) {
    super(app);
  }

  /**
   * Binds the message event on every new connection.
   *
   * @param client The new websocket connection
   * @param handlers The handlers that process different messages
   */
  bindMessageHandlers(
    client: WebSocket,
    handlers: MessageMappingProperties[],
  ): void {
    client.on('message', (data: ArrayBuffer) =>
      this.handleIncomingMessage(data, handlers),
    );
  }

  /**
   * Decodes the given buffer and handles the containing message.
   *
   * @param buffer Contains the binary encoded message
   * @param handlers Handlers from the gateway that process different message types
   */
  private handleIncomingMessage(
    buffer: ArrayBuffer,
    handlers: MessageMappingProperties[],
  ): void {
    const uint8Data = new Uint8Array(buffer);
    const decoder = decoding.createDecoder(uint8Data);
    const messageType = decoding.readVarUint(decoder);
    const handler = handlers.find((handler) => handler.message === messageType);
    if (!handler) {
      this.logger.error(
        `Message handler for ${MessageType[messageType]} wasn't defined!`,
      );
      return;
    }
    try {
      handler.callback(decoder);
    } catch (error: unknown) {
      this.logger.error(
        `An unexpected error occurred while handling message: ${String(error)}`,
        (error as Error).stack ?? 'no-stack',
        'yjs-websocket-adapter',
      );
    }
  }

  /**
   * Creates the websocket server that is integrated into the underlying http server.
   *
   * @param port The port on the server should listen
   * @param options Additional server options
   * @return the created websocket server
   */
  create(port: number, options: ServerOptions): Server {
    this.logger.log('Initiating WebSocket server for realtime communication');
    return super.create(port, options) as Server;
  }
}
