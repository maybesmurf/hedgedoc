/*
 * SPDX-FileCopyrightText: 2022 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { Logger } from '@nestjs/common';
import { clearInterval } from 'timers';
import { WebSocket } from 'ws';

/**
 * Provides a keep alive ping for a given {@link WebSocket websocket} connection by sending a periodic message.
 */
export class ConnectionKeepAlivePing {
  protected readonly logger = new Logger(ConnectionKeepAlivePing.name);
  private pongReceived: boolean;
  private static readonly pingTimeout = 30 * 1000;

  /**
   * Constructs the instance and starts the interval.
   *
   * @param websocket The websocket to keep alive
   */
  constructor(private websocket: WebSocket) {
    this.startTimer();
  }

  /**
   * Starts the ping timer.
   */
  public startTimer(): void {
    this.pongReceived = false;
    const intervalId = setInterval(
      () => this.check(),
      ConnectionKeepAlivePing.pingTimeout,
    );
    this.websocket.on('close', () => {
      clearInterval(intervalId);
    });
    this.websocket.on('pong', () => {
      this.pongReceived = true;
    });
    this.websocket.on('ping', () => {
      this.websocket.pong();
    });
  }

  /**
   * Checks if a pong has been received since the last run. If not, the connection is probably dead and will be terminated.
   */
  private check(): void {
    if (this.pongReceived) {
      this.pongReceived = false;
      try {
        this.websocket.ping();
      } catch (e) {
        this.websocket.close();
        this.logger.error(`Couldn't send ping`);
      }
    } else {
      this.websocket.close();
      this.logger.error(
        `No pong received in the last ${ConnectionKeepAlivePing.pingTimeout} seconds. Connection seems to be dead.`,
      );
    }
  }
}
