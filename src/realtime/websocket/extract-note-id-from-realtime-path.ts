/*
 * SPDX-FileCopyrightText: 2022 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

const REALTIME_PATH_REGEX = /^\/realtime\/\?noteId=(.+)$/;

export function extractNoteIdFromRealtimePath(
  realtimePath: string | undefined,
): string {
  if (!realtimePath) {
    throw new Error('Provided path is empty');
  }
  const pathMatching = REALTIME_PATH_REGEX.exec(realtimePath);
  if (!pathMatching || pathMatching.length < 2) {
    throw new Error(
      'Realtime connection denied (invalid URL path): ' + realtimePath,
    );
  }
  return pathMatching[1];
}
