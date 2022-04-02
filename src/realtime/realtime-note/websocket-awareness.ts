/*
 * SPDX-FileCopyrightText: 2022 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { Decoder } from 'lib0/decoding';
import { Awareness } from 'y-protocols/awareness';

import { decodeAwarenessMessage, encodeAwarenessMessage } from './encode-utils';
import { RealtimeNote } from './realtime-note';
import { WebsocketConnection } from './websocket-connection';

interface ClientIdUpdate {
  added: number[];
  updated: number[];
  removed: number[];
}

/**
 * This is the implementation of {@link Awareness YAwareness} which includes additional handlers for message sending and receiving.
 */
export class WebsocketAwareness extends Awareness {
  constructor(private realtimeNote: RealtimeNote) {
    super(realtimeNote.getYDoc());
    this.setLocalState(null);
    this.on('update', this.distributeAwarenessUpdate.bind(this));
  }

  /**
   * Distributes the given awareness changes to all clients.
   *
   * @param added Properties that were added to the awareness state.
   * @param updated Properties that were updated in the awareness state.
   * @param removed Properties that were removed from the awareness state.
   *
   * @private
   */
  private distributeAwarenessUpdate({
    added,
    updated,
    removed,
  }: ClientIdUpdate): void {
    const binaryUpdate = encodeAwarenessMessage(this, [
      ...added,
      ...updated,
      ...removed,
    ]);
    this.realtimeNote
      .getConnections()
      .forEach((client) => client.send(binaryUpdate));
  }

  /**
   * Processes incoming AWARENESS messages.
   *
   * We're receiving an awareness message from any client.
   * This is processed via {@link decodeAwarenessMessage}, which also incorporates this message in the {@link Awareness YAwareness}.
   * All other clients are informed about the changes in the {@link Awareness YAwareness} via {@link distributeAwarenessUpdate}.
   *
   * @param client - the client who sent us the message
   * @param decoder - the decoder object for this message
   */
  public processIncomingAwarenessMessage(
    client: WebsocketConnection,
    decoder: Decoder,
  ): void {
    decodeAwarenessMessage(this, decoder, client);
  }
}
