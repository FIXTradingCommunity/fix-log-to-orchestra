/*!
 * Copyright 2019, FIX Protocol Ltd.
 */

import defaultMessageScenarioKeys from "./defaultMessageScenarioKeys.json";
import { File } from './enums';

export type messageScenarioKeysType = { "keys": { "msgType": string; "fieldIds": string[]; }[]; };

/**
 * Configuration provides key fields to distinguish message scenarios
 * Read from a file or use defaults.
 */
export default class ConfigurationFile {
    static readonly MIME_TYPE: string = "application/json";
    static readonly defaultKeys: messageScenarioKeysType =  defaultMessageScenarioKeys;
    private keys: messageScenarioKeysType | undefined;
    private file: File;
    private progressNode: HTMLElement | null;
    private progressFunc: (progressNode: HTMLElement, percent: number) => void;

    constructor(file: File, progressNode: HTMLElement | null, progressFunc: (progressNode: HTMLElement, percent: number) => void) {
        this.file = file;
        this.progressNode = progressNode;
        this.progressFunc = progressFunc;
    }
    get messageScenarioKeys(): messageScenarioKeysType | undefined {
        return this.keys;
    }
    get size(): number {
        return this.file.size;
    }
    readFile(): Promise<void> {
        const reader = new FileReader();
        return new Promise<void>((resolve, reject) => {
            reader.onload = () => {
                if (this.progressNode) {
                    this.progressFunc(this.progressNode, 100);
                }
                const res = reader.result;
                if (res) {
                    const str: string = res as string;
                    this.keys = JSON.parse(str);
                    resolve();
                }
            };
            reader.onerror = () => {
                if (this.progressNode) {
                    this.progressFunc(this.progressNode, -1);
                }
                reader.abort();
                if (reader.error && reader.error.toString) {
                  const newError = new Error(reader.error.toString());
                  newError.name = File.Configuration;
                  reject(newError);
                }
                reject(reader.error);
            };
            reader.onprogress = (event: ProgressEvent) => {
                if (event.lengthComputable && this.progressNode) {
                    this.progressFunc(this.progressNode, Math.floor(event.loaded * 100 / event.total));
                }
            };
            reader.readAsText(this.file);
        });
    }
}



