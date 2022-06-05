/*
 * SPDX-FileCopyrightText: 2022 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { encodeAwarenessUpdateMessage } from '@hedgedoc/realtime-communication';
import { Awareness } from 'y-protocols/awareness';

import { RealtimeNote } from './realtime-note';

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
    const binaryUpdate = encodeAwarenessUpdateMessage(this, [
      ...added,
      ...updated,
      ...removed,
    ]);
    this.realtimeNote
      .getConnections()
      .forEach((client) => client.send(binaryUpdate));
  }
}
