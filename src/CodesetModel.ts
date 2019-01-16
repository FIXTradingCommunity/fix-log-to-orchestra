/*!
 * Copyright 2019, FIX Protocol Ltd.
 */

 import { IsSupported, Keyed, Usable } from "./StructureModel";

/**
 * Model of codesets and codes
 */
export default class CodesetModel implements Keyed {
    static readonly defaultScenario = "base";
    static readonly defaultDatatype = "String";
    readonly id: string;
    readonly name: string;
    readonly scenario: string;
    readonly type: string;
    private isSupported: IsSupported = IsSupported.Supported;
    private codeNameMap: Map<string, CodeModel> = new Map();
    private codeValueMap: Map<string, CodeModel> = new Map();
    constructor(id: string | null, name: string, scenario: string, type: string, supported: IsSupported) {
        if (id) {
            this.id = id;
        }
        else {
            this.id = (Math.floor(Math.random() * 1000) + 5000).toString();
        }
        this.name = name;
        if (scenario) {
            this.scenario = scenario;
        }
        else {
            this.scenario = CodesetModel.defaultScenario;
        }
        if (type) {
            this.type = type;
        }
        else {
            this.type = CodesetModel.defaultDatatype;
        }
        if (supported) {
            this.supported = supported;
        }
        else {
            this.supported = IsSupported.Supported;
        }
    }
    /**
     * Make a copy of this CodesetModel for a different scenario, but with uses set to zero
     * @param scenario scenario name
     * @returns a new CodesetModel
     */
    clone(scenario: string): CodesetModel {
        const clone = new CodesetModel(this.id, this.name, scenario, this.type, this.supported);
        for (let code of this.codeNameMap.values()) {
            clone.add(code.clone());
        }
        return clone;
    }
    add(code: CodeModel): void {
        this.codeNameMap.set(code.name, code);
        this.codeValueMap.set(code.value, code);
    }
    getByName(name: string): CodeModel | undefined {
        return this.codeNameMap.get(name);
    }
    getByPrefixedName(name: string): CodeModel | undefined {
        return this.codeNameMap.get(name);
    }
    getByValue(value: string): CodeModel | undefined {
        return this.codeValueMap.get(value);
    }
    getUsedCodes(): Array<CodeModel> {
        return Array.from(this.codeValueMap.values()).filter((code: CodeModel) => code.uses > 0);
    }
    static key(name: string, scenario: string): string {
        return name + "." + scenario;
    }
    key(): string {
        return CodesetModel.key(this.name, this.scenario);
    }
    get supported(): IsSupported {
        return this.isSupported;
    }
    set supported(supported: IsSupported) {
        if (supported) {
            this.isSupported = supported;
        }
        else {
            this.isSupported = IsSupported.Supported;
        }
    }
}

export class CodeModel implements Usable {

    /**
     * Orchestra DSL prefix for code name
     */
    static readonly codeNamePrefix: string = "^";

    /**
     * Search pattern for named code value with Orchestra DSL prefix
     */
    static readonly codeNamePattern: RegExp = new RegExp("/\^(\S*)/");

    /**
     * Returns a code name without DSL prefix or null if no code name is found
     * @param expression a DSL expression to parse
     */
    static getCodeNameFromExpression(expression: string): string | null {
        const resultArray: RegExpExecArray | null = CodeModel.codeNamePattern.exec(expression);
        if (resultArray && resultArray.length >= 2) {
            return resultArray[1];
        } else {
            return null;
        }
    }

    readonly id: string;
    readonly name: string;
    readonly value: string;
    private isSupported: IsSupported = IsSupported.Supported;

    constructor(id: string | null, name: string, value: string, supported: IsSupported, public uses = 0) {
        if (id) {
            this.id = id;
        } else {
            this.id = (Math.floor(Math.random() * 1000) + 5000).toString();
        }
        this.name = name;
        this.value = value;
        if (supported) {
            this.supported = supported;
        } else {
            this.supported = IsSupported.Supported;
        }
    }

    /**
   * Make a copy of this CodeModel for a different scenario, but with uses set to 0
   * @returns a new CodeModel
   */
    clone(): CodeModel {
        const clone = new CodeModel(this.id, this.name, this.value, this.isSupported);
        return clone;
    }

    use() {
        this.uses++;
    }

    get supported(): IsSupported {
        return this.isSupported;
    }

    set supported(supported: IsSupported) {
        if (supported) {
            this.isSupported = supported;
        } else {
            this.isSupported = IsSupported.Supported;
        }
    }
}



