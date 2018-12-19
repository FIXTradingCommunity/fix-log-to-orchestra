import Log2Orchestra from "./Log2Orchestra";
import OrchestraFile from "./OrchestraFile";

/**
 * UI functions for log2orchestra
 */

var referenceFile: File;
var logFiles: FileList;
var configurationFile: File;
var orchestraFileName: string = "myorchestra.xml";
var appendOnly: boolean = false;

/*
 * Select a reference Orchestra file to read
 */
export var inputOrchestra = function (event: Event) {
    const element = event.target as HTMLInputElement;
    if (element.files && element.files.length > 0) {
        referenceFile = element.files[0];
        removeAlert();
    }
};

/**
 * Select one or more log files to parse 
 */
export var inputLogs = function (event: Event) {
    const element = event.target as HTMLInputElement;
    logFiles = element.files ? element.files : new FileList();
    removeAlert();
};

/*
 * Select a JSON configuration file for scenarios
 */
export var inputConfiguration = function (event: Event) {
    const element = event.target as HTMLInputElement;
    if (element.files && element.files.length > 0) {
        configurationFile = element.files[0];
    }
    removeAlert();
};

/**
 * Enter a name for the Orchestra file to produce
 */
export var outputOrchestra = function (event: Event) {
    const element = event.target as HTMLInputElement;
    orchestraFileName = element.value;
    removeAlert();
};

/**
 * Toggle the value of append-only mode
 */
export var appendToggle = function (event: Event) {
    const element = event.target as HTMLInputElement;
    appendOnly = element.checked;
};

/**
 * Start execution
 */
export var createOrchestra = async function (event: Event) {
    const isValid: boolean = validateInput(event);
    if (isValid) {
        removeAlert();
        try {
            const inputProgress: HTMLElement | null = document.getElementById("inputFileBar");
            const outputProgress: HTMLElement | null = document.getElementById("outputFileBar");
            const logProgress: HTMLElement | null = document.getElementById("logFileBar");
            const configProgress: HTMLElement | null = document.getElementById("configurationFileBar");
            const runner: Log2Orchestra = new Log2Orchestra(referenceFile, logFiles, configurationFile, orchestraFileName, appendOnly, inputProgress, outputProgress, logProgress, configProgress, showProgress);
            await runner.run();
            const contents: Blob | undefined = runner.contents;
            // create link to download the file locally
            if (contents) {
                createLink(contents);
            }
        } catch (e) {
            alert(e.message);
        }

    } else {
        createAlert("Enter missing field");
    }
}

var validateInput = function (event: Event): boolean {
    let isValid: boolean = true;
    if (!referenceFile || !logFiles) {
        isValid = false;
    }
    return isValid;
}

var createAlert = function (text: string): void {
    const txtNd = document.createTextNode(text);
    const msg = document.createElement("div");
    msg.setAttribute("id", "msg");
    msg.setAttribute("class", "container");
    msg.appendChild(txtNd);
    document.body.appendChild(msg);
}

var removeAlert = function (): void {
    const msg = document.getElementById("msg");
    if (msg) {
        document.body.removeChild(msg);
    }
}

var showProgress = function (progressNode: HTMLElement, percent: number): void {
    if (percent >= 0) {
        const percentString: string = Math.floor(percent).toString() + "%";
        progressNode.style.width = percentString;
        progressNode.innerHTML = percentString;
    } else {
        progressNode.style.backgroundColor = "red";
    }
    if (progressNode.parentElement) {
        progressNode.parentElement.style.visibility = "visible";
    }
}

var createLink = function (contents: Blob) {
    const output: HTMLElement | null = document.getElementById("output");
    if (output) {
        const prevLink: HTMLAnchorElement | null = output.querySelector('a');
        if (prevLink) {
            window.URL.revokeObjectURL(prevLink.href);
            output.innerHTML = '';
        }

        const a: HTMLAnchorElement = document.createElement('a');
        a.download = orchestraFileName;
        a.href = window.URL.createObjectURL(contents);
        a.dataset.downloadurl = [OrchestraFile.MIME_TYPE, a.download, a.href].join(':');
        a.textContent = 'File ready';

        output.appendChild(a);
        a.onclick = function (event: Event) {
            const element = event.target as HTMLAnchorElement;
            if ('disabled' in element.dataset) {
                return false;
            }

            cleanUp(element);
        }
    };

    var cleanUp = function (a: HTMLAnchorElement) {
        a.textContent = 'Downloaded';
        a.dataset.disabled = "true";

        setTimeout(function () {
            window.URL.revokeObjectURL(a.href);
        }, 1500);
    };
}

