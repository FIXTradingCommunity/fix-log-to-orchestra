/*!
 * Copyright 2019, FIX Protocol Ltd.
 */

 import CodesetModel, { CodeModel } from "./CodesetModel";
import { FieldInstance } from "./MessageInstance";
import MessageModel, { ComponentModel, FieldModel, FieldRef, GroupModel, ComponentRef, GroupRef } from "./MessageModel";
import { StructureModel } from "./StructureModel";

/**
 * A searchable model of an Orchestra file
 */
export default class OrchestraModel {
    static readonly defaultScenario = "base";
    readonly fields: FieldsModel = new FieldsModel();
    readonly codesets: CodesetsModel = new CodesetsModel();
    readonly components: ComponentsModel = new ComponentsModel();
    readonly groups: GroupsModel = new GroupsModel();
    readonly messages: MessagesModel = new MessagesModel();
    constructor() {
        ComponentRef.componentsModel = this.components;
        GroupRef.groupsModel = this.groups;
    }
    /**
     * Generate a scenario name from key field values assuming that the fields have an associated codeset.
     * Format: <field name>-<code name>
     * If more that one field, then repeat format with "_" delimiter.
     * If keyFields is empty, then return default scenario name "base".
     * Example: ExecType=Canceled
     * @param keyFields array of tag-value fields
     * @returns scenario name if successful or undefined if field or code names are unknown
     */
    generateScenarioName(keyFields: FieldInstance[]): string | undefined {
        if (keyFields.length === 0) {
            return OrchestraModel.defaultScenario;
        }
        let scenarioName: string = "";
        for (let fieldInstance of keyFields) {
            const field: FieldModel | undefined = this.fields.getById(fieldInstance.tag, OrchestraModel.defaultScenario);
            if (field) {
                const codeset: CodesetModel | undefined = this.codesets.get(CodesetModel.key(field.datatype, OrchestraModel.defaultScenario));
                if (codeset && fieldInstance.value) {
                    const code: CodeModel | undefined = codeset.getByValue(fieldInstance.value);
                    if (scenarioName.length > 0) {
                        scenarioName += "_";
                    }
                    scenarioName += field.name;
                    scenarioName += "-";
                    if (code) {
                        scenarioName += code.name;
                    }
                    else {
                        scenarioName += "None";
                    }
                }
                else {
                    return undefined;
                }
            }
            else {
                return undefined;
            }
        }
        return scenarioName;
    }
    /**
     * Parses a scenario name as described above and translates it to an array of tag-value fields
     * @param scenarioName scenario name
     * @returns an array of fields or undefined if the name does not conform to the expected format
     */
    generateKeyFields(scenarioName: string): FieldInstance[] | undefined {
        const keyFields: FieldInstance[] = new Array<FieldInstance>();
        if (scenarioName === OrchestraModel.defaultScenario) {
            return keyFields;
        }
        const parts: string[] = scenarioName.split(":");
        for (let part of parts) {
            const subparts: string[] = part.split("=");
            if (subparts.length !== 2) {
                return undefined;
            }
            let value: string | null;
            if (subparts[1] === "None") {
                value = null;
            }
            else {
                value = subparts[1];
            }
            const keyField = new FieldInstance(subparts[0], value);
            keyFields.push(keyField);
        }
        return keyFields;
    }
}

/**
 * Maps a StructureModel key to a StructureModel
 */
class StructureModelMap<T extends StructureModel> extends Map<string, T> {

    /**
     * Add an entry into this map with its natural key
     * @param sm a member to add to this map
     * @see StructureModel.key()
     */
    add(sm: T): this {
        return this.set(sm.key(), sm);
    }
}

export class MessagesModel extends StructureModelMap<MessageModel>{

    add(message: MessageModel): this {
        return super.add(message);
    }

    /**
     * @param msgType FIX message type (tag 35 value)
     * @returns an array of MessageModel of the specified type, possibly empty
     */
    getByMsgType(msgType?: string): MessageModel[] {
        return Array.from(this.values()).filter(m => m.msgType === msgType);
    }
}

/**
 * Maps key to codeset
 */
export class CodesetsModel extends Map<string, CodesetModel> {

}

export class ComponentsModel extends StructureModelMap<ComponentModel> {
    private componentIdMap: Map<string, ComponentModel> = new Map();

    add(component: ComponentModel): this {
        const key: string = component.id + "." + component.scenario;
        this.componentIdMap.set(key, component);
        return super.add(component);
    }

    getById(id: string, scenario: string): ComponentModel | undefined {
        const key: string = ComponentModel.key(id, scenario)
        return this.componentIdMap.get(key);
    }
}

export class GroupsModel extends StructureModelMap<GroupModel> {
    private numInGroupMap: Map<string, GroupModel> = new Map();
    private groupIdMap: Map<string, GroupModel> = new Map();

    add(group: GroupModel): this {
        this.numInGroupMap.set(group.numInGroup, group);
        const key: string = group.id + "." + group.scenario;
        this.groupIdMap.set(key, group);
        return super.add(group);
    }

    getByNumInGroupId(id: string): GroupModel | undefined {
        return this.numInGroupMap.get(id);
    }

    getById(id: string, scenario: string): GroupModel | undefined {
        const key: string = id + "." + scenario;
        return this.groupIdMap.get(key);
    }
}

/**
 * Maps key to field
 */
export class FieldsModel extends Map<string, FieldModel> {
    private fieldIdMap: Map<string, FieldModel> = new Map();

    add(field: FieldModel): this {
        this.fieldIdMap.set(FieldRef.key(field.id, field.scenario), field);
        return this.set(field.key(), field);
    }

    /**
     * Retrieve a Field based on the key of a FieldRef
     * @param id field tag
     * @param scenario scenario name
     */
    getById(id: string, scenario: string): FieldModel | undefined {
        return this.fieldIdMap.get(FieldRef.key(id, scenario));
    }

    getIds(): Array<string> {
        return Array.from(this.fieldIdMap.keys());
    }

    /**
     * Returns the tags of all fields with a given datatype
     * @param datatype a FIX datatype
     */
    getIdsByDatatype(datatype: string): string[] {
        return Array.from(this.fieldIdMap.entries()).filter(([id, field]) => field.datatype === datatype).map(([id, field]) => id);
    }
}
