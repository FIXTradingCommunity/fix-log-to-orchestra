import { TagValueFileParser, MessageParser, FieldParser, IteratorResult } from "./tag_value_parser";

export default class LogReader {
    private logFile: File;

    constructor(logFile: File) {
        this.logFile = logFile;
    }

    readFile(): void {
        let logParser: TagValueFileParser = new TagValueFileParser(this.logFile);
        logParser.readFile();
        let messageResult: IteratorResult<MessageParser> = logParser.next();
        while (!messageResult.done) {
            let message: MessageParser = messageResult.value;

            let fieldResult: IteratorResult<FieldParser> = message.next();
            while (!fieldResult.done) {
                let field: FieldParser = fieldResult.value;
                let tag = field.tag;
                let value = field.value;
                // todo msgtype from tag 35

                fieldResult = message.next();
            }

            messageResult = logParser.next();
        }
    }
}