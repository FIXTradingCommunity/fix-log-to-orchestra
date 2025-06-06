/*!
 * Copyright 2019, FIX Protocol Ltd.
 */
import CodesetModel, { CodeModel } from "./CodesetModel";
import { messageScenarioKeysType } from "./ConfigurationFile";
import MessageInstance, { FieldInstance } from "./MessageInstance";
import MessageModel, {
  FieldContext,
  FieldModel,
  FieldRef,
  GroupModel,
} from "./MessageModel";
import OrchestraModel from "./OrchestraModel";
import {
  IsSupported,
  Presence,
  StructureMember,
  StructureModel,
} from "./StructureModel";
import LogWarnings from "./LogWarnings";

/**
 * Updates an OrchestraModel from log messages
 */
export default class LogModel {
  private orchestraModel: OrchestraModel;
  private scenarioKeys: messageScenarioKeysType | undefined = undefined;
  private logWarnings: LogWarnings;
  /**
   * @param orchestraModel model to update from logs
   */
  /**
   * The constructor method initializes the LogModel object.
   * @param orchestraModel - An instance of the OrchestraModel class.
   */
  constructor(orchestraModel: OrchestraModel) {
    this.orchestraModel = orchestraModel;
    this.logWarnings = LogWarnings.getInstance();
  }
  get model(): OrchestraModel {
    return this.orchestraModel;
  }

  get messageScenarioKeys(): messageScenarioKeysType | undefined {
    return this.scenarioKeys;
  }

  set messageScenarioKeys(keys: messageScenarioKeysType | undefined) {
    this.scenarioKeys = keys;
  }

  /**
   * Returns a message scenario corresponding to a message instance
   * @param message a message instance
   * @returns a message scenario from the model, or a new one if not previously defined,
   * or undefined if there is a failure due to malformed message, etc.
   */
  getMessageScenario(
    messageInstance: MessageInstance
  ): MessageModel | undefined {
    const messageModels: MessageModel[] = this.model.messages.getByMsgType(
      messageInstance.msgType
    );
    if (this.scenarioKeys) {
      const key = this.scenarioKeys.keys.find(
        (v) => v.msgType === messageInstance.msgType
      );
      if (key) {
        const fieldInstances: FieldInstance[] = key.fieldIds.map((fieldId) => {
          const fieldInstance = messageInstance.find(
            (field) => field.tag === fieldId
          );
          return fieldInstance
            ? fieldInstance
            : new FieldInstance(fieldId, null);
        });
        for (const m of messageModels) {
          let modelKeyFields = m.keyFields;
          if (!modelKeyFields) {
            modelKeyFields = this.orchestraModel.generateKeyFields(m.scenario);
            m.keyFields = modelKeyFields;
          }
          if (
            modelKeyFields &&
            FieldInstance.arrayEquals(fieldInstances, modelKeyFields)
          ) {
            return m;
          }
        }
        const messageIndex = messageModels.findIndex(
          (m) => m.scenario === MessageModel.defaultScenario
        );
        let scenarioToClone =
          messageIndex !== -1 ? messageModels[messageIndex] : messageModels[0];
        const scenarioName =
          this.orchestraModel.generateScenarioName(fieldInstances);
        if (scenarioName) {
          const messageModel = scenarioToClone.clone(scenarioName);
          messageModel.keyFields = fieldInstances;
          this.model.messages.add(messageModel);
          return messageModel;
        }
      }
      const index = messageModels.findIndex(
        (m) => m.scenario === MessageModel.defaultScenario
      );
      if (index !== -1) {
        return messageModels[index];
      } else {
        if (messageInstance.msgType) {
          const messageModel = new MessageModel(
            null,
            messageInstance.msgType,
            messageInstance.msgType,
            MessageModel.defaultScenario
          );
          this.model.messages.add(messageModel);
          return messageModel;
        }
      }
    }
  }
  /**
   * Retrieves the key for a specific message model based on the message type, key field ID, and field value.
   * @param msgType - The message type of the message model.
   * @param keyFieldId - The ID of the key field in the message model.
   * @param fieldValue - The value of the key field.
   * @returns The key for the message model, in the format "messageType-scenario".
   */
  getMessageModelKey(
    msgType: string,
    keyFieldId: string,
    fieldValue: string
  ): string {
    const message: MessageModel | undefined =
      this.model.messages.getByMsgType(msgType)[0];
    const messageName: string = message ? message.name : msgType;
    let scenario: string = MessageModel.defaultScenario;
    const field: FieldModel | undefined = this.model.fields.getById(
      keyFieldId,
      scenario
    );
    if (field) {
      const codeset: CodesetModel | undefined = this.model.codesets.get(
        field.datatype
      );
      if (codeset) {
        const code: CodeModel | undefined = codeset.getByValue(fieldValue);
        if (code) {
          scenario = code.name;
        }
      }
    }
    return MessageModel.key(messageName, scenario);
  }

  messageListener = (messageInstance: MessageInstance) => {
    // skip a malformed message
    if (!messageInstance.msgType) {
      this.logWarnings.logWarningsMessages("tag 35 not found");
      return;
    }
    const messageModel: MessageModel | undefined =
      this.getMessageScenario(messageInstance);
    if (!messageModel) {
      return;
    }
    let parseState: ParseState = new ParseState();
    for (let i = 0; i < messageInstance.length; i++) {
      const fieldInstance = messageInstance[i];
      if (fieldInstance.tag.length > 0) {
        // find this field in the existing message model or one of its nested components
        let fieldContext: FieldContext | undefined = messageModel.findFieldRef(
          fieldInstance.tag
        );
        if (!fieldContext) {
          let groupState: GroupState | undefined =
            parseState.advance(fieldInstance);
          let newFieldRef: FieldRef = new FieldRef(
            fieldInstance.tag,
            FieldModel.defaultScenario,
            Presence.Optional
          );
          if (groupState && groupState.instance <= groupState.instances) {
            // if not already in the group and group intance less than numInGroup, add it to the group
            // todo: warn about unknown field at end of last group instance
            if (
              groupState.instance === groupState.instances &&
              parseInt(fieldInstance.tag) >= 5000 &&
              parseInt(fieldInstance.tag) <= 9999 &&
              parseInt(messageInstance[i + 1].tag) !== 451
            ) {
              this.logWarnings.logWarningsMessages(
                `Location of UDF ${fieldInstance.tag} ambiguous (inside or outside of repeating group)`
              );
            }

            fieldContext = [newFieldRef, groupState.group, undefined];
            groupState.group.addMember(newFieldRef);
          } else {
            // else add field to message root
            fieldContext = [newFieldRef, messageModel, undefined];
            messageModel.addMember(newFieldRef);
          }

          newFieldRef.field = this.orchestraModel.fields.getById(
            fieldInstance.tag,
            FieldModel.defaultScenario
          );
          if (!newFieldRef.field) {
            // add a new field of default datatype, no codeset inference
            // field name must begin with alpha character
            newFieldRef.field = new FieldModel(
              newFieldRef.id,
              "Field" + newFieldRef.id.toString(),
              FieldModel.defaultDatatype,
              FieldModel.defaultScenario
            );
            this.orchestraModel.fields.add(newFieldRef.field);
          }
        } else {
          parseState.advanceWithContext(fieldInstance, fieldContext);
          let fieldRef: FieldRef = fieldContext[0];
          if (!fieldRef.field) {
            // set the field it is already defined for this scenario
            fieldRef.field = this.model.fields.getById(
              fieldInstance.tag,
              messageModel.scenario
            );
            if (fieldRef.field) {
              // also set the codeset if it already exists for this scenario
              let codesetKey: string = CodesetModel.key(
                fieldRef.field.datatype,
                messageModel.scenario
              );
              fieldRef.codeset = this.model.codesets.get(codesetKey);
            } else if (messageModel.scenario !== FieldModel.defaultScenario) {
              // only create a field with this scenario if it has a codeset; otherwise use base scenario.
              const defaultField: FieldModel | undefined =
                this.model.fields.getById(
                  fieldInstance.tag,
                  FieldModel.defaultScenario
                );
              if (defaultField) {
                // clone the field for this scenario
                fieldRef.field = defaultField.clone(messageModel.scenario);
                this.orchestraModel.fields.add(fieldRef.field);
                let codesetKey: string = CodesetModel.key(
                  defaultField.datatype,
                  FieldModel.defaultScenario
                );
                const defaultCodeset: CodesetModel | undefined =
                  this.model.codesets.get(codesetKey);
                if (defaultCodeset) {
                  codesetKey = CodesetModel.key(
                    defaultField.datatype,
                    messageModel.scenario
                  );
                  fieldRef.codeset = this.model.codesets.get(codesetKey);
                  if (!fieldRef.codeset) {
                    // if the codeset exists in base scenario, clone it
                    fieldRef.codeset = defaultCodeset.clone(
                      messageModel.scenario
                    );
                    this.model.codesets.set(codesetKey, fieldRef.codeset);
                  }
                }
              }
            }
          }
        }
        this.incrementUse(fieldContext, fieldInstance);
      } else {
        // else warn empty field tag
        this.logWarnings.logWarningsMessages("empty field tag");
      }
    }
  };

  private incrementUse(
    fieldContext: FieldContext,
    fieldInstance: FieldInstance
  ) {
    let fieldRef: FieldRef = fieldContext[0];
    // increment use of this fieldRef
    fieldRef.use();
    // increment use of the component, group or message containing this fieldRef
    if (fieldContext[1]) {
      const sm: StructureModel = fieldContext[1];
      sm.use();
    }
    // increment use of componentRef or groupRef
    if (fieldContext[2]) {
      const sm: StructureMember = fieldContext[2];
      sm.use();
    }
    if (fieldRef.codeset && fieldInstance.value) {
      let code: CodeModel | undefined = fieldRef.codeset.getByValue(
        fieldInstance.value
      );
      if (!code) {
        // add a code not in reference model
        code = new CodeModel(
          null,
          fieldInstance.value,
          fieldInstance.value,
          IsSupported.Supported
        );
        fieldRef.codeset.add(code);
      }
      if (code) {
        code.use();
      }
    }
  }
}

class GroupState {
  private _group: GroupModel;
  private _instance: number = 0;
  private _instances: number;

  constructor(group: GroupModel, instances: number) {
    this._group = group;
    this._instances = instances;
  }

  public get group(): GroupModel {
    return this._group;
  }

  // 1-based index of repeating group instance
  public get instance(): number {
    return this._instance;
  }

  // value of NumInGroup
  public get instances(): number {
    return this._instances;
  }

  // not incremented until first field of an instance is found, so index is 1-based
  public nextInstance(): void {
    this._instance++;
  }
}

class ParseState {
  private groupStack = new Array<GroupState>();

  advanceWithContext(
    fieldInstance: FieldInstance,
    fieldContext: FieldContext
  ): void {
    // if in a new group not already on stack, push it on the stack
    // if in a group already on stack, pop nested groups
    // if first field of the group, increment group instance
    if (fieldContext[1] instanceof GroupModel) {
      let inGroup: GroupModel = fieldContext[1];
      let thisGroupIndex = this.groupStack.findIndex(
        (gs) => gs.group === inGroup
      );

      if (thisGroupIndex === -1) {
        // add nested group
        this.groupStack.push(
          new GroupState(inGroup, Number(fieldInstance.value))
        );
      } else if (thisGroupIndex === this.groupStack.length - 1) {
        // in same group, check instance
        let first = inGroup.members[0];
        if (first instanceof FieldRef) {
          if (first.id === fieldInstance.tag) {
            this.groupStack[thisGroupIndex].nextInstance();
          }
        }
      } else {
        // pop nested groups by setting length to only include this group
        this.groupStack.length = thisGroupIndex + 1;
      }
    } else if (fieldContext[1] instanceof MessageModel) {
      // in the message root, no active group, clear all
      this.groupStack.length = 0;
    }
  }

  advance(fieldInstance: FieldInstance): GroupState | undefined {
    return this.groupStack[this.groupStack.length - 1];
  }
}
