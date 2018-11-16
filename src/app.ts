var referenceFile: File;
var logFiles: File[];
var orchestraFileName: string = "myorchestra.xml";

var inputOrchestra = function (event) {
    referenceFile = event.target.files[0];
    removeAlert();
};

/**
 * Select one or more log files to parse
 */
var inputLogs = function (event) {
    logFiles = event.target.files;
    removeAlert();
};

var outputOrchestra = function (event) {
    orchestraFileName = event.target.value;
    removeAlert();
};

var createOrchestra = async function (event) {
    let isValid: boolean = validateInput(event);
    if (isValid) {
        removeAlert();
        let inputProgress: HTMLElement = document.getElementById("inputFileBar");
        let input = new OrchestraFile(referenceFile, inputProgress);
        try {
            // read local reference Orchestra file
            await input.readFile();

            // populate model from reference Orchestra file
            let referenceModel: OrchestraModel = new OrchestraModel();
            input.extractOrchestraModel(referenceModel);
            ComponentRef.componentsModel = referenceModel.components;
            GroupRef.groupsModel = referenceModel.groups;

            // it takes a bit of a data dictionary to parse FIX; inform FIX parser of special fields
            let lengthFieldIds: string[] = referenceModel.fields.getIdsByDatatype("Length");
            // tag 9 is of Length type but is message length, not field length
            lengthFieldIds.splice(lengthFieldIds.indexOf("9"), 1);
            TVFieldParser.lengthFieldIds = lengthFieldIds;

            let outputProgress: HTMLElement = document.getElementById("outputFileBar");
            let output = new OrchestraFile(new File([""], orchestraFileName), outputProgress);
            // clones reference dom to output file
            output.dom = input.cloneDom();

            // read and parse one or more FIX logs
            let logProgress: HTMLElement = document.getElementById("logFileBar");
            let logModel: LogModel = new LogModel(referenceModel);
            for (let i = 0; i < logFiles.length; i++) {
                let logReader: LogReader = new LogReader(logFiles[i], logProgress, logModel.messageListener);
                await logReader.readFile();
            }

            // update the output Orchestra file from the model
            output.updateDomFromModel(logModel, outputProgress);
            let contents: Blob = output.contents();

            // create link to download the file locally
            createLink(contents);
        } catch (e) {
            alert(e.message);
        }

    } else {
        createAlert("Enter missing field");
    }
}

var validateInput = function (event): boolean {
    let isValid: boolean = true;
    if (!referenceFile || !logFiles) {
        isValid = false;
    }
    return isValid;
}

var createAlert = function (text: string): void {
    let txtNd = document.createTextNode(text);
    let msg = document.createElement("div");
    msg.setAttribute("id", "msg");
    msg.setAttribute("class", "container");
    msg.appendChild(txtNd);
    document.body.appendChild(msg);
}

var removeAlert = function (): void {
    let msg = document.getElementById("msg");
    if (msg) {
        document.body.removeChild(msg);
    }
}

var showProgress = function (progressNode: HTMLElement, percent: number): void {
    if (percent >= 0) {
        let percentString: string = Math.floor(percent).toString() + "%";
        progressNode.style.width = percentString;
        progressNode.innerHTML = percentString;
    } else {
        progressNode.style.backgroundColor = "red";
    }
    progressNode.parentElement.style.visibility = "visible";
}

var createLink = function (contents: Blob) {
    let output: HTMLElement = document.getElementById("output");
    let prevLink: HTMLAnchorElement = output.querySelector('a');
    if (prevLink) {
        window.URL.revokeObjectURL(prevLink.href);
        output.innerHTML = '';
    }

    let a: HTMLAnchorElement = document.createElement('a');
    a.download = orchestraFileName;
    a.href = window.URL.createObjectURL(contents);
    a.dataset.downloadurl = [OrchestraFile.MIME_TYPE, a.download, a.href].join(':');
    a.textContent = 'File ready';

    output.appendChild(a);
    a.onclick = function (e) {
        if ('disabled' in this.dataset) {
            return false;
        }

        cleanUp(this);
    };

    var cleanUp = function (a) {
        a.textContent = 'Downloaded';
        a.dataset.disabled = true;

        setTimeout(function () {
            window.URL.revokeObjectURL(a.href);
        }, 1500);
    };
}

/**
 * Produce a string to be used as a key in keyed collection such as Map and Set
 */
interface Keyed {
    key(): string;
}

/**
 * Counts uses of an object
 * Note: tried to implement this as a mix-in but couldn't get to work with generics
 */
interface Usable {
    readonly uses: number;

    /**
     * Increments the count
     */
    use(): void;
}

enum IsSupported {
    Supported = "supported",
    Forbidden = "forbidden",
    Ignored = "ignored"
}

namespace IsSupported {
    /**
     * Reverse mapping for IsSupported enum
     * @param str string value from DOM
     */
    export function stringToSupported(str: string): IsSupported {
        switch (str) {
            case "forbidden":
                return IsSupported.Forbidden;
            case "ignored":
                return IsSupported.Ignored;
            default:
                return IsSupported.Supported;
        }
    }
}

class OrchestraFile {
    static readonly MIME_TYPE: string = "application/xml";

    private file: File;
    private document: Document = new Document();
    private progressNode: HTMLElement;

    constructor(file: File, progressNode: HTMLElement) {
        this.file = file;
        this.progressNode = progressNode;
    }

    static parse(xml: string): Document {
        let parser = new DOMParser();
        return parser.parseFromString(xml, OrchestraFile.MIME_TYPE);
    }

    static serialize(document: Document): string {
        let serializer = new XMLSerializer();
        return serializer.serializeToString(document);
    }


    get dom(): Document {
        return this.document;
    }

    cloneDom(): Document {
        let newDocument: Document = this.document.implementation.createDocument(
            this.document.namespaceURI, //namespace to use
            null,                     //name of the root element (or for empty document)
            null                      //doctype (null for XML)
        );
        let rootNode: Node = this.document.documentElement;
        let newNode: Node = newDocument.importNode(
            rootNode, //node to import
            true                         //clone its descendants
        );
        newDocument.appendChild(newNode);
        return newDocument;
    }

    set dom(document: Document) {
        this.document = document;
    }

    get size(): number {
        return this.file.size;
    }

    readFile(): Promise<void> {
        let reader = new FileReader();

        return new Promise<void>((resolve, reject) => {
            reader.onload = () => {
                showProgress(this.progressNode, 100);
                let res = reader.result;
                if (typeof res === "string") {
                    this.dom = OrchestraFile.parse(res);
                } else {
                    this.dom = OrchestraFile.parse(res.toString());
                }
                resolve();
            }
            reader.onerror = () => {
                showProgress(this.progressNode, -1);
                reader.abort();
                reject(reader.error);
            }
            reader.onprogress = (event: ProgressEvent) => {
                if (event.lengthComputable) {
                    showProgress(this.progressNode, Math.floor(event.loaded * 100 / event.total));
                }
            }
            reader.readAsText(this.file);
        });
    }

    updateDomFromModel(logModel: LogModel, progressNode: HTMLElement): void {
        this.updateDomMetadata();
        this.removeUnusedMessages(logModel.model.messages);
        showProgress(progressNode, 10);
        this.removeUnusedMessageMembers(logModel.model.messages);
        this.removeUnusedComponentMembers(logModel.model.components);
        showProgress(progressNode, 20);
        this.removeUnusedGroupMembers(logModel.model.groups);
        this.removeUnusedComponents(logModel.model.components);
        showProgress(progressNode, 30);
        this.removeUnusedGroups(logModel.model.groups);
        showProgress(progressNode, 40);
        this.updateDomCodes(logModel.model.codesets);
        showProgress(progressNode, 50);
        this.updateDomFields(logModel.model.fields);
        showProgress(progressNode, 100);
    }

    private updateDomMetadata(): void {
        let namespaceResolver: XPathNSResolver = document.createNSResolver(this.dom);
        let nodesSnapshot: XPathResult = this.dom.evaluate("/fixr:repository/fixr:metadata", this.dom, namespaceResolver,
            XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
        let metadataElement: Element = nodesSnapshot.snapshotItem(0) as Element;
        let contributorElement: Element = this.dom.createElement("dc:contributor");
        let textNode: Text = this.dom.createTextNode("log2orchestra");
        contributorElement.appendChild(textNode);
        metadataElement.appendChild(contributorElement);

        let timestamp: string = new Date().toISOString();
        let dateElement: Element = metadataElement.getElementsByTagName("dc:date")[0];
        if (dateElement) {
            dateElement.childNodes[0].nodeValue = timestamp;
        } else {
            dateElement = this.dom.createElement("dc:date");
            let timeText: Text = this.dom.createTextNode(timestamp);
            dateElement.appendChild(timeText);
            metadataElement.appendChild(dateElement);
        }
    }

    contents(): Blob {
        return new Blob([OrchestraFile.serialize(this.document)], { type: OrchestraFile.MIME_TYPE })
    }

    public extractOrchestraModel(orchestraModel: OrchestraModel) {
        this.extractFieldsModel(orchestraModel.fields);
        this.extractCodesetsModel(orchestraModel.codesets);
        this.extractComponentsModel(orchestraModel.components);
        this.extractGroupsModel(orchestraModel.groups);
        this.extractMessagesModel(orchestraModel.messages);
    }

    private extractFieldsModel(fieldsModel: FieldsModel): void {
        let namespaceResolver: XPathNSResolver = document.createNSResolver(this.dom);
        let iterator: XPathResult = this.dom.evaluate("/fixr:repository/fixr:fields/fixr:field", this.dom, namespaceResolver,
            XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
        let element: Element = iterator.iterateNext() as Element;
        while (element) {
            let elementName: string = element.localName;
            if (elementName === "field") {
                let id: string = element.getAttribute("id");
                let name: string = element.getAttribute("name");
                let type: string = element.getAttribute("type");
                let scenario: string = element.getAttribute("scenario");
                fieldsModel.add(new FieldModel(id, name, type, scenario));
            }
            element = iterator.iterateNext() as Element;
        }
    }

    private extractCodesetsModel(codesetsModel: CodesetsModel): void {
        let namespaceResolver: XPathNSResolver = document.createNSResolver(this.dom);
        let iterator: XPathResult = this.dom.evaluate("/fixr:repository/fixr:codeSets/fixr:codeSet", this.dom, namespaceResolver,
            XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
        let codesetElement: Element = iterator.iterateNext() as Element;
        while (codesetElement) {
            let id: string = codesetElement.getAttribute("id");
            let name: string = codesetElement.getAttribute("name");
            let scenario: string = codesetElement.getAttribute("scenario");
            let type: string = codesetElement.getAttribute("type");
            let supported: string = codesetElement.getAttribute("supported");
            let codeset = new CodesetModel(id, name, scenario, type, IsSupported.stringToSupported(supported));
            codesetsModel.set(codeset.key(), codeset);
            let childElement: Element = codesetElement.firstElementChild;
            while (childElement) {
                let elementName: string = childElement.localName;
                if (elementName === "code") {
                    let name: string = childElement.getAttribute("name");
                    let value: string = childElement.getAttribute("value");
                    supported = childElement.getAttribute("supported");
                    let code: CodeModel = new CodeModel(name, value, IsSupported.stringToSupported(supported));
                    codeset.add(code);
                }
                childElement = childElement.nextElementSibling;
            }
            codesetElement = iterator.iterateNext() as Element;
        }
    }

    private extractComponentsModel(componentsModel: ComponentsModel): void {
        let namespaceResolver: XPathNSResolver = document.createNSResolver(this.dom);
        let iterator: XPathResult = this.dom.evaluate("/fixr:repository/fixr:components/fixr:component", this.dom, namespaceResolver,
            XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
        let componentElement: Element = iterator.iterateNext() as Element;
        while (componentElement) {
            let elementName: string = componentElement.localName;
            if (elementName === "component") {
                let id: string = componentElement.getAttribute("id");
                let name: string = componentElement.getAttribute("name");
                let scenario: string = componentElement.getAttribute("scenario");
                let componentModel = new ComponentModel(id, name, scenario);
                componentsModel.add(componentModel);
                let memberElement: Element = componentElement.firstElementChild;
                this.addMembers(memberElement, componentModel);
            }
            componentElement = iterator.iterateNext() as Element;
        }
    }

    private extractGroupsModel(groupsModel: GroupsModel): void {
        let namespaceResolver: XPathNSResolver = document.createNSResolver(this.dom);
        let iterator: XPathResult = this.dom.evaluate("/fixr:repository/fixr:groups/fixr:group", this.dom, namespaceResolver,
            XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
        let groupElement: Element = iterator.iterateNext() as Element;
        while (groupElement) {
            let elementName: string = groupElement.localName;
            if (elementName === "group") {
                let id: string = groupElement.getAttribute("id");
                let name: string = groupElement.getAttribute("name");
                let scenario: string = groupElement.getAttribute("scenario");
                let memberElement: Element = groupElement.firstElementChild;
                let elementName: string = memberElement.localName;
                if (elementName === "numInGroup") {
                    let numInGroupId: string = memberElement.getAttribute("id");
                    let groupModel = new GroupModel(id, name, numInGroupId, scenario);
                    groupsModel.add(groupModel);
                    memberElement = memberElement.nextElementSibling
                    this.addMembers(memberElement, groupModel);
                }
            }
            groupElement = iterator.iterateNext() as Element;
        }
    }

    private extractMessagesModel(messagesModel: MessagesModel): void {
        let namespaceResolver: XPathNSResolver = document.createNSResolver(this.dom);
        let iterator: XPathResult = this.dom.evaluate("/fixr:repository/fixr:messages/fixr:message", this.dom, namespaceResolver,
            XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
        let messageElement: Element = iterator.iterateNext() as Element;
        while (messageElement) {
            let elementName: string = messageElement.localName;
            if (elementName === "message") {
                let id: string = messageElement.getAttribute("id");
                let name: string = messageElement.getAttribute("name");
                let msgType: string = messageElement.getAttribute("msgType");
                let scenario: string = messageElement.getAttribute("scenario");
                let messageModel: MessageModel = new MessageModel(id, name, msgType, scenario);
                messagesModel.add(messageModel);
                let structureElement = messageElement.firstElementChild;
                elementName = structureElement.localName;
                if (elementName === "structure") {
                    this.addMembers(structureElement.firstElementChild, messageModel);
                }
            }
            messageElement = iterator.iterateNext() as Element;
        }
    }

    private removeUnusedMessages(messagesModel: MessagesModel): void {
        let namespaceResolver: XPathNSResolver = document.createNSResolver(this.dom);
        let iterator: XPathResult = this.dom.evaluate("/fixr:repository/fixr:messages/fixr:message", this.dom, namespaceResolver,
            XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
        let elementsToRemove = new Array<Element>();
        let messageElement: Element = iterator.iterateNext() as Element;
        while (messageElement) {
            let elementName: string = messageElement.localName;
            if (elementName === "message") {
                let name: string = messageElement.getAttribute("name");
                let scenario: string = messageElement.getAttribute("scenario") || "base";
                let key: string = name + "." + scenario;
                let messageModel: MessageModel = messagesModel.get(key);
                if (!messageModel || messageModel.uses === 0) {
                    elementsToRemove.push(messageElement);
                }
            }
            messageElement = iterator.iterateNext() as Element;
        }
        for (let element of elementsToRemove) {
            let parent = element.parentElement;
            parent.removeChild(element);
        }
    }

    private removeUnusedMessageMembers(messagesModel: MessagesModel): void {
        let namespaceResolver: XPathNSResolver = document.createNSResolver(this.dom);
        let iterator: XPathResult = this.dom.evaluate("/fixr:repository/fixr:messages/fixr:message", this.dom, namespaceResolver,
            XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
        let elementsToRemove = new Array<Element>();
        let messageElement: Element = iterator.iterateNext() as Element;
        while (messageElement) {
            let elementName: string = messageElement.localName;
            if (elementName === "message") {
                let messageName: string = messageElement.getAttribute("name");
                let scenario: string = messageElement.getAttribute("scenario") || "base";
                let key: string = messageName + "." + scenario;
                let messageModel: MessageModel = messagesModel.get(key);
                let structureElement: Element = messageElement.firstElementChild;
                let childElement: Element = structureElement.firstElementChild;
                while (childElement) {
                    elementName = childElement.localName;
                    switch (elementName) {
                        case "fieldRef":
                            let id: string = childElement.getAttribute("id");
                            let fieldContext: FieldContext = messageModel.findFieldRef(id);
                            if (fieldContext[0].uses === 0) {
                                elementsToRemove.push(childElement);
                            }
                            break;
                        case "componentRef":
                            let componentId: string = childElement.getAttribute("id");
                            let componentRef: ComponentRef = messageModel.findComponentRef(componentId);
                            if (componentRef.uses === 0) {
                                elementsToRemove.push(childElement);
                            }
                            break;
                        case "groupRef":
                            let groupId: string = childElement.getAttribute("id");
                            let groupRef: GroupRef = messageModel.findGroupRef(groupId);
                            if (groupRef.uses === 0) {
                                elementsToRemove.push(childElement);
                            }
                            break;
                    }
                    childElement = childElement.nextElementSibling;
                }
            }
            messageElement = iterator.iterateNext() as Element;
        }
        for (let element of elementsToRemove) {
            let parent = element.parentElement;
            parent.removeChild(element);
        }
    }

    private updateDomCodes(codesetsModel: CodesetsModel): void {
        let namespaceResolver: XPathNSResolver = document.createNSResolver(this.dom);
        let nodesSnapshot: XPathResult = this.dom.evaluate("/fixr:repository/fixr:codeSets", this.dom, namespaceResolver,
            XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
        let codesetsElement: Element = nodesSnapshot.snapshotItem(0) as Element;

        codesetsModel.forEach((codeset: CodesetModel) => {
            let usedCodes: CodeModel[] = codeset.getUsedCodes();
            let usedCodeValues: string[] = usedCodes.map((cs) => cs.value);

            if (codeset.scenario === CodesetModel.defaultScenario) {
                nodesSnapshot = this.dom.evaluate("/fixr:repository/fixr:codeSets/fixr:codeSet[@name='" + codeset.name + "' and (@scenario='base' or not(@scenario))]", this.dom, namespaceResolver,
                    XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
            } else {
                nodesSnapshot = this.dom.evaluate("/fixr:repository/fixr:codeSets/fixr:codeSet[@name='" + codeset.name + "' and @scenario= '" + codeset.scenario + "']",
                    this.dom, namespaceResolver,
                    XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
            }
            let codesetElement: Element = nodesSnapshot.snapshotItem(0) as Element;
            if (!codesetElement) {
                codesetElement = this.dom.createElementNS("http://fixprotocol.io/2016/fixrepository", "codeSet");
                codesetElement.setAttribute("name", codeset.name);
                codesetElement.setAttribute("scenario", codeset.scenario);
                codesetElement.setAttribute("id", codeset.id);
                codesetElement.setAttribute("type", codeset.type);
                codesetsElement.appendChild(codesetElement);
            }

            if (usedCodes.length) {
                codesetElement.setAttribute("supported", "supported");
            } else {
                codesetElement.setAttribute("supported", "ignored");
            }

            let codeNodes = codesetElement.getElementsByTagName("fixr:code");
            let domCodeValues: string[] = [];
            for (let i: number = 0; i < codeNodes.length; i++) {
                let value: string = codeNodes[i].getAttribute("value");
                domCodeValues.push(value);
            }

            if (usedCodes.length > 0) {
                for (let i: number = 0; i < codeNodes.length; i++) {
                    let value: string = codeNodes[i].getAttribute("value");
                    let code: CodeModel = codeset.getByValue(value);
                    if (code.uses > 0) {
                        codeNodes[i].setAttribute("supported", "supported");
                    } else {
                        codeNodes[i].setAttribute("supported", "forbidden");
                    }
                }
            }

            let notFoundInDom: Array<string> = usedCodeValues.filter(x => domCodeValues.indexOf(x) < 0);
            notFoundInDom.forEach((value: string) => {
                let code: CodeModel = codeset.getByValue(value);
                let codeElement = this.dom.createElementNS("http://fixprotocol.io/2016/fixrepository", "code");
                codeElement.setAttribute("name", code.name);
                codeElement.setAttribute("value", code.value);
                codeElement.setAttribute("supported", "supported");
                codesetElement.appendChild(codeElement);
            });


        });
    }

    private updateDomFields(fieldsModel: FieldsModel): void {
        let namespaceResolver: XPathNSResolver = document.createNSResolver(this.dom);
        let nodesSnapshot: XPathResult = this.dom.evaluate("/fixr:repository/fixr:fields", this.dom, namespaceResolver,
            XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
        let fieldsElement: Element = nodesSnapshot.snapshotItem(0) as Element;

        fieldsModel.forEach((field: FieldModel) => {

            if (field.scenario === FieldModel.defaultScenario) {
                nodesSnapshot = this.dom.evaluate("/fixr:repository/fixr:fields/fixr:field[@name='" + field.name + "' and (@scenario='base' or not(@scenario))]", this.dom, namespaceResolver,
                    XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
            } else {
                nodesSnapshot = this.dom.evaluate("/fixr:repository/fixr:fields/fixr:field[@name='" + field.name + "' and @scenario= '" + field.scenario + "']",
                    this.dom, namespaceResolver,
                    XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
            }
            let fieldElement: Element = nodesSnapshot.snapshotItem(0) as Element;
            if (!fieldElement) {
                fieldElement = this.dom.createElement("fixr:field");
                fieldElement.setAttribute("name", field.name);
                fieldElement.setAttribute("scenario", field.scenario);
                fieldElement.setAttribute("id", field.id);
                fieldElement.setAttribute("type", field.datatype);
                fieldsElement.appendChild(fieldElement);
            }

            if (field.uses > 0) {
                fieldElement.setAttribute("supported", "supported");
            } else {
                fieldElement.setAttribute("supported", "ignored");
            }
        });

    }

    private removeUnusedComponentMembers(componentsModel: ComponentsModel): void {
        let namespaceResolver: XPathNSResolver = document.createNSResolver(this.dom);
        let iterator: XPathResult = this.dom.evaluate("/fixr:repository/fixr:components/fixr:component", this.dom, namespaceResolver,
            XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
        let elementsToRemove = new Array<Element>();
        let componentElement: Element = iterator.iterateNext() as Element;
        while (componentElement) {
            let elementName: string = componentElement.localName;
            if (elementName === "component") {
                let componentName: string = componentElement.getAttribute("name");
                let scenario: string = componentElement.getAttribute("scenario") || "base";
                let key: string = componentName + "." + scenario;
                let componentModel: ComponentModel = componentsModel.get(key);
                let childElement: Element = componentElement.firstElementChild;
                while (childElement) {
                    elementName = childElement.localName;

                    switch (elementName) {
                        case "fieldRef":
                            let fieldId: string = childElement.getAttribute("id");
                            let fieldContext: FieldContext = componentModel.findFieldRef(fieldId);
                            if (fieldContext[0].uses === 0) {
                                elementsToRemove.push(childElement);
                            }
                            break;
                        case "componentRef":
                            let componentId: string = childElement.getAttribute("id");
                            let componentRef: ComponentRef = componentModel.findComponentRef(componentId);
                            if (componentRef.uses === 0) {
                                elementsToRemove.push(childElement);
                            }
                            break;
                        case "groupRef":
                            let groupId: string = childElement.getAttribute("id");
                            let groupRef: GroupRef = componentModel.findGroupRef(groupId);
                            if (groupRef.uses === 0) {
                                elementsToRemove.push(childElement);
                            }
                            break;
                    }
                    childElement = childElement.nextElementSibling;
                }
            }
            componentElement = iterator.iterateNext() as Element;
        }
        for (let element of elementsToRemove) {
            let parent = element.parentElement;
            parent.removeChild(element);
        }
    }

    private removeUnusedGroupMembers(groupsModel: GroupsModel): void {
        let namespaceResolver: XPathNSResolver = document.createNSResolver(this.dom);
        let iterator: XPathResult = this.dom.evaluate("/fixr:repository/fixr:groups/fixr:group", this.dom, namespaceResolver,
            XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
        let elementsToRemove = new Array<Element>();
        let componentElement: Element = iterator.iterateNext() as Element;
        while (componentElement) {
            let elementName: string = componentElement.localName;
            if (elementName === "group") {
                let componentName: string = componentElement.getAttribute("name");
                let scenario: string = componentElement.getAttribute("scenario") || "base";
                let key: string = componentName + "." + scenario;
                let groupModel: GroupModel = groupsModel.get(key);
                let childElement: Element = componentElement.firstElementChild;
                while (childElement) {
                    elementName = childElement.localName;
                    switch (elementName) {
                        case "fieldRef":
                            let id: string = childElement.getAttribute("id");
                            let fieldContext: FieldContext = groupModel.findFieldRef(id);
                            if (fieldContext[0].uses === 0) {
                                elementsToRemove.push(childElement);
                            }
                            break;
                        case "componentRef":
                            let componentId: string = childElement.getAttribute("id");
                            let componentRef: ComponentRef = groupModel.findComponentRef(componentId);
                            if (componentRef.uses === 0) {
                                elementsToRemove.push(childElement);
                            }
                            break;
                        case "groupRef":
                            let groupId: string = childElement.getAttribute("id");
                            let groupRef: GroupRef = groupModel.findGroupRef(groupId);
                            if (groupRef.uses === 0) {
                                elementsToRemove.push(childElement);
                            }
                            break;
                    }
                    childElement = childElement.nextElementSibling;
                }
            }
            componentElement = iterator.iterateNext() as Element;
        }
        for (let element of elementsToRemove) {
            let parent = element.parentElement;
            parent.removeChild(element);
        }
    }

    private removeUnusedComponents(componentsModel: ComponentsModel): void {
        let namespaceResolver: XPathNSResolver = document.createNSResolver(this.dom);
        let iterator: XPathResult = this.dom.evaluate("/fixr:repository/fixr:components/fixr:component", this.dom, namespaceResolver,
            XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
        let elementsToRemove = new Array<Element>();
        let componentElement: Element = iterator.iterateNext() as Element;
        while (componentElement) {
            let elementName: string = componentElement.localName;
            if (elementName === "component") {
                let name: string = componentElement.getAttribute("name");
                let scenario: string = componentElement.getAttribute("scenario") || "base";
                let key: string = name + "." + scenario;
                let componentModel: ComponentModel = componentsModel.get(key);
                if (!componentModel || componentModel.uses === 0) {
                    elementsToRemove.push(componentElement);
                }
            }
            componentElement = iterator.iterateNext() as Element;
        }
        for (let element of elementsToRemove) {
            let parent = element.parentElement;
            parent.removeChild(element);
        }
    }

    private removeUnusedGroups(groups: GroupsModel): void {
        let namespaceResolver: XPathNSResolver = document.createNSResolver(this.dom);
        let iterator: XPathResult = this.dom.evaluate("/fixr:repository/fixr:groups/fixr:group", this.dom, namespaceResolver,
            XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
        let elementsToRemove = new Array<Element>();
        let groupElement: Element = iterator.iterateNext() as Element;
        while (groupElement) {
            let elementName: string = groupElement.localName;
            if (elementName === "group") {
                let name: string = groupElement.getAttribute("name");
                let scenario: string = groupElement.getAttribute("scenario") || "base";
                let key: string = name + "." + scenario;
                let groupModel: GroupModel = groups.get(key);
                if (!groupModel || groupModel.uses === 0) {
                    elementsToRemove.push(groupElement);
                }
            }
            groupElement = iterator.iterateNext() as Element;
        }
        for (let element of elementsToRemove) {
            let parent = element.parentElement;
            parent.removeChild(element);
        }
    }

    private addMembers(memberElement: Element, structuralModel: StructureModel): void {
        while (memberElement) {
            let elementName: string = memberElement.localName;
            let memberId: string = memberElement.getAttribute("id");
            switch (elementName) {
                case "fieldRef":
                    let fieldRef: FieldRef = new FieldRef(memberId, undefined, undefined);
                    structuralModel.addMember(fieldRef);
                    break;
                case "componentRef":
                    let componentRef: ComponentRef = new ComponentRef(memberId, structuralModel.scenario);
                    structuralModel.addMember(componentRef);
                    break;
                case "groupRef":
                    let groupRef: GroupRef = new GroupRef(memberId, structuralModel.scenario);
                    structuralModel.addMember(groupRef);
                    break;
            }
            memberElement = memberElement.nextElementSibling;
        }
    }
}

class FieldModel implements Keyed, Usable {
    static readonly defaultScenario = "base";
    static readonly defaultDatatype = "String";

    readonly id: string;
    readonly name: string;
    readonly datatype: string;
    readonly scenario: string;

    constructor(id: string, name: string, type: string, scenario: string, public uses = 0) {
        this.id = id;
        this.name = name;
        if (type) {
            this.datatype = type;
        } else {
            this.datatype = FieldModel.defaultDatatype;
        }
        if (scenario) {
            this.scenario = scenario;
        } else {
            this.scenario = FieldModel.defaultScenario;
        }
    }

    key(): string {
        return this.name + "." + this.scenario;
    }

    use() {
        this.uses++;
    }
}

/**
 * Maps key to field
 */
class FieldsModel extends Map<string, FieldModel> {
    private fieldIdMap: Map<string, FieldModel> = new Map();

    constructor() {
        super();
    }

    add(field: FieldModel): this {
        this.fieldIdMap.set(field.id, field);
        return this.set(field.key(), field);
    }

    getById(id: string): FieldModel {
        return this.fieldIdMap.get(id);
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

class CodeModel implements Usable {
    readonly name: string;
    readonly value: string;
    private isSupported: IsSupported;

    constructor(name: string, value: string, supported: IsSupported, public uses = 0) {
        this.name = name;
        this.value = value;
        this.supported = supported;
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

abstract class StructureMember implements Keyed, Usable {
    static readonly defaultScenario = "base";

    readonly id: string;
    readonly scenario: string;
    private parentStructure: StructureModel;

    constructor(id: string, scenario: string, public supported: IsSupported = IsSupported.Supported, public uses = 0) {
        this.id = id;
        if (scenario) {
            this.scenario = scenario;
        } else {
            this.scenario = StructureMember.defaultScenario;
        }
    }

    key(): string {
        return this.id + "." + this.scenario;
    }

    get parent(): StructureModel {
        return this.parentStructure;
    }

    set parent(parent: StructureModel) {
        this.parentStructure = parent;
    }

    use(): void {
        this.uses++;
    }

}

/**
 * The context of a field reference as a tuple of a FieldRef,
 * contained by a container of the reference, i.e. a message or component or group,
 * and a reference to component or group.
 */
type FieldContext = [FieldRef, StructureModel, StructureMember];

abstract class StructureModel implements Keyed, Usable {
    static readonly defaultScenario = "base";

    readonly id: string;
    readonly name: string;
    readonly scenario: string;
    readonly members = new Array<StructureMember>();

    constructor(id: string, name: string, scenario: string, public supported: IsSupported = IsSupported.Supported, public uses = 0) {
        this.id = id;
        this.name = name;
        if (scenario) {
            this.scenario = scenario;
        } else {
            this.scenario = StructureModel.defaultScenario;
        }
    }

    key(): string {
        return this.name + "." + this.scenario;
    }

    addMember(member: StructureMember): void {
        this.members.push(member);
        member.parent = this;
    }

    /**
     * Returns an instance of a ComponentRef in this structure. Does not perform a tree walk.
     * @param id ID of the component
     * @returns a ComponentRef or undefined if not found
     */
    findComponentRef(id: string): ComponentRef {
        for (const member of this.members) {
            if (member.id == id && member instanceof ComponentRef) {
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
    findGroupRef(id: string): GroupRef {
        for (const member of this.members) {
            if (member.id == id && member instanceof GroupRef) {
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
            if (member.id == id && member instanceof FieldRef) {
                let fieldContext: FieldContext = [member, this, undefined];
                return fieldContext;
            } else if (member instanceof ComponentRef) {
                let fieldContext: FieldContext = member.findFieldRef(id);
                if (fieldContext[0]) {
                    return fieldContext;
                }
            } else if (member instanceof GroupRef) {
                let fieldContext: FieldContext = member.findFieldRef(id);
                if (fieldContext[0]) {
                    return fieldContext;
                }
            }
        }
        return [undefined, undefined, undefined];
    }

    use(): void {
        this.uses++;
    }
}

class StructureModelMap<T extends StructureModel> extends Map<string, T> {

    constructor() {
        super();
    }

    add(sm: T): this {
        return this.set(sm.key(), sm);
    }

}

class FieldRef extends StructureMember {
    private fieldModel: FieldModel;
    private codesetModel: CodesetModel;

    constructor(id: string, scenario: string, supported: IsSupported = IsSupported.Supported, uses: number = 0) {
        super(id, scenario, supported, uses);
    }

    get field(): FieldModel {
        return this.fieldModel;
    }

    set field(fieldModel: FieldModel) {
        this.fieldModel = fieldModel;
    }

    get codeset(): CodesetModel {
        return this.codesetModel;
    }

    set codeset(codesetModel: CodesetModel) {
        this.codesetModel = codesetModel;
    }

    use(): void {
        super.use();
        if (this.field) {
            this.field.use();
        }
    }

}

class ComponentRef extends StructureMember {
    static componentsModel: ComponentsModel;

    private componentModel: ComponentModel;

    constructor(id: string, scenario: string, supported: IsSupported = IsSupported.Supported, uses: number = 0) {
        super(id, scenario, supported, uses);
    }

    findFieldRef(fieldId: string): FieldContext | undefined {
        if (!this.componentModel) {
            this.componentModel = ComponentRef.componentsModel.getById(this.id, this.scenario);
            if (!this.componentModel) {
                return undefined;
            }
        }
        let context: FieldContext = this.componentModel.findFieldRef(fieldId);
        if (!context[2]) {
            context[2] = this;
        }
        return context;
    }
}

class GroupRef extends StructureMember {
    static groupsModel: GroupsModel;

    private groupModel: GroupModel;

    constructor(id: string, scenario: string, supported: IsSupported = IsSupported.Supported, uses: number = 0) {
        super(id, scenario, supported, uses);
    }

    findFieldRef(fieldId: string): FieldContext {
        if (!this.groupModel) {
            this.groupModel = GroupRef.groupsModel.getById(this.id, this.scenario);
            if (!this.groupModel) {
                return [undefined, undefined, undefined];
            }
        }

        let context: FieldContext = this.groupModel.findFieldRef(fieldId);
        if (!context[2]) {
            context[2] = this;
        }
        return context;
    }
}


class ComponentModel extends StructureModel {
    constructor(id: string, name: string, scenario: string, supported: IsSupported = IsSupported.Supported, uses: number = 0) {
        super(id, name, scenario, supported, uses);
    }
}

class ComponentsModel extends StructureModelMap<ComponentModel> {
    private componentIdMap: Map<string, ComponentModel> = new Map();

    constructor() {
        super();
    }

    add(component: ComponentModel): this {
        let key: string = component.id + "." + component.scenario;
        this.componentIdMap.set(key, component);
        return super.add(component);
    }

    getById(id: string, scenario: string): ComponentModel {
        let key: string = id + "." + scenario;
        return this.componentIdMap.get(key);
    }
}

class GroupModel extends StructureModel {
    readonly numInGroup: string;
    private fieldRef: FieldRef;

    constructor(id: string, name: string, numInGroup: string, scenario: string, supported: IsSupported = IsSupported.Supported, uses: number = 0) {
        super(id, name, scenario, supported, uses);
        this.numInGroup = numInGroup;
        this.fieldRef = new FieldRef(id, this.scenario);
    }

    findFieldRef(id: string): FieldContext | undefined {
        if (id === this.numInGroup) {
            return [this.fieldRef, this, undefined];
        } else {
            return super.findFieldRef(id);
        }
    }
}

class GroupsModel extends StructureModelMap<GroupModel> {
    private numInGroupMap: Map<string, GroupModel> = new Map();
    private groupIdMap: Map<string, GroupModel> = new Map();

    constructor() {
        super();
    }

    add(group: GroupModel): this {
        this.numInGroupMap.set(group.numInGroup, group);
        let key: string = group.id + "." + group.scenario;
        this.groupIdMap.set(key, group);
        return super.add(group);
    }

    getByNumInGroupId(id: string): GroupModel {
        return this.numInGroupMap.get(id);
    }

    getById(id: string, scenario: string): GroupModel {
        let key: string = id + "." + scenario;
        return this.groupIdMap.get(key);
    }
}

class MessageModel extends StructureModel {
    readonly msgType: string;

    constructor(id: string, name: string, msgType: string, scenario: string, supported: IsSupported = IsSupported.Supported, uses: number = 0) {
        super(id, name, scenario, supported, uses);
        this.msgType = msgType;
    }
}

class MessagesModel extends StructureModelMap<MessageModel>{
    private messageTypeMap: Map<string, MessageModel> = new Map();

    constructor() {
        super();
    }

    add(message: MessageModel): this {
        this.messageTypeMap.set(message.msgType, message);
        return super.add(message);
    }

    /**
     * @param msgType FIX message type (tag 35 value)
     * @returns a MessageModel of the specified type, or undefined if not found
     */
    getByMsgType(msgType: string): MessageModel {
        return this.messageTypeMap.get(msgType);
    }
}


class CodesetModel implements Keyed {
    static readonly defaultScenario = "base";
    static readonly defaultDatatype = "String";

    readonly id: string;
    readonly name: string;
    readonly scenario: string;
    readonly type: string;
    private isSupported: IsSupported;
    private codeNameMap: Map<string, CodeModel> = new Map();
    private codeValueMap: Map<string, CodeModel> = new Map();

    constructor(id: string, name: string, scenario: string, type: string, supported: IsSupported) {
        this.id = id;
        this.name = name;
        if (scenario) {
            this.scenario = scenario;
        } else {
            this.scenario = CodesetModel.defaultScenario;
        }
        if (type) {
            this.type = type;
        } else {
            this.type = CodesetModel.defaultDatatype;
        }
        this.supported = supported;
    }

    /**
     * Make a copy of this CodesetModel for a different scenario
     * @param scenario scenario name
     * @returns a new CodesetModel
     */
    clone(scenario: string): CodesetModel {
        let clone = new CodesetModel(this.id, this.name, scenario, this.type, this.supported);
        for (let code of this.codeNameMap.values()) {
            clone.add(code);
        }
        return clone;
    }

    add(code: CodeModel): void {
        this.codeNameMap.set(code.name, code);
        this.codeValueMap.set(code.value, code);
    }

    getByName(name: string): CodeModel {
        return this.codeNameMap.get(name);
    }

    getByValue(value: string): CodeModel {
        return this.codeValueMap.get(value);
    }

    getUsedCodes(): Array<CodeModel> {
        return Array.from(this.codeValueMap.values()).filter((code: CodeModel) => code.uses > 0);
    }

    key(): string {
        return this.name + "." + this.scenario;
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

/**
 * Maps key to codeset
 */
class CodesetsModel extends Map<string, CodesetModel> {

    constructor() {
        super();
    }
}

/**
 * A searchable model of an Orchestra file
 * Todo: In the initial implementation, scenarios are not considered. To be added in a later phase.
 */
class OrchestraModel {
    readonly fields: FieldsModel = new FieldsModel();
    readonly codesets: CodesetsModel = new CodesetsModel();
    readonly components: ComponentsModel = new ComponentsModel();
    readonly groups: GroupsModel = new GroupsModel();
    readonly messages: MessagesModel = new MessagesModel();

    constructor() {
        
    }

}

class FieldInstance {
    readonly tag: string;
    readonly value: string;

    constructor(tag: string, value: string) {
        this.tag = tag;
        this.value = value;
    }
}

/**
 * Assumes tag-value encoding only
 */
class MessageInstance extends Array<FieldInstance> {

    constructor() {
        super();
    }

    /**
     * @returns the value of the third field. If not populated, returns undefined.
     */
    get msgType(): string {
        let msgTypeField: FieldInstance = this[2];
        if (msgTypeField.tag === "35") {
            return msgTypeField.value;
        } else {
            return undefined;
        }
    }
}

class LogModel {
    private referenceModel: OrchestraModel;

    constructor(referenceModel: OrchestraModel) {
        this.referenceModel = referenceModel;
    }

    get model(): OrchestraModel {
        return this.referenceModel;
    }

    /**
     * Returns the name of a message scenario corresponding to a message instance
     * Initial implementation returns a message name from the reference Orchestra model. If not found in the refernce
     * model, returns the msgType. If the message is not found, that indicates either that it is a user defined message or
     * that it is not a known application message, e.g. session message.
     * @param message a message instance
     * @returns a name of a message scenario key as defined by a reference Orchestra model. If not found in the refernce
     * model, returns the msgType.
     */
    getMessageScenarioKey(message: MessageInstance): string {
        let messageModel: MessageModel = this.referenceModel.messages.getByMsgType(message.msgType);
        if (messageModel) {
            return messageModel.key();
        } else {
            return message.msgType;
        }
    }

    messageListener = (messageInstance: MessageInstance) => {
        let messageScenarioKey: string = this.getMessageScenarioKey(messageInstance);
        let messageModel: MessageModel = this.referenceModel.messages.get(messageScenarioKey);
        if (!messageModel) {
            messageModel = new MessageModel(null, messageScenarioKey, messageInstance.msgType, MessageModel.defaultScenario);
            this.referenceModel.messages.add(messageModel);
        }


        for (let fieldInstance of messageInstance) {
            let fieldContext: FieldContext = messageModel.findFieldRef(fieldInstance.tag);
            let fieldRef: FieldRef = fieldContext[0];
            if (!fieldRef) {
                // Add a fieldRef not in the message reference model
                fieldRef = new FieldRef(fieldInstance.tag, messageModel.scenario);
                messageModel.addMember(fieldRef);
            }

            if (!fieldRef.field) {
                fieldRef.field = this.referenceModel.fields.getById(fieldInstance.tag);
                if (!fieldRef.field) {
                    fieldRef.field = new FieldModel(fieldRef.id, fieldRef.id.toString(), FieldModel.defaultDatatype, messageModel.scenario);
                    this.referenceModel.fields.add(fieldRef.field);
                }
                let key: string = fieldRef.field.datatype + "." + messageModel.scenario;
                let referenceCodeset: CodesetModel = this.referenceModel.codesets.get(key);
                if (referenceCodeset) {
                    fieldRef.codeset = referenceCodeset;
                } else if (messageModel.scenario != CodesetModel.defaultScenario) {
                    // if the codeset exists in base scenario, clone it
                    key = fieldRef.field.datatype + "." + CodesetModel.defaultScenario;
                    referenceCodeset = this.referenceModel.codesets.get(key);
                    if (referenceCodeset) {
                        fieldRef.codeset = referenceCodeset.clone(messageModel.scenario);
                        this.referenceModel.codesets.set(key, fieldRef.codeset);
                    }
                }
            }

            // increment use of this fieldRef
            fieldRef.use();
            // increment use of the component, group or message containing this fieldRef
            if (fieldContext[1]) {
                let sm: StructureModel = fieldContext[1];
                sm.use();
            }
            // increment use of componentRef or groupRef
            if (fieldContext[2]) {
                let sm: StructureMember = fieldContext[2];
                sm.use();
            }

            if (fieldRef.codeset) {
                let code: CodeModel = fieldRef.codeset.getByValue(fieldInstance.value);
                if (!code) {
                    // add a code not in reference model
                    code = new CodeModel(fieldInstance.value, fieldInstance.value, IsSupported.Supported);
                    fieldRef.codeset.add(code);
                }
                code.use();
            }
        }
    }
}

class LogReader {
    static readonly encoding: string = "US-ASCII";

    private logFile: File;
    private progressNode: HTMLElement;
    private reader: FileReader = new FileReader();
    private messageListener: (message: MessageInstance) => void;

    constructor(logFile: File, progressNode: HTMLElement, messageListener: (message: MessageInstance) => void) {
        this.logFile = logFile;
        this.progressNode = progressNode;
        this.messageListener = messageListener;
    }

    async readFile(): Promise<void> {
        let logParser: TVFileParser = new TVFileParser();
        let fileOffset: number = 0;
        let chunkSize: number = 64 * 1024;
        let str: string;
        // continue while not eof and at least one message found per chunk
        let atLeastOneMessage: boolean = true;
        while (fileOffset < this.fileSize && atLeastOneMessage) {
            await this.readBytes(fileOffset, Math.min(chunkSize, this.fileSize - fileOffset)).then((chunk: string) => {
                logParser.input = chunk;
                atLeastOneMessage = false;
                let messageResult: IteratorResult<TVMessageParser> = logParser.next();
                while (!messageResult.done) {
                    atLeastOneMessage = true;
                    let message: TVMessageParser = messageResult.value;
                    let messageInstance = new MessageInstance();
                    let fieldResult: IteratorResult<TVFieldParser> = message.next();
                    while (!fieldResult.done) {
                        let field: TVFieldParser = fieldResult.value;
                        let tag: string = field.tag;
                        let value: string = field.value;
                        messageInstance.push(new FieldInstance(tag, value));
                        fieldResult = message.next();
                    }
                    this.messageListener(messageInstance);
                    messageResult = logParser.next();
                }
            });
            fileOffset += logParser.lastMessageOffset;
        }
    }

    private readBytes(offset: number, bytes: number): Promise<string> {

        return new Promise<string>((resolve, reject) => {
            this.reader.onload = (event) => {
                showProgress(this.progressNode, Math.floor((offset + bytes) * 100 / this.fileSize));
                let res = this.reader.result;
                let str: string;
                if (typeof res === "string") {
                    str = this.reader.result as string;
                }
                resolve(str);
            }
            this.reader.onerror = () => {
                showProgress(this.progressNode, -1);
                reject(this.reader.error);
            }
            let blob = this.logFile.slice(offset, offset + bytes);
            this.reader.readAsText(blob, LogReader.encoding);
        });
    }

    get fileSize(): number {
        return this.logFile.size;
    }

}

/**
 * Parses a file of FIX tag-value messages. 
 * Assumptions: 
 * Messages are not grossly malformed; this application is not expected to be a FIX validator.
 * Arbitrary delimiters and data between messages are to be ignored.
 */
class TVFileParser implements Iterator<TVMessageParser> {

    static readonly messageStartDelimiter: string = "8=FIX";
    static readonly bodyLengthTag: string = "9";
    static readonly checksumTag: string = "10";
    static readonly fieldDelimiter: string = String.fromCharCode(1);

    private messageEndOffset: number = 0;
    private str: string = "";

    constructor() {
    }

    get lastMessageOffset(): number {
        return this.messageEndOffset
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
        let messageStartOffset: number = this.str.indexOf(TVFileParser.messageStartDelimiter, this.messageEndOffset);
        if (messageStartOffset != -1) {
            let field: TVFieldParser = new TVFieldParser(this.str, messageStartOffset);
            let bodyLength: number;
            if (field.next() && field.next() && field.tag === TVFileParser.bodyLengthTag) {
                bodyLength = parseInt(field.value, 10);
            } else {
                // body length not found
                return {
                    done: true,
                    value: null
                }
            }
            let checksumOffet = field.offset + field.length + bodyLength;
            field = new TVFieldParser(this.str, checksumOffet);
            field.next();
            if (field.tag === TVFileParser.checksumTag) {
                bodyLength = parseInt(field.value, 10);
            } else {
                // checksum not found
                return {
                    done: true,
                    value: null
                }
            }
            let messageEndTag: number = field.offset + field.length;
            this.messageEndOffset = this.str.indexOf(TVFileParser.fieldDelimiter, messageEndTag);
            // assertion
            if (this.str.charAt(this.messageEndOffset) != TVFileParser.fieldDelimiter) {
                throw new Error("Bad offset");
            }
            // return a parser for a found message
            return {
                done: false,
                value: new TVMessageParser(this.str, messageStartOffset)
            }
        } else {
            // if message start not found, then iterator is done
            return {
                done: true,
                value: null
            }
        }
    }
}

/**
 * Parses FIX tag-value messages
 */
class TVMessageParser implements Iterator<TVFieldParser> {
    static readonly lastTag: string = "10";

    private str: string;
    private messageOffset: number;
    private messageLength: number = undefined;
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
                value: null
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
 * Parses FIX tag-value fields
 */
class TVFieldParser {
    static readonly tagDelimiter: string = "=";
    static readonly fieldDelimiter: string = String.fromCharCode(1);
    static lengthFieldIds: Array<string> = new Array();

    private str: string;
    private tagOffset: number;
    private valueOffset: number = undefined;
    private valueLength: number = 0;
    private nextValueLength: number = 0;

    constructor(str: string, offset: number) {
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
