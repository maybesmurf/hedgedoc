/*
 * SPDX-FileCopyrightText: 2022 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { Injectable } from '@nestjs/common';

import { RealtimeNote } from './realtime-note';

@Injectable()
export class RealtimeNoteService {
  private noteIdToRealtimeNote = new Map<string, RealtimeNote>();

  /**
   * Creates or reuses a {@link RealtimeNote} that is handling the real time editing of the {@link Note} which is identified by the given note id.
   * @param noteId The id of the note for which a {@link RealtimeNote realtime note} should be retrieved.
   * @param initialContentReceiver A callback that provides the initial content of the realtime note if it needs to be created.
   * @return A {@link RealtimeNote} that is linked to the given note.
   */
  public async getOrCreateRealtimeNote(
    noteId: string,
    initialContentReceiver: () => Promise<string>,
  ): Promise<RealtimeNote> {
    const realtimeNote = this.noteIdToRealtimeNote.get(noteId);
    if (!realtimeNote) {
      const initialContent = await initialContentReceiver();
      const realtimeNote = new RealtimeNote(noteId, initialContent, () => {
        realtimeNote.destroy();
        this.noteIdToRealtimeNote.delete(noteId);
      });
      this.noteIdToRealtimeNote.set(noteId, realtimeNote);
      return realtimeNote;
    } else {
      return realtimeNote;
    }
  }

  /**
   * Retrieves a {@link RealtimeNote} that is linked to the given {@link Note} id.
   * @param noteId The id of the {@link Note}
   * @return A {@link RealtimeNote} or {@code undefined} if no instance is existing.
   */
  public getRealtimeNote(noteId: string): RealtimeNote | undefined {
    return this.noteIdToRealtimeNote.get(noteId);
  }
}
