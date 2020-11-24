/*!
 * Copyright 2019, FIX Protocol Ltd.
 */

import CodesetModel, { CodeModel } from "./CodesetModel";
import LogModel from "./LogModel";
import MessageModel, { ComponentModel, ComponentRef, FieldContext, FieldModel, FieldRef, GroupModel, GroupRef } from "./MessageModel";
import OrchestraModel, { CodesetsModel, ComponentsModel, FieldsModel, GroupsModel, MessagesModel } from "./OrchestraModel";
import { IsSupportedfromString, Presence, PresencefromString, StructureModel } from "./StructureModel";
import { KeyedCollection } from "./KeyedCollection";
//import { ActionViewArray } from "material-ui/svg-icons";
import {xml} from "vkbeautify";

export default class OrchestraFile {
    static readonly MIME_TYPE: SupportedType = "application/xml";
    static readonly NAMESPACE: string = "http://fixprotocol.io/2020/orchestra/repository";

    private repositoryStatistics = new KeyedCollection<Number>();

    private file: File;
    private document: Document = new Document();
    private progressNode: HTMLElement | null;
    private progressFunc: (progressNode: HTMLElement, percent: number) => void;
    private appendOnly: boolean;

    constructor(file: File, appendOnly: boolean = false, progressNode: HTMLElement | null, progressFunc: (progressNode: HTMLElement, percent: number) => void) {
        this.file = file;
        this.progressNode = progressNode;
        this.progressFunc = progressFunc;
        this.appendOnly = appendOnly;
    }
    static parse(xml: string): Document | Error {
        const parser = new DOMParser();
        // test namespace of parseerror since it's different between browsers
        let parsererrorNS: string | null = parser.parseFromString('INVALID', 'text/xml').getElementsByTagName("parsererror")[0].namespaceURI;
        let doc: Document = parser.parseFromString(xml, OrchestraFile.MIME_TYPE);
        if (parsererrorNS && doc.getElementsByTagNameNS(parsererrorNS, 'parsererror').length > 0) {
            const errors = doc.getElementsByTagNameNS(parsererrorNS, 'parsererror');
            return new Error(OrchestraFile.getErrorMessage(errors[0].textContent));
        } else if (!parsererrorNS && doc.getElementsByTagName('parsererror').length > 0) {
            const errors = doc.getElementsByTagName('parsererror');
            return new Error(OrchestraFile.getErrorMessage(errors[0].textContent));
        } else {
            return doc;
        }
    }
    static serialize(document: Document): string {
        const serializer = new XMLSerializer();
        const text = serializer.serializeToString(document);
        return xml(text, 2);
    }
    static getErrorMessage(textContent: string | null): string {
        if (!textContent) return "Error parsing XML";
        return textContent;
    }
    get dom(): Document {
        return this.document;
    }
    cloneDom(): Document {
        const newDocument: Document = this.document.implementation.createDocument(this.document.namespaceURI, //namespace to use
            null, //name of the root element (or for empty document)
            null //doctype (null for XML)
        );
        const rootNode: Node | null = this.document.documentElement;
        if (rootNode) {
            const newNode: Node = newDocument.importNode(rootNode, //node to import
                true //clone its descendants
            );
            newDocument.appendChild(newNode);
        }
        return newDocument;
    }
    set dom(document: Document) {
        this.document = document;
    }
    get size(): number {
        return this.file.size;
    }
    get statistics(): KeyedCollection<Number> {
        return this.repositoryStatistics;
    }
    readFile(): Promise<void> {
        const reader = new FileReader();
        return new Promise<void>((resolve, reject) => {
            reader.onload = () => {
                if (this.progressNode) {
                    this.progressFunc(this.progressNode, 100);
                }
                const res = reader.result;
                if (typeof res === "string") {
                    const dom = OrchestraFile.parse(res);
                    if (dom instanceof Error) {
                        reject(dom);
                    } else {
                        this.dom = dom;
                        resolve();
                    }
                }
                else if (res) {
                    const dom = OrchestraFile.parse(res.toString());
                    if (dom instanceof Error) {
                        reject(dom);
                    } else {
                        this.dom = dom;
                        resolve();
                    }
                } else {
                    reject("Failed to read XML file; possibly empty");
                }
            };
            reader.onerror = () => {
                if (this.progressNode) {
                    this.progressFunc(this.progressNode, -1);
                }
                reader.abort();
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

    updateDomFromModel(logModel: LogModel, progressNode: HTMLElement | null): void {
        this.updateDomMetadata();
        this.updateDomCodes(logModel.model.codesets);
        this.updateDomFields(logModel.model.fields);
        this.addDomMessages(logModel.model.messages);
        this.addDomComponents(logModel.model.components);
        this.addDomGroups(logModel.model.groups);
        if (!this.appendOnly) {
            this.removeUnusedMessages(logModel.model.messages);
            this.removeUnusedMessageMembers(logModel.model.messages);
            this.removeUnusedComponentMembers(logModel.model.components);
            this.removeUnusedGroupMembers(logModel.model.groups);
            this.removeUnusedComponents(logModel.model.components);
            this.removeUnusedGroups(logModel.model.groups);
        }
        if (progressNode) {
            this.progressFunc(progressNode, 100);
        }
    }
    private addDomMessages(messages: MessagesModel): void {
        const namespaceResolver: XPathNSResolver = new XPathEvaluator().createNSResolver(this.dom);
        const messagesSnapshot: XPathResult = this.dom.evaluate("/fixr:repository/fixr:messages", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
        const messagesElement: Element = messagesSnapshot.snapshotItem(0) as Element;
        const nodesSnapshot: XPathResult = this.dom.evaluate("/fixr:repository/fixr:messages/fixr:message", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
        var countMessagesAdded : number = 0;
        var countScenariosAdded : number = 0;
        Array.from(messages.values()).filter(m => m.uses > 0).forEach((message: MessageModel) => {
            let messageElement: Element | null = null;
            for (let i = 0; i < nodesSnapshot.snapshotLength; i++) {
                const node: Element = nodesSnapshot.snapshotItem(i) as Element;
                const name: string | null = node.getAttribute("name");
                const scenario: string = node.getAttribute("scenario") || "base";
                if (message.name === name && message.scenario === scenario) {
                    messageElement = node;
                    break;
                }
            }
            if (!messageElement) {
                messageElement = this.dom.createElementNS(OrchestraFile.NAMESPACE, "fixr:message");
                messageElement.setAttribute("name", message.name);
                messageElement.setAttribute("scenario", message.scenario);
                messageElement.setAttribute("id", message.id);
                messageElement.setAttribute("msgType", message.msgType);
                messagesElement.appendChild(messageElement);
                const structureElement: Element = this.dom.createElementNS(OrchestraFile.NAMESPACE, "fixr:structure");
                messageElement.appendChild(structureElement);
                this.addMembers(structureElement, message);
                if (message.scenario === "base" )
                    countMessagesAdded++;
                else
                    countScenariosAdded++;
            }
            else {
            const scenario: string | null = messageElement.getAttribute("scenario");
            if (!scenario || scenario === "base" || scenario === "")
                countMessagesAdded++;
            else
                countScenariosAdded++;            
            }
        });
        this.repositoryStatistics.Add("Messages.Added",countMessagesAdded);
        this.repositoryStatistics.Add("Scenarios.Added",countScenariosAdded);
    }
    private addMembers(structureElement: Element, structure: StructureModel) {
        var countMembersAdded : number = 0;
        structure.members.forEach(m => {
            if (m instanceof FieldRef) {
                const memberElement: Element = this.dom.createElementNS(OrchestraFile.NAMESPACE, "fixr:fieldRef");
                memberElement.setAttribute("id", m.id);
                memberElement.setAttribute("presence", m.presence.toString());
                if (m.value) {
                    memberElement.setAttribute("value", m.value);
                }
                if (m.field && (m.field.scenario != FieldRef.defaultScenario)) {
                    memberElement.setAttribute("scenario", m.field.scenario);
                }
                structureElement.appendChild(memberElement);
            }
            else if (m instanceof ComponentRef) {
                const memberElement: Element = this.dom.createElementNS(OrchestraFile.NAMESPACE, "fixr:componentRef");
                memberElement.setAttribute("id", m.id);
                memberElement.setAttribute("presence", m.presence.toString());
                if (m.scenario != FieldRef.defaultScenario) {
                    memberElement.setAttribute("scenario", m.scenario);
                }
                structureElement.appendChild(memberElement);
            }
            else if (m instanceof GroupRef) {
                const memberElement: Element = this.dom.createElementNS(OrchestraFile.NAMESPACE, "fixr:groupRef");
                memberElement.setAttribute("id", m.id);
                memberElement.setAttribute("presence", m.presence.toString());
                if (m.scenario != FieldRef.defaultScenario) {
                    memberElement.setAttribute("scenario", m.scenario);
                }
                structureElement.appendChild(memberElement);
            }
            countMembersAdded++;
        });
        this.repositoryStatistics.Add("Members.Added",countMembersAdded);
    }
    private updateDomMetadata(): void {
        const namespaceResolver: XPathNSResolver = new XPathEvaluator().createNSResolver(this.dom);
        const nodesSnapshot: XPathResult = this.dom.evaluate("/fixr:repository/fixr:metadata", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
        const metadataElement: Element = nodesSnapshot.snapshotItem(0) as Element;
        const contributorElement: Element = this.dom.createElementNS("http://purl.org/dc/elements/1.1/", "dc:contributor");
        const textNode: Text = this.dom.createTextNode("log2orchestra");
        contributorElement.appendChild(textNode);
        metadataElement.appendChild(contributorElement);
        const timestamp: string = new Date().toISOString();
        let dateElement: Element = metadataElement.getElementsByTagNameNS("http://purl.org/dc/elements/1.1/", "date")[0];
        if (dateElement) {
            dateElement.childNodes[0].nodeValue = timestamp;
        }
        else {
            dateElement = this.dom.createElementNS("http://purl.org/dc/elements/1.1/", "dc:date");
            const timeText: Text = this.dom.createTextNode(timestamp);
            dateElement.appendChild(timeText);
            metadataElement.appendChild(dateElement);
        }
    }
    contents(): Blob {
        return new Blob([OrchestraFile.serialize(this.document)], { type: OrchestraFile.MIME_TYPE });
    }
    public populateOrchestraModelFromDom(orchestraModel: OrchestraModel) {
        this.populateFieldsModelFromDom(orchestraModel.fields);
        this.populateCodesetsModelFromDom(orchestraModel.codesets);
        this.populateComponentsModelFromDom(orchestraModel.components);
        this.populateGroupsModelFromDom(orchestraModel.groups);
        this.poulateMessagesModelFromDom(orchestraModel.messages);
    }
    private populateFieldsModelFromDom(fieldsModel: FieldsModel): void {
        const namespaceResolver: XPathNSResolver = new XPathEvaluator().createNSResolver(this.dom);
        const iterator: XPathResult = this.dom.evaluate("/fixr:repository/fixr:fields/fixr:field", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
        let element: Element = iterator.iterateNext() as Element;
        while (element) {
            const elementName: string = element.localName;
            if (elementName === "field") {
                const id: string | null = element.getAttribute("id");
                const name: string | null = element.getAttribute("name");
                const type: string | null = element.getAttribute("type");
                const scenario: string = element.getAttribute("scenario") || "base";
                if (id && name && type) {
                    fieldsModel.add(new FieldModel(id, name, type, scenario));
                }
            }
            element = iterator.iterateNext() as Element;
        }
    }
    private populateCodesetsModelFromDom(codesetsModel: CodesetsModel): void {
        const namespaceResolver: XPathNSResolver = new XPathEvaluator().createNSResolver(this.dom);
        const iterator: XPathResult = this.dom.evaluate("/fixr:repository/fixr:codeSets/fixr:codeSet", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
        let codesetElement: Element = iterator.iterateNext() as Element;
        while (codesetElement) {
            const id: string | null = codesetElement.getAttribute("id");
            const name: string | null = codesetElement.getAttribute("name");
            const scenario: string = codesetElement.getAttribute("scenario") || "base";
            const type: string | null = codesetElement.getAttribute("type");
            let supported: string = codesetElement.getAttribute("supported") || "supported";
            if (name && type) {
                const codeset = new CodesetModel(id, name, scenario, type, IsSupportedfromString(supported));
                codesetsModel.set(codeset.key(), codeset);
                let childElement: Element | null = codesetElement.firstElementChild;
                while (childElement) {
                    const elementName: string = childElement.localName;
                    if (elementName === "code") {
                        const id: string | null = childElement.getAttribute("id");
                        const name: string | null = childElement.getAttribute("name");
                        const value: string | null = childElement.getAttribute("value");
                        supported = childElement.getAttribute("supported") || "supported";
                        if (name && value) {
                            const code: CodeModel = new CodeModel(id, name, value, IsSupportedfromString(supported));
                            codeset.add(code);
                        }
                    }
                    childElement = childElement.nextElementSibling;
                }
            }
            codesetElement = iterator.iterateNext() as Element;
        }
    }
    private populateComponentsModelFromDom(componentsModel: ComponentsModel): void {
        const namespaceResolver: XPathNSResolver = new XPathEvaluator().createNSResolver(this.dom);
        const iterator: XPathResult = this.dom.evaluate("/fixr:repository/fixr:components/fixr:component", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
        let componentElement: Element = iterator.iterateNext() as Element;
        while (componentElement) {
            const elementName: string = componentElement.localName;
            if (elementName === "component") {
                const id: string | null = componentElement.getAttribute("id");
                const name: string | null = componentElement.getAttribute("name");
                const scenario: string = componentElement.getAttribute("scenario") || "base";
                if (id && name) {
                    const componentModel = new ComponentModel(id, name, scenario);
                    componentsModel.add(componentModel);
                    const memberElement: Element | null = componentElement.firstElementChild;
                    if (memberElement) {
                        this.extractStructureMembers(memberElement, componentModel);
                    }
                }
            }
            componentElement = iterator.iterateNext() as Element;
        }
    }
    private populateGroupsModelFromDom(groupsModel: GroupsModel): void {
        const namespaceResolver: XPathNSResolver = new XPathEvaluator().createNSResolver(this.dom);
        const iterator: XPathResult = this.dom.evaluate("/fixr:repository/fixr:groups/fixr:group", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
        let groupElement: Element = iterator.iterateNext() as Element;
        while (groupElement) {
            const elementName: string = groupElement.localName;
            if (elementName === "group") {
                const id: string | null = groupElement.getAttribute("id");
                const name: string | null = groupElement.getAttribute("name");
                const scenario: string = groupElement.getAttribute("scenario") || "base";
                let memberElement: Element | null = groupElement.firstElementChild;
                if (memberElement && id && name) {
                    const elementName: string = memberElement.localName;
                    if (elementName === "numInGroup") {
                        const numInGroupId: string | null = memberElement.getAttribute("id");
                        if (numInGroupId) {
                            const groupModel = new GroupModel(id, name, numInGroupId, scenario);
                            groupsModel.add(groupModel);
                            memberElement = memberElement.nextElementSibling;
                            if (memberElement) {
                                this.extractStructureMembers(memberElement, groupModel);
                            }
                        }
                    }
                }
            }
            groupElement = iterator.iterateNext() as Element;
        }
    }
    private poulateMessagesModelFromDom(messagesModel: MessagesModel): void {
        const namespaceResolver: XPathNSResolver = new XPathEvaluator().createNSResolver(this.dom);
        const iterator: XPathResult = this.dom.evaluate("/fixr:repository/fixr:messages/fixr:message", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
        let messageElement: Element = iterator.iterateNext() as Element;
        while (messageElement) {
            let elementName: string = messageElement.localName;
            if (elementName === "message") {
                const id: string | null = messageElement.getAttribute("id");
                const name: string | null = messageElement.getAttribute("name");
                const msgType: string | null = messageElement.getAttribute("msgType");
                let scenario: string = messageElement.getAttribute("scenario") || "base";
                if (name && msgType) {
                    const messageModel: MessageModel = new MessageModel(id, name, msgType, scenario);
                    messagesModel.add(messageModel);
                    let structureElement = messageElement.firstElementChild;
                    if (structureElement) {
                        elementName = structureElement.localName;
                        if (elementName === "structure" && structureElement.firstElementChild) {
                            this.extractStructureMembers(structureElement.firstElementChild, messageModel);
                        }
                    }
                }
            }
            messageElement = iterator.iterateNext() as Element;
        }
    }
    private removeUnusedMessages(messagesModel: MessagesModel): void {
        const namespaceResolver: XPathNSResolver = new XPathEvaluator().createNSResolver(this.dom);
        const iterator: XPathResult = this.dom.evaluate("/fixr:repository/fixr:messages/fixr:message", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
        const elementsToRemove = new Array<Element>();
        var countMessagesRemoved : number = 0;
        let messageElement: Element = iterator.iterateNext() as Element;
        while (messageElement) {
            const elementName: string = messageElement.localName;
            if (elementName === "message") {
                const name: string | null = messageElement.getAttribute("name");
                const scenario: string = messageElement.getAttribute("scenario") || "base";
                if (name) {
                    const key: string = MessageModel.key(name, scenario);
                    const messageModel: MessageModel | undefined = messagesModel.get(key);
                    if (!messageModel || messageModel.uses === 0) {
                        elementsToRemove.push(messageElement);
                    }
                }
            }
            messageElement = iterator.iterateNext() as Element;
        }
        for (let element of elementsToRemove) {
            const parent = element.parentElement;
            if (parent) {
                parent.removeChild(element);
                countMessagesRemoved++ ;
            }
        }
        this.repositoryStatistics.Add("Messages.Removed",countMessagesRemoved);
    }
    private removeUnusedMessageMembers(messagesModel: MessagesModel): void {
        const namespaceResolver: XPathNSResolver = new XPathEvaluator().createNSResolver(this.dom);
        const iterator: XPathResult = this.dom.evaluate("/fixr:repository/fixr:messages/fixr:message", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
        const elementsToRemove = new Array<Element>();
        var countMembersRemoved : number = 0;
        let messageElement: Element = iterator.iterateNext() as Element;
        while (messageElement) {
            let elementName: string = messageElement.localName;
            if (elementName === "message") {
                const messageName: string | null = messageElement.getAttribute("name");
                const scenario: string = messageElement.getAttribute("scenario") || "base";
                if (messageName) {
                    const key: string = MessageModel.key(messageName, scenario);
                    const messageModel: MessageModel | undefined = messagesModel.get(key);
                    const structureElement: Element | null = messageElement.firstElementChild;
                    if (structureElement) {
                        let childElement: Element | null = structureElement.firstElementChild;
                        while (messageModel && childElement) {
                            elementName = childElement.localName;
                            switch (elementName) {
                                case "fieldRef":
                                    const id: string | null = childElement.getAttribute("id");
                                    if (id) {
                                        const fieldContext: FieldContext | undefined = messageModel.findFieldRef(id);
                                        if (fieldContext && fieldContext[0].uses === 0) {
                                            elementsToRemove.push(childElement);
                                        }
                                    }
                                    break;
                                case "componentRef":
                                    const componentId: string | null = childElement.getAttribute("id");
                                    if (componentId) {
                                        const componentRef: ComponentRef | undefined = messageModel.findComponentRef(componentId);
                                        if (componentRef && componentRef.uses === 0) {
                                            elementsToRemove.push(childElement);
                                        }
                                    }
                                    break;
                                case "groupRef":
                                    const groupId: string | null = childElement.getAttribute("id");
                                    if (groupId) {
                                        const groupRef: GroupRef | undefined = messageModel.findGroupRef(groupId);
                                        if (groupRef && groupRef.uses === 0) {
                                            elementsToRemove.push(childElement);
                                        }
                                    }
                                    break;
                            }
                            if (childElement) {
                                childElement = childElement.nextElementSibling;
                            }
                        }
                    }
                }
                messageElement = iterator.iterateNext() as Element;
            }
        }
        for (let element of elementsToRemove) {
            const parent = element.parentElement;
            if (parent) {
                parent.removeChild(element);
                countMembersRemoved++;
            }
        }
        this.repositoryStatistics.Add("Members.Unused", countMembersRemoved);
    }
    private updateDomCodes(codesetsModel: CodesetsModel): void {
        const namespaceResolver: XPathNSResolver = new XPathEvaluator().createNSResolver(this.dom);
        const codesetsSnapshot: XPathResult = this.dom.evaluate("/fixr:repository/fixr:codeSets", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
        const codesetsElement: Element = codesetsSnapshot.snapshotItem(0) as Element;
        const nodesSnapshot: XPathResult = this.dom.evaluate("/fixr:repository/fixr:codeSets/fixr:codeSet", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
        var countCodesUsed : number = 0;
        var countCustomCodes : number = 0;
        var countCodesRemoved : number = 0;
        codesetsModel.forEach((codeset: CodesetModel) => {
            const usedCodes: CodeModel[] = codeset.getUsedCodes();
            const usedCodeValues: string[] = usedCodes.map((cs) => cs.value);
            let codesetElement: Element | null = null;
            for (let i = 0; i < nodesSnapshot.snapshotLength; i++) {
                const node: Element = nodesSnapshot.snapshotItem(i) as Element;
                const name: string | null = node.getAttribute("name");
                const scenario: string = node.getAttribute("scenario") || "base";
                if (codeset.name === name && codeset.scenario === scenario) {
                    codesetElement = node;
                    break;
                }
            }
            if (!codesetElement) {
                codesetElement = this.dom.createElementNS(OrchestraFile.NAMESPACE, "fixr:codeSet");
                codesetElement.setAttribute("name", codeset.name);
                codesetElement.setAttribute("scenario", codeset.scenario);
                codesetElement.setAttribute("id", codeset.id);
                codesetElement.setAttribute("type", codeset.type);
                codesetsElement.appendChild(codesetElement);
            }
            if (usedCodes.length) {
                codesetElement.setAttribute("supported", "supported");
            }
            else if (!this.appendOnly) {
                codesetsElement.removeChild(codesetElement);
            }
            const codeElements: HTMLCollectionOf<Element> = codesetElement.getElementsByTagName("fixr:code");
            let domCodeValues: string[] = [];
            for (let i: number = 0; i < codeElements.length; i++) {
                const value: string | null = codeElements[i].getAttribute("value");
                if (value) {
                    domCodeValues.push(value);
                }
            }
            if (usedCodes.length > 0) {
                for (let i: number = 0; i < codeElements.length; i++) {
                    const value: string | null = codeElements[i].getAttribute("value");
                    if (value) {
                        const code: CodeModel | undefined = codeset.getByValue(value);
                        if (code && code.uses > 0) {
                            codeElements[i].setAttribute("supported", "supported");
                            countCodesUsed++;
                        }
                        else if (!this.appendOnly) {
                            codesetElement.removeChild(codeElements[i]);
                            countCodesRemoved++;
                        }
                    }
                }
            }
            const notFoundInDom: Array<string> = usedCodeValues.filter(x => domCodeValues.indexOf(x) < 0);
            notFoundInDom.forEach((value: string) => {
                const code: CodeModel | undefined = codeset.getByValue(value);
                if (code) {
                    const codeElement = this.dom.createElementNS(OrchestraFile.NAMESPACE, "fixr:code");
                    codeElement.setAttribute("name", code.name);
                    codeElement.setAttribute("id", code.id);
                    codeElement.setAttribute("value", code.value);
                    codeElement.setAttribute("supported", "supported");
                    if (codesetElement) {
                        codesetElement.appendChild(codeElement);
                        countCustomCodes++;
                    }
                }
            });
        });
        this.repositoryStatistics.Add("Codes.Used",countCodesUsed);
        this.repositoryStatistics.Add("Codes.Removed",countCodesRemoved);
        this.repositoryStatistics.Add("Codes.Added",countCustomCodes);
    }
    private isUserDefined(field: FieldModel) : boolean {
        let tagNumber: number = +field.id;
        if ((tagNumber >= 5000 && tagNumber <= 40000) || tagNumber >= 60000) {
            return true;
        }
        return false;
    }
    private updateDomFields(fieldsModel: FieldsModel): void {
        const namespaceResolver: XPathNSResolver = new XPathEvaluator().createNSResolver(this.dom);
        const fieldsSnapshot: XPathResult = this.dom.evaluate("/fixr:repository/fixr:fields", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
        const fieldsElement: Element = fieldsSnapshot.snapshotItem(0) as Element;
        const nodesSnapshot: XPathResult = this.dom.evaluate("/fixr:repository/fixr:fields/fixr:field", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
        let countFieldsUsed : number = 0;
        let countFieldsRemoved : number = 0;
        let countFieldsAdded : number = 0;
        let countFieldsUserDefined : number = 0 ;
        fieldsModel.forEach((field: FieldModel) => {
            let fieldElement: Element | null = null;
            for (let i = 0; i < nodesSnapshot.snapshotLength; i++) {
                const node: Element = nodesSnapshot.snapshotItem(i) as Element;
                const name: string | null = node.getAttribute("name");
                const scenario: string = node.getAttribute("scenario") || "base";
                if (field.name === name && field.scenario === scenario) {
                    fieldElement = node;
                    break;
                }
            }
            
            if (!fieldElement) {
                fieldElement = this.dom.createElementNS(OrchestraFile.NAMESPACE, "fixr:field");
                fieldElement.setAttribute("name", field.name);
                fieldElement.setAttribute("scenario", field.scenario);
                fieldElement.setAttribute("id", field.id);
                fieldElement.setAttribute("type", field.datatype);
                fieldsElement.appendChild(fieldElement);
                countFieldsAdded++;
            }
            if (field.uses > 0) {
                fieldElement.setAttribute("supported", "supported");
                countFieldsUsed++;
                if (this.isUserDefined(field)) {
                    countFieldsUserDefined++;
                }
            }
            else if (!this.appendOnly) {
                fieldsElement.removeChild(fieldElement);
                countFieldsRemoved++;
            }

        });
        this.repositoryStatistics.Add("Fields.Used",countFieldsUsed);
        this.repositoryStatistics.Add("Fields.Removed",countFieldsRemoved);
        this.repositoryStatistics.Add("Fields.Added",countFieldsAdded);
        this.repositoryStatistics.Add("Fields.UserDefined",countFieldsUserDefined);
    }
    private addDomComponents(componentsModel: ComponentsModel) {
        const namespaceResolver: XPathNSResolver = new XPathEvaluator().createNSResolver(this.dom);
        const componentsSnapshot: XPathResult = this.dom.evaluate("/fixr:repository/fixr:components", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
        const componentsElement: Element = componentsSnapshot.snapshotItem(0) as Element;
        const nodesSnapshot: XPathResult = this.dom.evaluate("/fixr:repository/fixr:components/fixr:component", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
        var countComponentsUsed: number = 0;
        var countComponentsRemoved : number = 0;
        var countComponentsAdded : number = 0;
        componentsModel.forEach((component: ComponentModel) => {
            let componentElement: Element | null = null;
            for (let i = 0; i < nodesSnapshot.snapshotLength; i++) {
                const node: Element = nodesSnapshot.snapshotItem(i) as Element;
                const name: string | null = node.getAttribute("name");
                const scenario: string = node.getAttribute("scenario") || "base";
                if (component.name === name && component.scenario === scenario) {
                    componentElement = node;
                    break;
                }
            }
            if (!componentElement) {
                componentElement = this.dom.createElementNS(OrchestraFile.NAMESPACE, "fixr:component");
                componentElement.setAttribute("name", component.name);
                componentElement.setAttribute("scenario", component.scenario);
                componentElement.setAttribute("id", component.id);
                componentsElement.appendChild(componentElement);
                this.addMembers(componentElement, component);
                countComponentsAdded++;
            }
            if (component.uses > 0) {
                componentElement.setAttribute("supported", "supported");
                countComponentsUsed++;
            }
            else if (!this.appendOnly) {
                componentsElement.removeChild(componentElement);
                countComponentsRemoved++;
            }
        });
        this.repositoryStatistics.Add("Components.Used", countComponentsUsed);
        this.repositoryStatistics.Add("Components.Removed",countComponentsRemoved);
        this.repositoryStatistics.Add("Components.Added",countComponentsAdded);
    }
    private addDomGroups(groupsModel: GroupsModel): void {
        const namespaceResolver: XPathNSResolver = new XPathEvaluator().createNSResolver(this.dom);
        const groupsSnapshot: XPathResult = this.dom.evaluate("/fixr:repository/fixr:groups", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
        const groupsElement: Element = groupsSnapshot.snapshotItem(0) as Element;
        const nodesSnapshot: XPathResult = this.dom.evaluate("/fixr:repository/fixr:groups/fixr:group", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
        var countGroupsUsed : number = 0;
        var countGroupsRemoved : number = 0;
        var countGroupsAdded : number = 0 ;
        groupsModel.forEach((group: GroupModel) => {
            let groupElement: Element | null = null;
            for (let i = 0; i < nodesSnapshot.snapshotLength; i++) {
                const node: Element = nodesSnapshot.snapshotItem(i) as Element;
                const name: string | null = node.getAttribute("name");
                const scenario: string = node.getAttribute("scenario") || "base";
                if (group.name === name && group.scenario === scenario) {
                    groupElement = node;
                    break;
                }
            }
            if (!groupElement) {
                groupElement = this.dom.createElementNS(OrchestraFile.NAMESPACE, "fixr:group");
                groupElement.setAttribute("name", group.name);
                groupElement.setAttribute("scenario", group.scenario);
                groupElement.setAttribute("id", group.id);
                groupsElement.appendChild(groupElement);
                const numInGroupElement = this.dom.createElementNS(OrchestraFile.NAMESPACE, "fixr:numInGroup");
                numInGroupElement.setAttribute("id", group.numInGroup);
                groupElement.appendChild(numInGroupElement);
                this.addMembers(groupElement, group);
                countGroupsAdded++;
            }
            if (group.uses > 0) {
                groupElement.setAttribute("supported", "supported");
                countGroupsUsed++;
            }
            else if (!this.appendOnly) {
                groupsElement.removeChild(groupElement);
                countGroupsRemoved++;
            }           
        });
        this.repositoryStatistics.Add("Groups.Used", countGroupsUsed);
        this.repositoryStatistics.Add("Groups.Removed", countGroupsRemoved);
        this.repositoryStatistics.Add("Groups.Added", countGroupsAdded);
    }
    private removeUnusedComponentMembers(componentsModel: ComponentsModel): void {
        const namespaceResolver: XPathNSResolver = new XPathEvaluator().createNSResolver(this.dom);
        const iterator: XPathResult = this.dom.evaluate("/fixr:repository/fixr:components/fixr:component", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
        const elementsToRemove = new Array<Element>();
        let componentElement: Element = iterator.iterateNext() as Element;
        while (componentElement) {
            let elementName: string = componentElement.localName;
            if (elementName === "component") {
                const componentName: string | null = componentElement.getAttribute("name");
                const scenario: string | null = componentElement.getAttribute("scenario") || "base";
                if (componentName) {
                    const key: string = ComponentModel.key(componentName, scenario);
                    const componentModel: ComponentModel | undefined = componentsModel.get(key);
                    let childElement: Element | null = componentElement.firstElementChild;
                    while (componentModel && childElement) {
                        elementName = childElement.localName;
                        switch (elementName) {
                            case "fieldRef":
                                const fieldId: string | null = childElement.getAttribute("id");
                                if (fieldId) {
                                    const fieldContext: FieldContext | undefined = componentModel.findFieldRef(fieldId);
                                    if (fieldContext && fieldContext[0].uses === 0) {
                                        elementsToRemove.push(childElement);
                                    }
                                }
                                break;
                            case "componentRef":
                                const componentId: string | null = childElement.getAttribute("id");
                                if (componentId) {
                                    const componentRef: ComponentRef | undefined = componentModel.findComponentRef(componentId);
                                    if (componentRef && componentRef.uses === 0) {
                                        elementsToRemove.push(childElement);
                                    }
                                }
                                break;
                            case "groupRef":
                                const groupId: string | null = childElement.getAttribute("id");
                                if (groupId) {
                                    const groupRef: GroupRef | undefined = componentModel.findGroupRef(groupId);
                                    if (groupRef && groupRef.uses === 0) {
                                        elementsToRemove.push(childElement);
                                    }
                                }
                                break;
                        }
                        childElement = childElement.nextElementSibling;
                    }
                }
            }
            componentElement = iterator.iterateNext() as Element;
        }
        for (let element of elementsToRemove) {
            const parent = element.parentElement;
            if (parent) {
                parent.removeChild(element);
            }
        }
    }
    private removeUnusedGroupMembers(groupsModel: GroupsModel): void {
        const namespaceResolver: XPathNSResolver = new XPathEvaluator().createNSResolver(this.dom);
        const iterator: XPathResult = this.dom.evaluate("/fixr:repository/fixr:groups/fixr:group", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
        const elementsToRemove = new Array<Element>();
        let componentElement: Element = iterator.iterateNext() as Element;
        while (componentElement) {
            let elementName: string = componentElement.localName;
            if (elementName === "group") {
                const groupName: string | null = componentElement.getAttribute("name");
                const scenario: string | null = componentElement.getAttribute("scenario") || "base";
                if (groupName) {
                    const key: string = GroupModel.key(groupName, scenario);
                    const groupModel: GroupModel | undefined = groupsModel.get(key);
                    let childElement: Element | null = componentElement.firstElementChild;
                    while (groupModel && childElement) {
                        elementName = childElement.localName;
                        switch (elementName) {
                            case "fieldRef":
                                const id: string | null = childElement.getAttribute("id");
                                if (id) {
                                    const fieldContext: FieldContext | undefined = groupModel.findFieldRef(id);
                                    if (fieldContext && fieldContext[0].uses === 0) {
                                        elementsToRemove.push(childElement);
                                    }
                                }
                                break;
                            case "componentRef":
                                const componentId: string | null = childElement.getAttribute("id");
                                if (componentId) {
                                    const componentRef: ComponentRef | undefined = groupModel.findComponentRef(componentId);
                                    if (componentRef && componentRef.uses === 0) {
                                        elementsToRemove.push(childElement);
                                    }
                                }
                                break;
                            case "groupRef":
                                const groupId: string | null = childElement.getAttribute("id");
                                if (groupId) {
                                    const groupRef: GroupRef | undefined = groupModel.findGroupRef(groupId);
                                    if (groupRef && groupRef.uses === 0) {
                                        elementsToRemove.push(childElement);
                                    }
                                }
                                break;
                        }
                        childElement = childElement.nextElementSibling;
                    }
                }
            }
            componentElement = iterator.iterateNext() as Element;
        }
        for (let element of elementsToRemove) {
            const parent = element.parentElement;
            if (parent) {
                parent.removeChild(element);
            }
        }
    }
    private removeUnusedComponents(componentsModel: ComponentsModel): void {
        const namespaceResolver: XPathNSResolver = new XPathEvaluator().createNSResolver(this.dom);
        const iterator: XPathResult = this.dom.evaluate("/fixr:repository/fixr:components/fixr:component", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
        const elementsToRemove = new Array<Element>();
        let componentElement: Element = iterator.iterateNext() as Element;
        while (componentElement) {
            const elementName: string = componentElement.localName;
            if (elementName === "component") {
                const name: string | null = componentElement.getAttribute("name");
                const scenario: string = componentElement.getAttribute("scenario") || "base";
                if (name) {
                    const key: string = ComponentModel.key(name, scenario);
                    const componentModel: ComponentModel | undefined = componentsModel.get(key);
                    if (!componentModel || componentModel.uses === 0) {
                        elementsToRemove.push(componentElement);
                    }
                }
            }
            componentElement = iterator.iterateNext() as Element;
        }
        for (let element of elementsToRemove) {
            const parent = element.parentElement;
            if (parent) {
                parent.removeChild(element);
            }
        }
    }
    private removeUnusedGroups(groups: GroupsModel): void {
        const namespaceResolver: XPathNSResolver = new XPathEvaluator().createNSResolver(this.dom);
        const iterator: XPathResult = this.dom.evaluate("/fixr:repository/fixr:groups/fixr:group", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
        const elementsToRemove = new Array<Element>();
        let groupElement: Element = iterator.iterateNext() as Element;
        while (groupElement) {
            const elementName: string = groupElement.localName;
            if (elementName === "group") {
                const name: string | null = groupElement.getAttribute("name");
                const scenario: string | null = groupElement.getAttribute("scenario") || "base";
                if (name) {
                    const key: string = GroupModel.key(name, scenario);
                    const groupModel: GroupModel | undefined = groups.get(key);
                    if (!groupModel || groupModel.uses === 0) {
                        elementsToRemove.push(groupElement);
                    }
                }
            }
            groupElement = iterator.iterateNext() as Element;
        }
        for (let element of elementsToRemove) {
            const parent = element.parentElement;
            if (parent) {
                parent.removeChild(element);
            }
        }
    }
    private extractStructureMembers(memberElement: Element, structuralModel: StructureModel): void {
        let nextElement: Element | null = memberElement;
        while (nextElement) {
            const elementName: string = nextElement.localName;
            let memberId: string | null = nextElement.getAttribute("id");
            if (memberId) {
                const presenceStr: string = nextElement.getAttribute("presence") || "optional";
                const presence: Presence = PresencefromString(presenceStr);
                switch (elementName) {
                    case "fieldRef":
                        const fieldRef: FieldRef = new FieldRef(memberId, structuralModel.scenario, presence);
                        if (presence === Presence.Constant) {
                            const value: string | null = memberElement.getAttribute("value");
                            if (value) {
                                fieldRef.value = value;
                            }
                        }
                        else {
                            const assignElement: Element = memberElement.getElementsByTagName("fixr:assign")[0];
                            if (assignElement) {
                                const assignExpression: string | null = assignElement.childNodes[0].nodeValue;
                                if (assignExpression) {
                                    fieldRef.value = assignExpression;
                                }
                            }
                        }
                        structuralModel.addMember(fieldRef);
                        break;
                    case "componentRef":
                        const componentRef: ComponentRef = new ComponentRef(memberId, structuralModel.scenario, presence);
                        structuralModel.addMember(componentRef);
                        break;
                    case "groupRef":
                        const groupRef: GroupRef = new GroupRef(memberId, structuralModel.scenario, presence);
                        structuralModel.addMember(groupRef);
                        break;
                }
            }
            nextElement = nextElement.nextElementSibling;
        }
    }
}
