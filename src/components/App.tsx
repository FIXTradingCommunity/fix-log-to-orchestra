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
import Utility from '../lib/utility';
import './app.css';
import FileInput from './FileInput/FileInput';
import ProgressBar from './ProgressBar/ProgressBar';
import ResultsPage from './ResultsPage/ResultsPage';
import { File } from '../lib/enums';

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

interface IDecoded {
  exp?: number;
}

interface ErrorMsg {
  title: string,
  message: string
}

export default class App extends Component {
  public static readonly rightsMsg: string = `© Copyright ${currentYear}, FIX Protocol Ltd.`;

  public state = {
    logFilesError: "",
    orchestraFileNameError: "",
    referenceFileError: "",
    showAlerts: false,
    downloadHref: "",
    downloadUrl: "",
    creatingFile: false,
    downloaded: false,
    results: undefined,
    showResults: false,
    authVerified: false,
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
  private alertMsg: ErrorMsg = { title: "", message: "" };

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
                  clearError={() => {
                    if (this.alertMsg.title.includes(File.Orchestra) || this.alertMsg.title.includes(File.Orchestra)) {
                      this.setState({ referenceFileError: "", showAlerts: "" })
                    }
                    else {
                      this.setState({ referenceFileError: "" })
                    }
                  }}
                />
              </div>
              <div className="field">
                <FileInput
                  label="FIX message log files"
                  onChange={this.inputLogs}
                  ref={this.setLogFileBarRef as () => {}}
                  multiple={true}
                  error={this.state.logFilesError}
                  clearError={() => {
                    if (this.alertMsg.title.includes(File.MessageLog)) {
                      this.setState({ logFilesError: "", showAlerts: "" })
                    }
                    else {
                      this.setState({ logFilesError: "" })
                    }
                  }}
                />
              </div>
              <div className="field">
                <FileInput
                  label="Configuration file for scenarios (optional)"
                  accept=".json"
                  onChange={this.inputConfiguration}
                  ref={this.setConfigurationFileBarRef as () => {}}
                  clearError={() => {
                    if (this.alertMsg.title.includes(File.Configuration)) {
                      this.setState({ showAlerts: "" })
                    }
                  }}
                />
              </div>
            </div>
            <button className="clearFieldsButton" onClick={this.handleClearFields.bind(this)}>Clear Input Files</button>
            {
              this.state.showAlerts && 
              <div className="errorContainer">
                <h4>{this.alertMsg.title}</h4>
                <textarea readOnly={true} className="errorMessage" value={this.alertMsg.message}></textarea>
              </div>
            }
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
              <button
                type="button"
                className="submitButton"
                onClick={() => this.createOrchestra()}
                disabled={
                  this.state.showAlerts ||
                  Boolean(this.state.logFilesError) ||
                  Boolean(this.state.orchestraFileNameError) ||
                  Boolean(this.state.referenceFileError)}
              >
                {
                  this.state.creatingFile ? "Loading..." : "Create Orchestra file"
                }
              </button>
              <div className="redirectButtonContainers">
                <a
                  className="redirectButton"
                  href="http://fixprotocol.io/orchestratools/termsofservice.html"
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  Terms of Service
                </a>
                <a
                  className="redirectButton"
                  href="http://fixprotocol.io/orchestratools/log2orchestra/v1.0/configuration-help.html"
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  Help
                </a>
              </div>
            </div>
            {
              this.state.results && this.state.downloadHref &&
                <button className="showResultsButton" onClick={this.openResults}>Show Results</button>
            }
            <ProgressBar ref={this.setOutputFileBarRef as () => {}} />
          </div>
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

    if (this.inputProgress instanceof FileInput) {
      this.inputProgress.clear()
    }
    if (this.logProgress instanceof FileInput) {
      this.logProgress.clear()
    }
    if (this.configurationProgress instanceof FileInput) {
      this.configurationProgress.clear()
    }

    this.setState({
      downloadHref: "",
      downloadUrl: "",
      results: undefined,
      showResults: false,
      showAlerts: false
    });

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

    } else if (progressNode.style) {
      progressNode.style.backgroundColor = "red";
    }
    if (progressNode.parentElement) {
      progressNode.parentElement.style.visibility = "visible";
    }
  }
  private handleReaderFinish = (output: OrchestraFile, messagesCount: number) => {

  //return the values from the statistics dictionary

    const fixMessageTypes = output.statistics.Item("Messages.Added");

    const messageScenarios = output.statistics.Item("Scenarios.Added");

    const fields = output.statistics.Item("Fields.Used");

    const userDefinedFields = output.statistics.Item("Fields.UserDefined");

    const components = output.statistics.Item("Components.Used");

    const componentScenarios = 0;  // Needs to be implemented


    this.setState({
      results: {
        componentScenarios,
        components,
        fields,
        fixMessageTypes,
        messagesCount,
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
    this.setState({
      results: undefined,
      showResults: false,
    });

    if (this.referenceFile && this.logFiles && this.orchestraFileName && this.inputProgress && this.outputProgress &&
      this.logProgress && this.configurationProgress) {
      this.setState({ showAlerts: false, creatingFile: true });
      const runner: Log2Orchestra = new Log2Orchestra(this.referenceFile, this.logFiles, this.configurationFile, this.orchestraFileName, this.appendOnly,
        this.inputProgress, this.outputProgress, this.logProgress, this.configurationProgress, this.showProgress);
      try {
        runner.onFinish = this.handleReaderFinish;

        await runner.run();
        this.setState({ creatingFile: false });

        if (this.outputProgress instanceof ProgressBar) {
          this.outputProgress.setProgress(0);
        }
      } catch (error) {
        if (error) {
          Sentry.captureException(error);
          
          this.alertMsg = {
            title: this.getErrorTitle(error.name),
            message: this.setMessageError(error.message || error)
          };
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

  private getErrorTitle(error: string): string {
    switch (error) {
      case File.Orchestra:
      case File.Configuration:
      case File.MessageLog:
        return `There was an error reading your ${error}, please upload it again`;
      default:
        return `Your input orchestra file ${this.referenceFile && `named '${this.referenceFile.name}'`} is invalid or empty`;
    }
  }

  private setMessageError(errorMsg: string): string {
    const NotReadableErrorRes =
      'The requested file could not be read, possibly due to a permission problem or because the file was changed';
    return (
      errorMsg.startsWith('NotReadableError') ? `NotReadableError: ${NotReadableErrorRes}` : errorMsg
    );
  }

  private createLink(contents: Blob): void {
    if (this.orchestraFileName) {
      const url = window.URL.createObjectURL(contents);

      this.setState({
        downloadHref: url,
        downloadUrl: [OrchestraFile.MIME_TYPE, this.orchestraFileName, url].join(':'),
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
      });
    }, 1500);
  }

  private CheckAuthenticated() {

    if (process.env.NODE_ENV === "development") {
      this.setState({
        authVerified: true,
      })
      return;
    }

    const urlparsed = QueryString.parse(window.location.search);
    const id_token = urlparsed.id_token as string;
    try {
      const decoded: null | IDecoded | string = jwt.decode(id_token);
      if (!decoded) {
        throw new Error("unauthenticated");
      }
      if (typeof decoded !== "string" && decoded.exp) {
        const sec = decoded.exp as number;
        const date: Date = new Date(0);
        date.setUTCSeconds(sec);
        const now: Date = new Date();
        if (date < now) {
          throw new Error("expired");
        }
      }

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

    } catch (e) {
      Utility.Log(e);

      const redirectUri = process.env.REACT_APP_REDIRECT_URL;
      const clientId = process.env.REACT_APP_CLIENT_ID;

      window.location.href = "https://fixtrading.xecurify.com/moas/idp/openidsso?" +
        "client_id="+ clientId +"&" +
        "redirect_uri="+ redirectUri + "&" +
        "scope=profile&" +
        "response_type=token&" +
        "state=123";
    }
  }
}
