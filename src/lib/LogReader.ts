/*!
 * Copyright 2019, FIX Protocol Ltd.
 */

import MessageInstance, { FieldInstance } from "./MessageInstance";
import TVFileParser, { TVFieldParser, TVMessageParser } from "./TVFileParser";
import { File } from "./enums";
import LogWarnings from "./LogWarnings";

/**
 * Reads FIX message logs
 */
export default class LogReader {
  private static readonly encoding: string = "US-ASCII";
  public messagesCount: number;
  public badMessagesCount: number;
  private logFile: File;
  private lineNumber: number = 1;
  private progressNode: HTMLElement | null;
  private logWarnings: LogWarnings;
  private reader: FileReader = new FileReader();
  private messageListener: (message: MessageInstance) => void;
  private progressFunc: (progressNode: HTMLElement, percent: number) => void;

  constructor(
    logFile: File,
    messageListener: (message: MessageInstance) => void,
    progressNode: HTMLElement | null,
    progressFunc: (progressNode: HTMLElement, percent: number) => void
  ) {
    this.logFile = logFile;
    this.progressNode = progressNode;
    this.messageListener = messageListener;
    this.logWarnings = LogWarnings.getInstance();
    this.progressFunc = progressFunc;
    this.messagesCount = 0;
    this.badMessagesCount = 0;
  }
  /**
   * Reads a log file in chunks and parses the log messages using a TVFileParser object.
   * Creates MessageInstance objects for each message and calls a listener function with the message instance.
   * Keeps track of the number of messages and bad messages encountered during parsing.
   * @returns A Promise with no value.
   */
  async readFile(): Promise<void> {
    const logParser: TVFileParser = new TVFileParser();
    this.logWarnings.setLine(1);
    let fileOffset: number = 0;
    const chunkSize: number = 64 * 1024;
    let atLeastOneMessage: boolean = true;

    while (fileOffset < this.fileSize && atLeastOneMessage) {
      const chunk: string = await this.readBytes(
        fileOffset,
        Math.min(chunkSize, this.fileSize - fileOffset)
      );
      logParser.input = chunk;
      atLeastOneMessage = false;

      let messageResult: IteratorResult<TVMessageParser> = logParser.next();
      while (!messageResult.done) {
        this.messagesCount++;
        atLeastOneMessage = true;
        const message: TVMessageParser = messageResult.value;
        const messageInstance = new MessageInstance();

        let fieldResult: IteratorResult<TVFieldParser> = message.next();
        while (!fieldResult.done) {
          const field: TVFieldParser = fieldResult.value;
          const tag: string = field.tag;
          const value: string = field.value;
          messageInstance.push(new FieldInstance(tag, value));
          fieldResult = message.next();
        }

        this.logWarnings.setLine(this.lineNumber++);
        this.messageListener(messageInstance);
        messageResult = logParser.next();
      }

      fileOffset += logParser.lastMessageOffset;
    }

    this.messagesCount -= logParser.unprocessedMessages;
    this.badMessagesCount = logParser.unprocessedMessages;
  }
  private readBytes(offset: number, bytes: number): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.reader.onload = (event) => {
        if (this.progressNode) {
          this.progressFunc(
            this.progressNode,
            Math.floor(((offset + bytes) * 100) / this.fileSize)
          );
        }
        const res = this.reader.result;
        if (res) {
          resolve(res.toString());
        }
      };
      this.reader.onerror = () => {
        if (this.progressNode) {
          this.progressFunc(this.progressNode, -1);
        }
        if (this.reader.error && this.reader.error.toString) {
          const newError = new Error(this.reader.error.toString());
          newError.name = File.MessageLog;
          reject(newError);
        }
        reject(this.reader.error);
      };
      const blob = this.logFile.slice(offset, offset + bytes);
      this.reader.readAsText(blob, LogReader.encoding);
    });
  }
  get fileSize(): number {
    return this.logFile.size;
  }
}
