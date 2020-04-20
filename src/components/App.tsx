/*!
 * Copyright 2019, FIX Protocol Ltd.
 */

import Checkbox from '@material-ui/core/Checkbox';
import TextField from '@material-ui/core/TextField';
import * as Sentry from '@sentry/browser';
import * as jwt from 'jsonwebtoken';
import * as QueryString from 'query-string';
import React, { Component } from 'react';
import { version } from '../../package.json';
import logo from '../assets/FIXorchestraLogo.png';
import Log2Orchestra from "../lib/log2orchestra";
import OrchestraFile from "../lib/OrchestraFile";
import OrchestraModel from '../lib/OrchestraModel';
import Utility from '../lib/utility';
import './app.css';
import FileInput from './FileInput/FileInput';
import Help from "./Help/Help";
import ProgressBar from './ProgressBar/ProgressBar';
import ResultsPage from './ResultsPage/ResultsPage';

const SENTRY_DNS_KEY = "https://fe4fa82d476149429ed674627a222a8b@sentry.io/1476091";

const currentYear = new Date().getFullYear();

interface IDecodedUserData {
  at_hash: string;
  sub: string;
  firstname: string;
  Employer: string;
  "Zip/Postcode": string | null;
  iss: string;
  groups: string[] | null;
  Title: null;
  Website: null;
  "State/Region": string | null;
  "City": string | null;
  "Street Address 1": string | null;
  "Job Title": string | null;
  nonce: string | null;
  "Street Address 2": string | null;
  lastname: string;
  aud: string[];
  auth_time: string;
  Country: string | null;
  exp: number;
  iat: number;
  email: string;
}

export default class App extends Component {
  public static readonly rightsMsg: string = `© Copyright ${currentYear}, FIX Protocol Ltd.`;

  public state = {
    logFilesError: "",
    orchestraFileNameError: "",
    referenceFileError: "",
    showAlerts: false,
    showHelp: false,
    downloadHref: "",
    downloadUrl: "",
    creatingFile: false,
    downloaded: false,
    results: undefined,
    showResults: false,
    authVerified: false,
    results: undefined,
    showResults: false,
  }
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

  constructor(props: {}) {
    super(props)

    Sentry.init({ dsn: SENTRY_DNS_KEY });
  }

  public render() {
    if (!this.state.authVerified) {
      return null
    }

    return (
      <div className="App">
        <div className="App-header container">
          <div className="titleContainer">
            <h1>FIX Log to Orchestra</h1>
            <h3 className="subTitle">Creates an Orchestra file from one or more FIX message logs (tag-value encoding)</h3>
          </div>
          <img src={logo} className="App-logo" alt="FIX Orchestra" />
        </div>
        <div className="contentContainer container">
          <div className="form">
            <h2>Input</h2>
            <div className="inputsContainer">
              <div className="field">
                <FileInput
                  label="Reference Orchestra file"
                  accept=".xml"
                  onChange={this.inputOrchestra}
                  ref={this.setInputFileBarRef as () => {}}
                  error={this.state.referenceFileError}
                  clearError={() => { this.setState({ referenceFileError: "" })}}
                />
              </div>
              <div className="field">
                <FileInput
                  label="FIX messsage log files"
                  onChange={this.inputLogs}
                  ref={this.setLogFileBarRef as () => {}}
                  multiple={true}
                  error={this.state.logFilesError}
                  clearError={() => { this.setState({ logFilesError: "" })}}
                />
              </div>
              <div className="field">
                <FileInput
                  label="Configuration file for scenarios (optional)"
                  accept=".json"
                  onChange={this.inputConfiguration}
                  ref={this.setConfigurationFileBarRef as () => {}}
                />
              </div>
            </div>
            <h2>Output</h2>
            <div className="field">
              <TextField
                label="Orchestra file to create (*.xml)"
                type="text"
                variant={"outlined"}
                defaultValue={this.orchestraFileName}
                InputProps={{
                  classes: {
                    focused: "textField-focused",
                  }}
                }
                InputLabelProps={{
                  classes: {
                    focused: "textField-label-focused"
                  },
                  shrink: true,
                }}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => this.outputOrchestra(e.target.value)}
                error={!!this.state.orchestraFileNameError}
                helperText={this.state.orchestraFileNameError}
              />
            </div>
            <div className="checkboxContainer">
              <Checkbox
                size="medium"
                disableRipple={true}
                classes={{
                  root: "checkbox"
                }}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => this.appendToggle(e.target.checked)}
              />
              <label>Append only (removes no scenarios)</label><br />
            </div>
            <div className="buttonsContainer">
              {
                !this.state.downloadHref
                  ? <button
                      type="button"
                      className="submitButton"
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => this.createOrchestra()}
                    >
                      {
                        this.state.creatingFile ? "Loading..." : "Create Orchestra file"
                      }
                    </button>
                  : <a
                      className="submitButton downloadButton"
                      href={this.state.downloadHref}
                      download={this.orchestraFileName}
                      data-downloadurl={this.state.downloadUrl}
                      onClick={this.handleDownloadClick.bind(this)}
                    >
                      { this.state.downloaded ? "Downloaded" : "Download File"}
                    </a>
              }
              { (this.state.results && this.state.downloadHref) && <button className="clearFieldsButton showResultsButton" onClick={this.openResults}>Show Results</button> }
              <button type="button" className="helpButton" onClick={(e: React.MouseEvent<HTMLButtonElement>) => this.setState({ showHelp: !this.state.showHelp })}>?</button>
            </div>
            <ProgressBar ref={this.setOutputFileBarRef as () => {}} />
            <button className="clearFieldsButton" onClick={this.handleClearFields.bind(this)}>Clear Fields</button>
            <output id="output"></output>
            {
              this.state.showAlerts && 
              <div className="errorContainer">
                <textarea readOnly={true} className="errorMessage" value={this.alertMsg}></textarea>
              </div>
            }
          </div>
          {this.state.showHelp && !this.state.showAlerts && <Help />}
        </div>
        <footer className="container">
          <p>Version {version}</p>
          <p>{App.rightsMsg}</p>
        </footer>
        {
          this.state.showResults &&
          <ResultsPage
            results={this.state.results}
            onClose={this.closeResults}
            downloadButton={
              this.state.downloadHref ? <a
              className="submitButton downloadButton"
              href={this.state.downloadHref}
              download={this.orchestraFileName}
              data-downloadurl={this.state.downloadUrl}
              onClick={this.handleDownloadClick.bind(this)}
            >
              { this.state.downloaded ? "Downloaded" : "Download File"}
            </a> : 
            <button className="submitButton closeResultsButton" onClick={this.closeResults}>
              Close Results
            </button>
            }
          />
        }
      </div>
    );
  }

  public componentDidMount() {
    this.CheckAuthenticated();
  }

  private handleClearFields() {
    if (this.referenceFile) {
      this.referenceFile = undefined;
    }
    if (this.logFiles) {
      this.logFiles = undefined;
    }
    if (this.configurationFile) {
      this.configurationFile = undefined;
    }
    if (this.orchestraFileName) {
      this.orchestraFileName = "";
    }
    if (this.inputProgress instanceof FileInput) {
      this.inputProgress.clear()
    }
    if (this.logProgress instanceof FileInput) {
      this.logProgress.clear()
    }
    if (this.configurationProgress instanceof FileInput) {
      this.configurationProgress.clear()
    }
  }

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
    if (this.state.orchestraFileNameError) {
      this.setState({
        orchestraFileNameError: ""
      })
    }
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

      if (progressNode instanceof FileInput || progressNode instanceof ProgressBar) {
        progressNode.setProgress(percent);
      }

    } else {
      progressNode.style.backgroundColor = "red";
    }
    if (progressNode.parentElement) {
      progressNode.parentElement.style.visibility = "visible";
    }
  }
  private handleReferenceParsed = (referenceModel: OrchestraModel) => {
    const fixMessageTypes = referenceModel.messages.size;

    const messageScenariosArray: string[] = [];
    for (const [_, value] of referenceModel.messages) {
      if (!messageScenariosArray.includes(value.scenario)) {
        messageScenariosArray.push(value.scenario);
      }
    }
    const messageScenarios = messageScenariosArray.length;

    const fields = referenceModel.fields.size;

    let userDefinedFields = 0;
    for (const [_, value] of referenceModel.fields) {
      const key = parseInt(value.id, 10);
      if ((key >= 5000 && key <= 40000) || key >= 50000 ) {
        userDefinedFields++;
      }
    }

    const components = referenceModel.components.size;

    const componentScenariosArray: string[] = [];
    for (const [_, value] of referenceModel.messages) {
      if (!componentScenariosArray.includes(value.scenario)) {
        componentScenariosArray.push(value.scenario);
      }
    }
    const componentScenarios = componentScenariosArray.length;

    this.setState({
      results: {
        componentScenarios,
        components,
        fields,
        fixMessageTypes,
        messageScenarios,
        userDefinedFields,
      }
    })
  }
  private openResults = () => {
    this.setState({
      showResults: true,
    });
  }
  private closeResults = () => {
    this.setState({
      showResults: false,
    });
  }
  private async createOrchestra(): Promise<void> {
    if (this.referenceFile && this.logFiles && this.orchestraFileName && this.inputProgress && this.outputProgress &&
      this.logProgress && this.configurationProgress) {
      this.setState({ showAlerts: false, showHelp: false, creatingFile: true });
      const runner: Log2Orchestra = new Log2Orchestra(this.referenceFile, this.logFiles, this.configurationFile, this.orchestraFileName, this.appendOnly,
        this.inputProgress, this.outputProgress, this.logProgress, this.configurationProgress, this.showProgress);
      try {
        runner.onReferenceParsed = this.handleReferenceParsed;

        await runner.run();
        this.setState({ creatingFile: false });

        if (this.outputProgress instanceof ProgressBar) {
          this.outputProgress.setProgress(0);
        }
        
      } catch (error) {
        if (error) {
          Sentry.captureException(error);
          this.alertMsg = error;
        }
        this.setState({ showAlerts: true, creatingFile: false });
      }

      if (runner.contents) {
        this.createLink(runner.contents);
        this.openResults();
      }
    } else {
      this.setState({
        creatingFile: false,
        logFilesError: !this.logFiles && "Reference Orchestra file not selected",
        orchestraFileNameError: !this.orchestraFileName && "Orchestra file name not entered",
        referenceFileError: !this.referenceFile && "FIX log file not selected",
      });
    }
  }

  private createLink(contents: Blob): void {
    if (this.orchestraFileName) {
      const url = window.URL.createObjectURL(contents);

      this.setState({
        downloadHref: url,
        downloadUrl: [OrchestraFile.MIME_TYPE, this.orchestraFileName, url].join(':'),
        loading: true,
      });
    }
  }

  private handleDownloadClick(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>): void {
    this.setState({
      downloaded: true
    });
    setTimeout(() => {
      this.setState({
        downloadHref: "",
        downloadUrl: "",
        downloaded: false,
        loading: false,
      });
    }, 1500);
  }

  private CheckAuthenticated() {
    const urlparsed = QueryString.parse(window.location.search);
    const id_token = urlparsed.id_token as string;
    try {
      const decoded: null | object | string = jwt.decode(id_token);
      if (!decoded) {
        throw new Error("unauthenticated");
      }
      /*if (decoded['exp']) {
        const sec = decoded['exp'] as number;
        const date: Date = new Date(0);
        date.setUTCSeconds(sec);
        const now: Date = new Date();
        if (date < now) {
          throw new Error("expired");
        }
      }*/

      const verified: object | string = jwt.verify(id_token, Utility.GetMOPublicKey());
      if (!verified) {
        throw new Error("unauthenticated");
      }

      const userData = (decoded as IDecodedUserData);
      Sentry.configureScope((scope) => {
        scope.setUser({
          Employer: userData.Employer,
          email: userData.email,
          firstname: userData.firstname,
          groups: userData.groups,
          lastname: userData.lastname,
          sub: userData.sub,
        });
      });

      this.setState({
        authVerified: true,
      })

      const userData = (decoded as IDecodedUserData);
      Sentry.configureScope((scope) => {
        scope.setUser({
          Employer: userData.Employer,
          email: userData.email,
          firstname: userData.firstname,
          groups: userData.groups,
          lastname: userData.lastname,
          sub: userData.sub,
        });
      });

    } catch (e) {
      Utility.Log(e);

      window.location.href = "https://fixtrading.xecurify.com/moas/idp/openidsso?" +
        "client_id=q63H8HNBTq00O4M&" +
        "redirect_uri=https://log2orchestra.fixtrading.org/&" +
        "scope=profile&" +
        "response_type=token&" +
        "state=123";
    }
  }
}
