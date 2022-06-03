/*
 * SPDX-FileCopyrightText: 2022 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { encoding } from 'lib0';
import { Awareness, encodeAwarenessUpdate } from 'y-protocols/awareness';
import { writeSyncStep1, writeUpdate } from 'y-protocols/sync';
import { Doc } from 'yjs';

import { MessageType } from './message-type.enum';

export function encodeAwarenessMessage(
  awareness: Awareness,
  updatedClients?: number[],
): Uint8Array {
  const encoder = encoding.createEncoder();
  const clientIds = updatedClients ?? Array.from(awareness.getStates().keys());
  encoding.writeVarUint(encoder, MessageType.AWARENESS);
  encoding.writeVarUint8Array(
    encoder,
    encodeAwarenessUpdate(awareness, clientIds),
  );
  return encoding.toUint8Array(encoder);
}

export function encodeSyncMessage(update: Uint8Array): Uint8Array {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MessageType.SYNC);
  writeUpdate(encoder, update);
  return encoding.toUint8Array(encoder);
}

export function encodeInitialSyncMessage(yDoc: Doc): Uint8Array {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MessageType.SYNC);
  writeSyncStep1(encoder, yDoc);
  return encoding.toUint8Array(encoder);
}

export function encodePingMessage(): Uint8Array {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MessageType.PING);
  return encoding.toUint8Array(encoder);
}

export function encodePongMessage(): Uint8Array {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MessageType.PONG);
  return encoding.toUint8Array(encoder);
}

