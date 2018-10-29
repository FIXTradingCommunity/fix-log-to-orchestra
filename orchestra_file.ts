export class OrchestraFile {
    private file: File;
    private document: Document = new Document();
    static readonly MIME_TYPE: string = "application/xml";

    constructor(file: File) {
        this.file = file;
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

    set dom(document: Document) {
        this.document = document;
    }

    get size(): number {
        return this.file.size;
    }

    readFile(): void {
        let reader = new FileReader();
        reader.onload = () => {
            let res = reader.result;
            if (typeof res === "string") {
                this.dom = OrchestraFile.parse(res);
            } else {
                this.dom = OrchestraFile.parse(res.toString());
            }
        }
        reader.onerror = function () {
            alert(reader.error.message);
        }
        // todo onprogress
        reader.readAsText(this.file);
    }

    contents(): Blob {
        return new Blob([OrchestraFile.serialize(this.document)], { type: OrchestraFile.MIME_TYPE })
    }
}

