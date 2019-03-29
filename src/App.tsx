/*!
 * Copyright 2019, FIX Protocol Ltd.
 */

import React, { Component } from 'react';
import logo from './FIXorchestraLogo.png';
import './log2orchestra.css';
import Log2Orchestra from "./Log2Orchestra";
import OrchestraFile from "./OrchestraFile";
import { resolve } from 'dns';


export default class App extends Component {
  static readonly versionMsg: string = "Application version 1.0 / Orchestra version 1.0 RC4";
  static readonly rightsMsg: string = "© Copyright 2019, FIX Protocol Ltd.";

  private referenceFile: File | undefined = undefined;
  private logFiles: FileList | undefined = undefined;
  private configurationFile: File | undefined = undefined;
  private orchestraFileName: string | undefined = "myorchestra.xml";
  private appendOnly: boolean = false;
  private inputProgress: HTMLElement | undefined = undefined;
  private outputProgress: HTMLElement | undefined = undefined;
  private logProgress: HTMLElement | undefined = undefined;
  private configurationProgress: HTMLElement | undefined = undefined;
  private alertMsg: string = "";

  state = { showAlerts: false }
  private inputOrchestra = (fileList: FileList | null): void => {
    if (fileList && fileList.length > 0) {
      this.referenceFile = fileList[0];
    }
  };
  private inputLogs = (fileList: FileList | null): void => {
    if (fileList && fileList.length > 0) {
      this.logFiles = fileList;
    }
  };
  private inputConfiguration = (fileList: FileList | null): void => {
    if (fileList && fileList.length > 0) {
      this.configurationFile = fileList[0];
    }
  };
  private outputOrchestra = (fileName: string | undefined): void => {
    this.orchestraFileName = fileName;
  };
  private appendToggle = (checked: boolean): void => {
    this.appendOnly = checked;
  };

  private setInputFileBarRef = (instance: HTMLDivElement): void => {
    this.inputProgress = instance;
  };
  private setLogFileBarRef = (instance: HTMLDivElement): void => {
    this.logProgress = instance;
  };
  private setConfigurationFileBarRef = (instance: HTMLDivElement): void => {
    this.configurationProgress = instance;
  };
  private setOutputFileBarRef = (instance: HTMLDivElement): void => {
    this.outputProgress = instance;
  };
  private showProgress(progressNode: HTMLElement, percent: number): void {
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
  private async createOrchestra(): Promise<void> {
    if (this.referenceFile && this.logFiles && this.orchestraFileName && this.inputProgress && this.outputProgress &&
      this.logProgress && this.configurationProgress) {
      this.setState({ showAlerts: false });
      const runner: Log2Orchestra = new Log2Orchestra(this.referenceFile, this.logFiles, this.configurationFile, this.orchestraFileName, this.appendOnly,
        this.inputProgress, this.outputProgress, this.logProgress, this.configurationProgress, this.showProgress);
      try {
        await runner.run();
      } catch (error) {
        if (error instanceof Error && error.stack) {
          this.alertMsg = error.stack;
        } else if (error) {
          this.alertMsg = error;
        }
        this.setState({ showAlerts: true });
      }

      if (runner.contents) {
        this.createLink(runner.contents);
      }
    } else {
      this.alertMsg = this.createErrorMsgs();
      this.setState({ showAlerts: true });
    }
  }

  private createErrorMsgs(): string {
    let errorMsgs = new Array<string>();
    if (!this.referenceFile) {
      errorMsgs.push("Reference Orchestra file not selected");
    }
    if (!this.logFiles) {
      errorMsgs.push("FIX log file not selected");
    }
    if (!this.orchestraFileName) {
      errorMsgs.push("Orchestra file name not entered");
    }
    return errorMsgs.join('\n');
  }

  private createLink(contents: Blob): void {
    const output: HTMLElement | null = document.getElementById("output");
    if (output && this.orchestraFileName) {
      const prevLink: HTMLAnchorElement | null = output.querySelector('a');
      if (prevLink) {
        window.URL.revokeObjectURL(prevLink.href);
        output.innerHTML = '';
      }

      const a: HTMLAnchorElement = document.createElement('a');
      a.download = this.orchestraFileName;
      a.href = window.URL.createObjectURL(contents);
      a.dataset.downloadurl = [OrchestraFile.MIME_TYPE, a.download, a.href].join(':');
      a.textContent = 'File ready';

      output.appendChild(a);
      a.onclick = function (event: Event) {
        const element = event.target as HTMLAnchorElement;
        if ('disabled' in element.dataset) {
          return false;
        }

        a.textContent = 'Downloaded';
        a.dataset.disabled = "true";

        setTimeout(function () {
          window.URL.revokeObjectURL(a.href);
        }, 1500);
      }
    }
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="FIX Orchestra" />
        </header>
        <h1>FIX Log to Orchestra</h1>
        <h3>Creates an Orchestra file from one or more FIX message logs (tag-value encoding)</h3>
        {App.versionMsg}<br />
        {App.rightsMsg}<br />
        <div className="container">
          <div className="field">
            <label htmlFor="inputFile">Reference Orchestra file</label><br />
            <input type="file" id="inputFile" accept=".xml" onChange={(e: React.ChangeEvent<HTMLInputElement>) => this.inputOrchestra(e.target.files)}></input>
            <div className="bar">
              <div id="inputFileBar" className="progressBar" ref={this.setInputFileBarRef}></div>
            </div>
          </div>
          <div className="field">
            <label htmlFor="logFile">FIX messsage log files</label><br />
            <input type="file" id="logFile" multiple={true} onChange={(e: React.ChangeEvent<HTMLInputElement>) => this.inputLogs(e.target.files)}></input>
            <div className="bar">
              <div id="logFileBar" className="progressBar" ref={this.setLogFileBarRef}></div>
            </div>
          </div>
          <div className="field">
            <label htmlFor="inputFile">Configuration file for scenarios (optional)</label><br />
            <input type="file" id="configurationFile" accept=".json" onChange={(e: React.ChangeEvent<HTMLInputElement>) => this.inputConfiguration(e.target.files)}></input>
            <div className="bar">
              <div id="configurationFileBar" className="progressBar" ref={this.setConfigurationFileBarRef}></div>
            </div>
          </div>
          <div className="field">
            <label htmlFor="outputFile">Orchestra file to create (*.xml)</label><br />
            <input type="text" id="outputFile" defaultValue={this.orchestraFileName} placeholder="Orchestra file name" onChange={(e: React.ChangeEvent<HTMLInputElement>) => this.outputOrchestra(e.target.value)}></input>
            <div className="bar">
              <div id="outputFileBar" className="progressBar" ref={this.setOutputFileBarRef}></div>
            </div>
          </div>
          <div>
            <input type="checkbox" id="appendCheckbox" onChange={(e: React.ChangeEvent<HTMLInputElement>) => this.appendToggle(e.target.checked)}></input>
            <label htmlFor="appendCheckbox">Append only (removes no scenarios)</label><br />
          </div>
          <button type="button" id="createButton" onClick={(e: React.MouseEvent<HTMLButtonElement>) => this.createOrchestra()}>Create Orchestra file</button>
          <output id="output"></output>
        </div>
        {this.state.showAlerts && <div className="container" id="alerts" >
          <textarea readOnly className="error-message" id="alertMsgs" value={this.alertMsg}></textarea>
        </div>}
      </div>
    );
  }
}
