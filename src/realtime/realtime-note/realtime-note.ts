/*
 * SPDX-FileCopyrightText: 2022 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { Logger } from '@nestjs/common';
import { Decoder } from 'lib0/decoding';
import { Awareness } from 'y-protocols/awareness';

import { MessageType } from '../message-type.enum';
import { WebsocketAwareness } from './websocket-awareness';
import { WebsocketConnection } from './websocket-connection';
import { WebsocketDoc } from './websocket-doc';

/**
 * Represents a note currently being edited by a number of clients.
 *
 * It holds references to some classes to handle different kinds of messages.
 */
export class RealtimeNote {
  protected readonly logger = new Logger(RealtimeNote.name);
  private readonly websocketDoc: WebsocketDoc;
  private readonly websocketAwareness: WebsocketAwareness;
  private readonly clients = new Set<WebsocketConnection>();
  private isClosing = false;

  constructor(
    private readonly noteId: string,
    initialContent: string,
    private onDestroy?: () => void,
  ) {
    this.websocketDoc = new WebsocketDoc(this, initialContent);
    this.websocketAwareness = new WebsocketAwareness(this);
    this.logger.log(`New realtime note for ${noteId} created.`);
  }

  /**
   * Connects a new client to the note.
   *
   * For this purpose a {@link WebsocketConnection} is created and added to the client map.
   *
   * @param client the websocket connection to the client
   */
  public connectClient(client: WebsocketConnection): void {
    this.logger.log(`New client connected`);
    this.clients.add(client);
  }

  /**
   * Disconnects the given websocket client while cleaning-up if it was the last user in the realtime note.
   *
   * @param {WebSocket} client The websocket client that disconnects.
   */
  public removeClient(client: WebsocketConnection): void {
    this.clients.delete(client);
    this.logger.log(
      `Client disconnected from realtime note. ${this.clients.size} left.`,
    );
    if (!this.hasConnections() && !this.isClosing) {
      this.logger.log(`No more connections left. Destroying yDoc.`);
      this.destroy();
      this.onDestroy?.();
    }
  }

  /**
   * Destroys the current realtime note by deleting the y-js doc and disconnecting all clients.
   */
  public destroy(): void {
    if (this.isClosing) {
      return;
    }
    this.isClosing = true;
    this.websocketDoc.destroy();
    this.websocketAwareness.destroy();
    this.clients.forEach((value) => value.disconnect());
  }

  /**
   * Checks if there's still clients connected to this note.
   *
   * @return {@code true} if there a still clinets connected, otherwise {@code false}
   */
  public hasConnections(): boolean {
    return this.clients.size !== 0;
  }

  /**
   * Returns all {@link WebsocketConnection WebsocketConnections} currently hold by this note.
   *
   * @return an array of {@link WebsocketConnection WebsocketConnections}
   */
  public getConnections(): WebsocketConnection[] {
    return [...this.clients];
  }

  /**
   * Get the {@link Doc YDoc} of the note.
   *
   * @return the {@link Doc YDoc} of the note
   */
  public getYDoc(): WebsocketDoc {
    return this.websocketDoc;
  }

  /**
   * Get the {@link Awareness YAwareness} of the note.
   *
   * @return the {@link Awareness YAwareness} of the note
   */
  public getAwareness(): Awareness {
    return this.websocketAwareness;
  }

  /**
   * Processes an incoming message.
   *
   * @param messageType The type of message
   * @param decoder A decoder that contains the payload of the message
   * @param origin The connection that received the message
   */
  public handleIncomingMessage(
    messageType: MessageType,
    decoder: Decoder,
    origin: WebsocketConnection,
  ): void {
    switch (messageType) {
      case MessageType.SYNC:
        this.websocketDoc.processIncomingSyncMessage(origin, decoder);
        break;
      case MessageType.AWARENESS:
        this.websocketAwareness.processIncomingAwarenessMessage(
          origin,
          decoder,
        );
        break;
      case MessageType.HEDGEDOC:
        this.logger.debug('Received HEDGEDOC message. Not implemented yet.');
        break;
    }
  }
}
