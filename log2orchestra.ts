import OrchestraFile from "./orchestra_file";
import LogReader from "./log_reader";

var referenceFile: File;
var logFile: File;
var orchestraFileName: string;

var inputOrchestra = function (event) {
    referenceFile = event.target.files[0];
    removeAlert();
};

var inputLog = function (event) {
    logFile = event.target.files[0];
    removeAlert();
};

var outputOrchestra = function (event) {
    orchestraFileName = event.target.value;
    removeAlert();
};

var createOrchestra = function (event) {
    let isValid: boolean = validateInput(event);
    if (isValid) {
        removeAlert();
        let input = new OrchestraFile(referenceFile);
        input.readFile();

        let logReader: LogReader = new LogReader(logFile);
        logReader.readFile();

        let output = new OrchestraFile(new File([""], orchestraFileName));
        // shortcut for testing
        output.dom = input.dom;
        let contents: Blob = output.contents();

        createLink(contents);

    } else {
        createAlert("Enter missing field");
    }
}

var validateInput = function (event): boolean {
    let isValid: boolean = true;
    if (!referenceFile || !logFile) {
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

var removeAlert = function(): void {
    let msg = document.getElementById("msg");
    if (msg) {
        document.body.removeChild(msg);
    }
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
