/*!
 * Copyright 2019, FIX Protocol Ltd.
 */

import ConfigurationFile from "./ConfigurationFile";
import LogModel from "./LogModel";
import LogReader from "./LogReader";
import { ComponentRef, GroupRef } from "./MessageModel";
import OrchestraFile from "./OrchestraFile";
import OrchestraModel from "./OrchestraModel";
import { TVFieldParser } from "./TVFileParser";

/**
 * Controller for log2orchestra operations
 */
export default class Log2Orchestra {
    private appendOnly: boolean;
    private inputProgress: HTMLElement | null;
    private outputProgress: HTMLElement | null;
    private logProgress: HTMLElement | null;
    private configProgress: HTMLElement | null;
    private progressFunc: (progressNode: HTMLElement, percent: number) => void;
    private blob: Blob | undefined = undefined;
    private referenceFile: File;
    private orchestraFileName: string;
    private logFiles: FileList;
    private configurationFile: File | undefined;
    public onReferenceParsed: undefined | ((referenceModel: OrchestraModel) => void);

    constructor(referenceFile: File, logFiles: FileList, configurationFile: File | undefined, orchestraFileName: string, appendOnly: boolean, inputProgress: HTMLElement | null, outputProgress: HTMLElement | null, logProgress: HTMLElement | null, configProgress: HTMLElement | null,
        progressFunc: (progressNode: HTMLElement, percent: number) => void) {
        this.referenceFile = referenceFile;
        this.logFiles = logFiles;
        this.configurationFile = configurationFile;
        this.orchestraFileName = orchestraFileName
        this.appendOnly = appendOnly;
        this.inputProgress = inputProgress;
        this.outputProgress = outputProgress;
        this.logProgress = logProgress;
        this.configProgress = configProgress;
        this.progressFunc = progressFunc;
    }

    public async run(): Promise<Blob> {
        try {
            const input = new OrchestraFile(this.referenceFile, this.appendOnly, this.inputProgress, this.progressFunc);
            // read local reference Orchestra file
            await input.readFile();

            // populate model from reference Orchestra file
            const referenceModel: OrchestraModel = new OrchestraModel();
            input.extractOrchestraModel(referenceModel);
            ComponentRef.componentsModel = referenceModel.components;
            GroupRef.groupsModel = referenceModel.groups;

            if (this.onReferenceParsed) {
                this.onReferenceParsed(referenceModel);
            }

            // it takes a bit of a data dictionary to parse FIX; inform FIX parser of special fields
            const lengthFieldIds: string[] = referenceModel.fields.getIdsByDatatype("Length");
            // tag 9 is of Length type but is message length, not field length, so remove it from special fields for field parser
            lengthFieldIds.splice(lengthFieldIds.indexOf("9"), 1);
            TVFieldParser.lengthFieldIds = lengthFieldIds;

            // create new Orchestra file for output
            const output = new OrchestraFile(new File([""], this.orchestraFileName), this.appendOnly, this.outputProgress, this.progressFunc);
            // clones reference dom to output file
            output.dom = input.cloneDom();

            const outreferenceModel: OrchestraModel = new OrchestraModel();
            output.extractOrchestraModel(outreferenceModel);

            const logModel: LogModel = new LogModel(referenceModel);

            // if a configuration file was selected, read it. Otherwise, use default configuration to differentiate message scenarios.
            if (this.configurationFile) {
                const config = new ConfigurationFile(this.configurationFile, this.configProgress, this.progressFunc);
                await config.readFile();
                logModel.messageScenarioKeys = config.messageScenarioKeys;
            } else {
                logModel.messageScenarioKeys = ConfigurationFile.defaultKeys;
            }

            // read and parse one or more FIX logs 
            for (let i = 0; i < this.logFiles.length; i++) {
                const logReader: LogReader = new LogReader(this.logFiles[i], logModel.messageListener, this.logProgress, this.progressFunc);
                await logReader.readFile();
            }

            // update the output Orchestra file from the model
            output.updateDomFromModel(logModel, this.outputProgress);
            this.blob = output.contents();
            return new Promise<Blob>(resolve =>
                resolve(this.blob)
            );
        } catch (e) {
            return new Promise<Blob>((resolve, reject) =>
                reject(e)
            )
        }
    }

    /**
     * Provide contents of a new Orchestra file for download
     */
    get contents(): Blob | undefined {
        return this.blob;
    }
}