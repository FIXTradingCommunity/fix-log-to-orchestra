/*!
 * Copyright 2019, FIX Protocol Ltd.
 */

/**
 * A FIX tag-value message
 */
export default class MessageInstance extends Array<FieldInstance> {
    /**
     * @returns the value of the third field (tag 35). If not populated, returns undefined.
     */
    get msgType(): string | undefined {
        const msgTypeField: FieldInstance = this[2];
        if (msgTypeField && msgTypeField.tag === "35" && msgTypeField.value) {
            return msgTypeField.value;
        }
        else {
            return undefined;
        }
    }
}

/**
 * A tag-value pair 
 * Although it is not valid to have null value in a FIX message, it is allowed in this class
 * to represent field not found in a message.
 */
export class FieldInstance {
    readonly tag: string;
    readonly value: string | null;

    /**
     * Compares two arrays of fields
     * @param fields1 first field array
     * @param fields2 second field array
     * @returns true if two arrays are same length and all fields are equal
     */
    static arrayEquals(fields1: FieldInstance[], fields2: FieldInstance[]): boolean {
        if (fields1.length !== fields2.length) {
            return false;
        }
        for (let i = 0; i < fields1.length; i++) {
            if (!fields1[i].equals(fields2[i])) {
                return false;
            }
        }
        return true;
    }

    constructor(tag: string, value: string | null) {
        this.tag = tag;
        this.value = value;
    }

    /**
     * Compares another FieldInstance to this one
     * @param field a field instance
     * @returns true if tags and values are equal
     */
    equals(field: FieldInstance): boolean {
        if (this.tag !== field.tag) {
            return false;
        }
        if (this.value !== field.value) {
            return false;
        }
        return true;
    }
}

