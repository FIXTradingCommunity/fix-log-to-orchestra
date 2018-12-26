/**
 * Produce a string to be used as a key in keyed collection such as Map and Set
 */
export interface Keyed {
    key(): string;
}

/**
 * Counts uses of an object
 * Note: tried to implement this as a mix-in but couldn't get to work with generics
 */
export interface Usable {
    readonly uses: number;

    /**
     * Increments the use count
     */
    use(): void;
}

export enum IsSupported {
    Supported = "supported",
    Forbidden = "forbidden",
    Ignored = "ignored"
}

/**
 * Reverse mapping for IsSupported enum
 * @param str string value from DOM
 */
export function IsSupportedfromString(str: string): IsSupported {
    switch (str) {
        case "forbidden":
            return IsSupported.Forbidden;
        case "ignored":
            return IsSupported.Ignored;
        default:
            return IsSupported.Supported;
    }
}

export enum Presence {
    Optional = "optional",
    Required = "required",
    Forbidden = "forbidden",
    Ignored = "ignored",
    Constant = "constant"
}
/**
 * Reverse mapping for Presence enum
 * @param str string value from DOM
*/
export function PresencefromString(str: string): Presence {
    switch (str) {
        case "required":
            return Presence.Required;
        case "forbidden":
            return Presence.Forbidden;
        case "ignored":
            return Presence.Ignored;
        case "constant":
            return Presence.Constant;
        default:
            return Presence.Optional;
    }
}

export abstract class StructureModel implements Keyed, Usable {
    static readonly defaultScenario = "base";
    readonly id: string;
    readonly name: string;
    readonly scenario: string;
    readonly members = new Array<StructureMember>();
    constructor(id: string | null, name: string, scenario: string, public supported: IsSupported = IsSupported.Supported, public uses = 0) {
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
            this.scenario = StructureModel.defaultScenario;
        }
    }
    /**
     * Combines the name and scenario name of a StructureModel to produce a unique key
     */
    static key(name: string, scenario: string): string {
        return name + "." + scenario;
    }
    /**
     * Key of this object
     */
    key(): string {
        return StructureModel.key(this.name, this.scenario);
    }
    /**
     * Copy this member for a different scenario, with uses set to zero
     * @param scenario new scenario name
     */
    abstract clone(scenario: string): StructureModel;
    addMember(member: StructureMember): void {
        this.members.push(member);
        member.parent = this;
    }

    /**
     * Increment use count
     */
    use(): void {
        this.uses++;
    }
}


export abstract class StructureMember implements Keyed, Usable {
    static readonly defaultScenario = "base";

    readonly id: string;
    readonly scenario: string;
    readonly presence: Presence;
    private parentStructure: StructureModel | undefined = undefined;

    constructor(id: string, scenario: string, presence: Presence, public supported: IsSupported = IsSupported.Supported, public uses = 0) {
        if (id) {
            this.id = id;
        } else {
            this.id = (Math.floor(Math.random() * 1000) + 5000).toString();
        }
        if (scenario) {
            this.scenario = scenario;
        } else {
            this.scenario = StructureMember.defaultScenario;
        }
        if (presence) {
            this.presence = presence;
        } else {
            this.presence = Presence.Optional;
        }
    }

    static key(id: string, scenario: string): string {
        return id + "." + scenario;
    }

    /**
     * Copy this member for a different scenario, with uses set to zero
     * @param scenario new scenario
     */
    abstract clone(scenario: string): StructureMember;

    key(): string {
        return StructureMember.key(this.id, this.scenario);
    }

    get parent(): StructureModel | undefined {
        return this.parentStructure;
    }

    set parent(parent: StructureModel | undefined) {
        this.parentStructure = parent;
    }

    use(): void {
        this.uses++;
    }
}



