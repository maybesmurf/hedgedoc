/*
 * SPDX-FileCopyrightText: 2022 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { encodeDocumentUpdateMessage } from '@hedgedoc/realtime-communication';
import { Doc } from 'yjs';

import { RealtimeNote } from './realtime-note';
import { WebsocketConnection } from './websocket-connection';

/**
 * This is the implementation of {@link Doc YDoc} which includes additional handlers for message sending and receiving.
 */
export class WebsocketDoc extends Doc {
  private static readonly channelName = 'codemirror';

  /**
   * Creates a new WebsocketDoc instance.
   *
   * The new instance is filled with the given initial content and an event listener will be registered to handle
   * updates to the doc.
   *
   * @param realtimeNote - the {@link RealtimeNote} handling this {@link Doc YDoc}
   * @param initialContent - the initial content of the {@link Doc YDoc}
   */
  constructor(private realtimeNote: RealtimeNote, initialContent: string) {
    super();
    this.initializeContent(initialContent);
    this.on('update', this.distributeYDocUpdate.bind(this));
  }

  /**
   * Sets the {@link YDoc's Doc} content to include the initialContent.
   *
   * This message should only be called when a new {@link RealtimeNote } is created.
   *
   * @param initialContent - the initial content to set the {@link Doc YDoc's} content to.
   * @private
   */
  private initializeContent(initialContent: string): void {
    this.getText(WebsocketDoc.channelName).insert(0, initialContent);
  }

  /**
   * Distributes an update of the YDoc to the clients of the relevant {@link note RealtimeNote}.
   *
   * At first, the given binary YDoc update is encoded as a SYNC message. Afterwards the encoded message
   * is sent to all clients of the given realtime note except for the original creator of the update.
   *
   * @param update The YDoc update as a stream of bytes.
   * @param origin The websocket connection object of the original creator of the update.
   * @private
   */
  private distributeYDocUpdate(
    update: Uint8Array,
    origin: WebsocketConnection,
  ): void {
    const updateMessage = encodeDocumentUpdateMessage(update);
    const connections = this.realtimeNote.getConnections();
    connections.forEach((client) => {
      if (origin !== client && client.isSynced()) {
        client.send(updateMessage);
      }
    });
  }

  /**
   * Gets the current content of the note as it's currently edited in realtime.
   *
   * Please be aware that the return of this method may be very quickly outdated.
   *
   * @return The current note content.
   */
  public getCurrentContent(): string {
    return this.getText(WebsocketDoc.channelName).toString();
  }
}
