/*!
 * Copyright 2019, FIX Protocol Ltd.
 */

/**
 * Parses FIX tag-value fields
 */
export class TVFieldParser {
    static readonly tagDelimiter: string = "=";
    static fieldDelimiter: string = String.fromCharCode(1);
    static readonly nullFieldParser: TVFieldParser = new TVFieldParser("", 0);
    static lengthFieldIds: Array<string> = new Array<string>();
    
    private str: string;
    private tagOffset: number;
    private valueOffset: number = 0;
    private valueLength: number = 0;
    private nextValueLength: number = 0;

    constructor(str: string, offset: number, fieldDelimiter: string = String.fromCharCode(1)) {
        this.str = str;
        this.tagOffset = offset;
    }

    private parse(): boolean {
        let index: number = this.tagOffset;
        if (index > this.str.length - 1) {
            return false;
        }
        for (; this.str.charAt(index) != TVFieldParser.tagDelimiter && index < this.str.length - 1; index++);
        if (index < this.str.length) {
            index++;
            this.valueOffset = index;
        } else {
            return false;
        }

        if (this.nextValueLength > 0) {
            this.valueLength = this.nextValueLength;
            this.nextValueLength = 0;
            return this.valueOffset + this.valueLength < this.str.length;
        } else {
            for (; this.str.charAt(index) != TVFieldParser.fieldDelimiter && index < this.str.length - 1; index++);
            if (index <= this.str.length - 1) {
                this.valueLength = index - this.valueOffset;
                if (TVFieldParser.lengthFieldIds.indexOf(this.tag) >= 0) {
                    this.nextValueLength = parseInt(this.value);
                } else {
                    this.nextValueLength = 0;
                }
                return true;
            } else {
                return false;
            }
        }
    }

    /**
     * Advances to the next field in a message
     * @returns true if another field is accessed, false otherwise. If false, then field properties are invalidated.
     */
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


/**
 * Parses FIX tag-value messages
 */
export class TVMessageParser implements Iterator<TVFieldParser> {
    static readonly lastTag: string = "10";
    static readonly nullMessageParser: TVMessageParser = new TVMessageParser("", 0);

    private messageOffset: number;
    private fieldParser: TVFieldParser;
    private lastTagFound: boolean = false;

    constructor(str: string, offset: number) {
        this.messageOffset = offset;
        this.fieldParser = new TVFieldParser(str, offset);
    }

    next(): IteratorResult<TVFieldParser> {
        if (!this.lastTagFound && this.fieldParser.next()) {
            if (this.fieldParser.tag == TVMessageParser.lastTag) {
                this.lastTagFound = true;
            }
            return {
                done: false,
                value: this.fieldParser
            }
        } else {
            return {
                done: true,
                value: TVFieldParser.nullFieldParser
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

/**
 * Parses a file of FIX tag-value messages.
 * Assumptions:
 * Messages are not grossly malformed; this application is not expected to be a FIX validator.
 * Arbitrary delimiters and data between messages are to be ignored.
 */
export default class TVFileParser implements Iterator<TVMessageParser> {
    static readonly messageStartDelimiter: string = "8=FIX";
    static readonly bodyLengthTag: string = "9";
    static readonly checksumTag: string = "10";
    static fieldDelimiter: string = String.fromCharCode(1);
    private messageEndOffset: number = 0;
    private str: string = "";
    constructor() {
    }
    get lastMessageOffset(): number {
        return this.messageEndOffset;
    }
    get input(): string {
        return this.str;
    }
    set input(str: string) {
        this.str = str;
        this.messageEndOffset = 0;
    }
    next(): IteratorResult<TVMessageParser> {
        // find start of the next message using BeginString
        const messageStartOffset: number = this.str.indexOf(TVFileParser.messageStartDelimiter, this.messageEndOffset);
        if (messageStartOffset != -1) {
            const delimiterCharIndex = this.str.indexOf(TVFileParser.bodyLengthTag + "=", messageStartOffset) - 1;
            if (delimiterCharIndex === -1) {
                // delimiter char not found
                return {
                    done: true,
                    value: TVMessageParser.nullMessageParser
                };
            }

            TVFileParser.fieldDelimiter = this.str.charAt(delimiterCharIndex);
            TVFieldParser.fieldDelimiter = TVFileParser.fieldDelimiter;

            let field: TVFieldParser = new TVFieldParser(this.str, messageStartOffset);
            let bodyLength: number;
            if (field.next() && field.next() && field.tag === TVFileParser.bodyLengthTag) {
                bodyLength = parseInt(field.value, 10);
            }
            else {
                // body length not found
                return {
                    done: true,
                    // value can't be null according to iterator interface, so set dummy object
                    value: TVMessageParser.nullMessageParser
                };
            }
            const checksumOffet = field.offset + field.length + bodyLength;
            field = new TVFieldParser(this.str, checksumOffet);
            field.next();
            if (field.tag === TVFileParser.checksumTag) {
                bodyLength = parseInt(field.value, 10);
            }
            else {
                // checksum not found
                return {
                    done: true,
                    value: TVMessageParser.nullMessageParser
                };
            }
            const messageEndTag: number = field.offset + field.length;
            this.messageEndOffset = this.str.indexOf(TVFileParser.fieldDelimiter, messageEndTag);
            // assertion
            if (this.str.charAt(this.messageEndOffset) != TVFileParser.fieldDelimiter) {
                throw new Error("Bad offset");
            }
            // return a parser for a found message
            return {
                done: false,
                value: new TVMessageParser(this.str, messageStartOffset)
            };
        }
        else {
            // if message start not found, then iterator is done
            return {
                done: true,
                value: TVMessageParser.nullMessageParser
            };
        }
    }
}
