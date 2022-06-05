/*
 * SPDX-FileCopyrightText: 2022 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import {
  applyAwarenessUpdateMessage,
  applyDocumentUpdateMessage,
  ConnectionKeepAliveHandler,
  encodeAwarenessUpdateMessage,
  encodeCompleteDocumentStateRequestMessage,
} from '@hedgedoc/realtime-communication';
import { MessageType } from '@hedgedoc/realtime-communication';
import { BinaryMessageTransporter } from '@hedgedoc/realtime-communication';
import { encodeCompleteDocumentStateAnswerMessage } from '@hedgedoc/realtime-communication/dist/messages/complete-document-state-answer-message';
import { Logger } from '@nestjs/common';
import WebSocket from 'ws';

import { User } from '../../users/user.entity';
import { RealtimeNote } from './realtime-note';

/**
 * This class warps the connection from a client to a {@link RealtimeNote} and adds some additional methods.
 */
export class WebsocketConnection extends BinaryMessageTransporter {
  protected readonly logger = new Logger(WebsocketConnection.name);

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
    super();
    this.websocket = websocket;
    websocket.binaryType = 'arraybuffer';
    websocket.on('message', (data) => this.decodeMessage(data as ArrayBuffer));
    websocket.on('error', (error) => {
      this.logger.error(error);
      websocket.close();
    });
    websocket.on('close', this.onClose.bind(this));

    this.on('disconnected', () => {
      this.realtimeNote.removeClient(this);
    });

    new ConnectionKeepAliveHandler(this);
    //this.bindAwarenessMessageEvents();
    this.bindDocumentSyncMessageEvents();

    this.onOpen();
  }

  private bindAwarenessMessageEvents(): void {
    this.on(MessageType.AWARENESS_UPDATE, (encoder, decoder) => {
      applyAwarenessUpdateMessage(
        decoder,
        this.realtimeNote.getAwareness(),
        this,
      );
    });
    this.on(MessageType.COMPLETE_AWARENESS_STATE_REQUEST, () => {
      this.send(
        encodeAwarenessUpdateMessage(this.realtimeNote.getAwareness(), [
          ...this.realtimeNote.getAwareness().getStates().keys(),
        ]),
      );
    });
  }

  private bindDocumentSyncMessageEvents(): void {
    this.on('ready', () => {
      this.send(
        encodeCompleteDocumentStateRequestMessage(this.realtimeNote.getYDoc()),
      );
    });

    this.on(MessageType.COMPLETE_DOCUMENT_STATE_REQUEST, (encoder, decoder) => {
      console.log('Received REQUEST_INITIAL_DOCUMENT_STATE');
      const yDoc = this.realtimeNote.getYDoc();
      this.send(encodeCompleteDocumentStateAnswerMessage(yDoc, decoder));
    });

    this.on(MessageType.DOCUMENT_UPDATE, (encoder, decoder) => {
      applyDocumentUpdateMessage(decoder, this.realtimeNote.getYDoc(), this);
      console.log(
        'Received DOCUMENT_UPDATE',
        this.realtimeNote.getYDoc().getText('codemirror').toString(),
      );
    });
  }

  public disconnect(): void {
    this.websocket.close();
  }

  public send(content: Uint8Array): void {
    if (this.websocket.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      this.websocket.send(content);
    } catch (error: unknown) {
      this.logger.error(error);
      this.websocket.close();
    }
  }
}
