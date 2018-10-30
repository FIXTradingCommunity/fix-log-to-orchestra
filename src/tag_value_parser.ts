export interface Iterator<T> {
    next(): IteratorResult<T>;
}

export interface IteratorResult<T> {
    done: boolean;
    value?: T;
}

export class TagValueFileParser implements Iterator<MessageParser> {
    static readonly encoding: string = "US-ASCII";
    static readonly messageStartDelimiter: string = "8=FIX";
    static readonly messageEndPattern: string = "10=\\d+\\1";
    static readonly fieldDelimiter: string = String.fromCharCode(1);

    private file: File;
    private str: string;
    private prevMessageEndOffset: number = 0;

    constructor(file: File) {
        this.file = file;
    }

    readFile(): void {
        // todo use slice to read huge file in chunks
        let reader = new FileReader();
        reader.onload = () => {
            let res = reader.result;
            if (typeof res === "string") {
                this.str = reader.result as string;
            } else {
                this.str = reader.result.toString();
            }
        }

        reader.onerror = function () {
            alert(reader.error.message);
        }
        // todo onprogress
        reader.readAsText(this.file, TagValueFileParser.encoding);
    }

    next(): IteratorResult<MessageParser> {
        let messageOffset: number = this.str.indexOf(TagValueFileParser.messageStartDelimiter, this.prevMessageEndOffset);
        if (messageOffset != -1) {
            let messageEndTag: number = this.str.substr(messageOffset).search(TagValueFileParser.messageEndPattern);
            this.prevMessageEndOffset = this.str.indexOf(TagValueFileParser.fieldDelimiter, messageEndTag);
        }

        if (messageOffset >= 0) {
            return {
                done: false,
                value: new MessageParser(this.str, messageOffset)
            }
        } else {
            return {
                done: true
            }
        }
    }

    get size(): number {
        return this.file.size;
    }
}

export class MessageParser implements Iterator<FieldParser> {
    static readonly lastTag: string = "10";

    private str: string;
    private messageOffset: number;
    private messageLength: number = undefined;
    private fieldParser: FieldParser;
    private lastTagFound: boolean = false;

    constructor(str: string, offset: number) {
        this.messageOffset = offset;
        this.fieldParser = new FieldParser(str, offset);
    }

    next(): IteratorResult<FieldParser> {
        if (!this.lastTagFound && this.fieldParser.next()) {
            if (this.fieldParser.tag == MessageParser.lastTag) {
                this.lastTagFound = true;
            }
            return {
                done: false,
                value: this.fieldParser
            }
        } else {
            return {
                done: true
            }
        }
    }

    get offset(): number {
        return this.messageOffset;
    }

    get length(): number {
        return this.fieldParser.offset + this.fieldParser.length - this.messageOffset;
    }
}

export class FieldParser {
    static readonly tagDelimiter: string = "=";
    static readonly fieldDelimiter: string = String.fromCharCode(1);

    private str: string;
    private tagOffset: number;
    private valueOffset: number = undefined;
    private valueLength: number = undefined;

    constructor(str: string, offset: number) {
        this.str = str;
        this.tagOffset = offset;
    }

    private parse(): boolean {
        let index: number = this.tagOffset;
        if (index > this.str.length - 1) {
            return false;
        }
        for (; this.str.charAt(index) != FieldParser.tagDelimiter && index < this.str.length - 1; index++);
        if (index < this.str.length) {
            index++;
            this.valueOffset = index;
        } else {
            return false;
        }
        for (; this.str.charAt(index) != FieldParser.fieldDelimiter && index < this.str.length - 1; index++);

        if (index <= this.str.length - 1) {
            this.valueLength = index - this.valueOffset;
            return true;
        } else {
            return false;
        }
    }

    next(): boolean {
        if (this.valueOffset) {
            this.tagOffset += this.length;
        }
        return this.parse();
    }

    get tag(): string {
        return this.str.substr(this.tagOffset, this.valueOffset - this.tagOffset - 1);
    }

    get value(): string {
        return this.str.substr(this.valueOffset, this.valueLength);
    }

    get offset(): number {
        return this.tagOffset;
    }

    get length(): number {
        return this.valueOffset + this.valueLength + 1 - this.tagOffset;
    }

}
