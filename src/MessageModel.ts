import CodesetModel from "./CodesetModel";
import { FieldInstance } from "./MessageInstance";
import { ComponentsModel, GroupsModel } from "./OrchestraModel";
import { IsSupported, Keyed, Presence, StructureMember, StructureModel, Usable } from "./StructureModel";

/**
 * The context of a field reference as a tuple of a FieldRef,
 * contained by a container of the reference, i.e. a message or component or group,
 * and a reference to component or group.
 */
export type FieldContext = [FieldRef, StructureModel, StructureMember | undefined];

abstract class BaseStructureModel extends StructureModel {

    constructor(id: string | null, name: string, scenario: string, supported: IsSupported = IsSupported.Supported, uses: number = 0) {
        super(id, name, scenario, supported, uses);
    }

    /**
     * Returns an instance of a ComponentRef in this structure. Does not perform a tree walk.
     * @param id ID of the component
     * @returns a ComponentRef or undefined if not found
     */
    findComponentRef(id: string): ComponentRef | undefined {
        for (const member of this.members) {
            if (member.id === id && member instanceof ComponentRef) {
                return member;
            }
        }
        return undefined;
    }
    /**
     * Returns an instance of a GroupRef in this structure. Does not perform a tree walk.
     * @param id ID of the component
     * @returns a GroupRef or undefined if not found
     */
    findGroupRef(id: string): GroupRef | undefined {
        for (const member of this.members) {
            if (member.id === id && member instanceof GroupRef) {
                return member;
            }
        }
        return undefined;
    }
    /**
     * Returns an instance of a FieldRef in a StructureModel or a nested component
     * Implementation performs a tree walk from the root of the structure until the field reference is located.
     * @param id field tag
     * @returns a FieldRef instance or undefined if not found
     */
    findFieldRef(id: string): FieldContext | undefined {
        for (const member of this.members) {
            if (member.id === id && member instanceof FieldRef) {
                const fieldContext: FieldContext = [member, this, undefined];
                return fieldContext;
            }
            else if (member instanceof ComponentRef) {
                const fieldContext: FieldContext | undefined = member.findFieldRef(id);
                if (fieldContext && fieldContext[0]) {
                    return fieldContext;
                }
            }
            else if (member instanceof GroupRef) {
                const fieldContext: FieldContext | undefined = member.findFieldRef(id);
                if (fieldContext && fieldContext[0]) {
                    return fieldContext;
                }
            }
        }
        return undefined;
    }
}

export default class MessageModel extends BaseStructureModel {
    readonly msgType: string;
    private keys: FieldInstance[] | undefined = undefined;
    constructor(id: string | null, name: string, msgType: string, scenario: string, supported: IsSupported = IsSupported.Supported, uses: number = 0) {
        super(id, name, scenario, supported, uses);
        this.msgType = msgType;
    }
    clone(scenario: string): MessageModel {
        const clone = new MessageModel(this.id, this.name, this.msgType, scenario);
        this.members.forEach(m => clone.addMember(m.clone(scenario)));
        return clone;
    }
    get keyFields(): FieldInstance[] | undefined {
        return this.keys;
    }
    set keyFields(keys: FieldInstance[] | undefined) {
        this.keys = keys;
    }
}

export class ComponentModel extends BaseStructureModel {
    static readonly standardHeaderId = "1024";
    static readonly standardTrailerId = "1025";

    constructor(id: string | null, name: string, scenario: string, supported: IsSupported = IsSupported.Supported, uses: number = 0) {
        super(id, name, scenario, supported, uses);
    }

    clone(scenario: string): ComponentModel {
        // special case: do not clone standard header or trailer
        if (this.id === ComponentModel.standardHeaderId || this.id === ComponentModel.standardTrailerId) {
            return this;
        } else {
            const clone = new ComponentModel(this.id, this.name, scenario);
            this.members.forEach(m => clone.addMember(m.clone(scenario)));
            return clone;
        }
    }
}

export class GroupModel extends BaseStructureModel {
    readonly numInGroup: string;
    private fieldRef: FieldRef;

    constructor(id: string | null, name: string, numInGroup: string, scenario: string, supported: IsSupported = IsSupported.Supported, uses: number = 0) {
        super(id, name, scenario, supported, uses);
        this.numInGroup = numInGroup;
        this.fieldRef = new FieldRef(numInGroup, this.scenario, Presence.Required);
    }

    clone(scenario: string): GroupModel {
        const clone = new GroupModel(this.id, this.name, this.numInGroup, scenario);
        this.members.forEach(m => clone.addMember(m.clone(scenario)));
        return clone;
    }

    findFieldRef(id: string): FieldContext | undefined {
        if (id === this.numInGroup) {
            return [this.fieldRef, this, undefined];
        } else {
            return super.findFieldRef(id);
        }
    }
}

export class FieldModel implements Keyed, Usable {
    static readonly defaultScenario = "base";
    static readonly defaultDatatype = "String";

    readonly id: string;
    readonly name: string;
    readonly datatype: string;
    readonly scenario: string;

    constructor(id: string, name: string, datatype: string, scenario: string, public uses = 0) {
        this.id = id;
        this.name = name;
        if (datatype) {
            this.datatype = datatype;
        } else {
            this.datatype = FieldModel.defaultDatatype;
        }
        if (scenario) {
            this.scenario = scenario;
        } else {
            this.scenario = FieldModel.defaultScenario;
        }
    }

    static key(name: string, scenario: string): string {
        return name + "." + scenario;
    }

    key(): string {
        return FieldModel.key(this.name, this.scenario);
    }

    /**
   * Make a copy of this FieldModel for a different scenario, but with uses set to zero
   * @param scenario scenario name
   * @returns a new FieldModel
   */
    clone(scenario: string): FieldModel {
        const clone = new FieldModel(this.id, this.name, this.datatype, scenario);
        return clone;
    }

    use() {
        this.uses++;
    }
}

export class ComponentRef extends StructureMember {
    static readonly standardHeaderId = "1024";
    static readonly standardTrailerId = "1025";

    static componentsModel: ComponentsModel;

    private componentModel: ComponentModel | undefined = undefined;

    constructor(id: string, scenario: string, presence: Presence = Presence.Optional, supported: IsSupported = IsSupported.Supported, uses: number = 0) {
        super(id, scenario, presence, supported, uses);
    }

    clone(scenario: string): ComponentRef {
        // special case: do not change scenario of standard header or trailer
        if (this.id === ComponentModel.standardHeaderId || this.id === ComponentModel.standardTrailerId) {
            const clone = new ComponentRef(this.id, ComponentModel.defaultScenario, this.presence);
            return clone;
        } else {
            const clone = new ComponentRef(this.id, scenario, this.presence);
            let component: ComponentModel | undefined = ComponentRef.componentsModel.getById(this.id, scenario);
            if (!component) {
                const defaultComponent: ComponentModel | undefined = ComponentRef.componentsModel.getById(this.id, ComponentModel.defaultScenario);
                if (defaultComponent) {
                    component = defaultComponent.clone(scenario);
                    ComponentRef.componentsModel.add(component);
                }
            }
            return clone;
        }
    }

    findFieldRef(fieldId: string): FieldContext | undefined {
        if (!this.componentModel) {
            this.componentModel = ComponentRef.componentsModel.getById(this.id, this.scenario);
            if (!this.componentModel) {
                return undefined;
            }
        }
        const context: FieldContext | undefined = this.componentModel.findFieldRef(fieldId);
        if (context && context[0] && !context[2]) {
            context[2] = this;
        }
        return context;
    }
}

export class GroupRef extends StructureMember {
    static groupsModel: GroupsModel;

    private groupModel: GroupModel | undefined = undefined;

    constructor(id: string, scenario: string, presence: Presence = Presence.Optional, supported: IsSupported = IsSupported.Supported, uses: number = 0) {
        super(id, scenario, presence, supported, uses);
    }

    clone(scenario: string): GroupRef {
        const clone = new GroupRef(this.id, scenario, this.presence);
        let group: GroupModel | undefined = GroupRef.groupsModel.getById(this.id, scenario);
        if (!group) {
            const defaultGroup: GroupModel | undefined = GroupRef.groupsModel.getById(this.id, ComponentModel.defaultScenario);
            if (defaultGroup) {
                group = defaultGroup.clone(scenario);
                GroupRef.groupsModel.add(group);
            }
        }
        return clone;
    }

    findFieldRef(fieldId: string): FieldContext | undefined {
        if (!this.groupModel) {
            this.groupModel = GroupRef.groupsModel.getById(this.id, this.scenario);
            if (!this.groupModel) {
                return undefined;
            }
        }

        const context: FieldContext | undefined = this.groupModel.findFieldRef(fieldId);
        if (context && context[0] && !context[2]) {
            context[2] = this;
        }
        return context;
    }
}

export class FieldRef extends StructureMember {
    private fieldModel: FieldModel | undefined = undefined;
    private codesetModel: CodesetModel | undefined = undefined;
    private assignedValue: string | undefined = undefined;

    constructor(id: string, scenario: string, presence: Presence, supported: IsSupported = IsSupported.Supported, uses: number = 0) {
        super(id, scenario, presence, supported, uses);
    }

    clone(scenario: string): FieldRef {
        const clone = new FieldRef(this.id, scenario, this.presence);
        return clone;
    }

    get field(): FieldModel | undefined {
        return this.fieldModel;
    }

    set field(fieldModel: FieldModel | undefined) {
        this.fieldModel = fieldModel;
    }

    get codeset(): CodesetModel | undefined {
        return this.codesetModel;
    }

    set codeset(codesetModel: CodesetModel | undefined) {
        this.codesetModel = codesetModel;
    }

    get value(): string | undefined {
        return this.assignedValue;
    }

    set value(assignedValue: string | undefined) {
        this.assignedValue = assignedValue;
    }

    use(): void {
        super.use();
        if (this.field) {
            this.field.use();
        }
    }
}

