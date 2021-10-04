export default class LogWarnings {
  private static instance: LogWarnings;
  private warnings: {[key: string]: any[]};
  private fileName: string;
  private line: number;

  private constructor() {
    this.warnings = {};
    this.fileName = "";
    this.line = 0;
  }

  public static getInstance(): LogWarnings {
    if (!LogWarnings.instance) {
        LogWarnings.instance = new LogWarnings();
    }

    return LogWarnings.instance;
  }

  public cleanWarnings = () => {
    this.warnings = {};
    this.fileName = "";
    this.line = 0;
  }
  public getWarnings = () => {
    return this.warnings;
  }

  public setFileName = (fileName: string) => {
    this.fileName = fileName;
  }

  public setLine = (line: number) => {
    this.line = line;
  }

  public logWarningsMessages = (message: string) => {
    if (this.warnings[this.fileName]) {
      this.warnings[this.fileName].push({line: this.line, message});
    } else {
      this.warnings[this.fileName] = [{line: this.line, message}];
    }
  }

  public downloadWarnings = () => {
    let newLogs = "";
    const logFileNames = Object.keys(this.warnings);
    logFileNames.map((filename: string) => {
      newLogs = newLogs.concat(filename, "\n")
      return this.warnings[filename].map((
        message: {
          line: number,
          message: string
        }) =>
          newLogs =
            newLogs.concat(
              `Line ${message.line}: ${message.message}`, "\n"
            ))
    })

    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(newLogs));
    element.setAttribute('download', "myorchestra-err.txt");
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }
}