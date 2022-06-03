/*
 * SPDX-FileCopyrightText: 2022 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { decoding, encoding } from 'lib0';
import { Decoder } from 'lib0/decoding';
import { applyAwarenessUpdate, Awareness } from 'y-protocols/awareness';
import { readSyncMessage } from 'y-protocols/sync';
import { Doc } from 'yjs';

import { MessageType } from './message-type.enum';

export function decodeSyncMessage(
  decoder: Decoder,
  yDoc: Doc,
  transactionOrigin: unknown,
): Uint8Array | undefined {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MessageType.SYNC);
  readSyncMessage(decoder, encoder, yDoc, transactionOrigin);
  if (encoding.length(encoder) > 1) {
    return encoding.toUint8Array(encoder);
  }
}

export function decodeAwarenessMessage(
  awareness: Awareness,
  decoder: Decoder,
  origin: unknown,
): void {
  applyAwarenessUpdate(awareness, decoding.readVarUint8Array(decoder), origin);
}
