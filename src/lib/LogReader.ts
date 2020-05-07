/*!
 * Copyright 2019, FIX Protocol Ltd.
 */

import MessageInstance, { FieldInstance } from "./MessageInstance";
import TVFileParser, { TVFieldParser, TVMessageParser } from "./TVFileParser";

let count = 0;

/**
 * Reads FIX message logs
 */
export default class LogReader {
    private static readonly encoding: string = "US-ASCII";
    public messagesCount: number;
    public badMessagesCount: number;
    private logFile: File;
    private progressNode: HTMLElement | null;
    private reader: FileReader = new FileReader();
    private messageListener: (message: MessageInstance) => void;
    private progressFunc: (progressNode: HTMLElement, percent: number) => void;

    constructor(logFile: File, messageListener: (message: MessageInstance) => void, progressNode: HTMLElement | null,
        progressFunc: (progressNode: HTMLElement, percent: number) => void) {
        this.logFile = logFile;
        this.progressNode = progressNode;
        this.messageListener = messageListener;
        this.progressFunc = progressFunc;
        this.messagesCount = 0;
        this.badMessagesCount = 0;
    }
    async readFile(): Promise<void> {
        const logParser: TVFileParser = new TVFileParser();
        let fileOffset: number = 0;
        let chunkSize: number = 64 * 1024;
        let str: string;
        // continue while not eof and at least one message found per chunk
        let atLeastOneMessage: boolean = true;
        while (fileOffset < this.fileSize && atLeastOneMessage) {
            // eslint-disable-next-line no-loop-func
            await this.readBytes(fileOffset, Math.min(chunkSize, this.fileSize - fileOffset)).then((chunk: string) => {
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
                    this.messageListener(messageInstance);
                    messageResult = logParser.next();
                }
            });
            fileOffset += logParser.lastMessageOffset;
        }
        this.messagesCount -= logParser.unprocessedMessages;
        this.badMessagesCount = logParser.unprocessedMessages;
    }
    private readBytes(offset: number, bytes: number): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            this.reader.onload = (event) => {
                if (this.progressNode) {
                    this.progressFunc(this.progressNode, Math.floor((offset + bytes) * 100 / this.fileSize));
                }
                const res = this.reader.result;
                if (res) {
                    const str: string = this.reader.result as string;
                    resolve(str);
                }
            };
            this.reader.onerror = () => {
                if (this.progressNode) {
                    this.progressFunc(this.progressNode, -1);
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
