import React, { Component } from 'react';
import Dropzone from 'react-dropzone';
import ProgressCircle from "../ProgressCircle/ProgressCircle";
import "./fileInput.css";
import { readXMLfromURL } from "../helper";
import FileDialog from '../FileDialog/FileDialog';
import { GitStandardFile, FixStandardFile } from "../../types/types"

interface Props {
  label: string;
  accept?: HTMLInputElement['accept'];
  multiple?: boolean;
  onChange: (files: FileList) => void;
  error?: string;
  clearError?: () => void;
  fixStandardFiles?: GitStandardFile[];
}

class FileInput extends Component<Props> {

  public state = {
    fileName: "",
    pct: 0,
  }

  public render() {
    const { label, accept, multiple = false, error, fixStandardFiles = null } = this.props;
    const { pct, fileName } = this.state;
    
    const fixOnClick = async (fileObject: any): Promise<any> => { 
      const file: FixStandardFile = await readXMLfromURL(fileObject)
      this.onChange(null as any, [file]);
    }

    return (
      <div className="fileInput">
        <p className="inputLabel">{label}</p>
        <Dropzone onDrop={this.onDrop as any} multiple={multiple} >
          {({ getRootProps, getInputProps, isDragActive, draggedFiles }) => {
            
            const isValidFileType = this.isValidType(draggedFiles[0]);
            const fileType = draggedFiles[0] && draggedFiles[0].type.split("/")[1]

            return (
              <div {...getRootProps()}>
                <input
                  {...getInputProps({
                    onChange: this.onChange,
                  })}
                  accept={accept}
                  multiple={multiple}
                />
                <div className={`inputBox ${isDragActive ? "dragActive" : ""} ${(!isValidFileType && isDragActive) || error  ? "inputBoxError" : ""}`}>
                  {
                    isDragActive ?
                      <>
                        <ProgressCircle value={pct} />
                        <div>
                          {
                            isValidFileType ?
                            <p className="inputText">{`Drop your ${label} here`}</p> :
                            <p className="inputText inputTextError">{fileType || "This file type" } is not allowed</p>
                          }
                        </div>
                      </>
                      :
                      <>
                        <ProgressCircle value={pct} />
                        <div className="inputContent">
                          <p className="inputText">Drag file to read or</p>
                          <div className="chooseFileButton">Choose File{multiple ? "s" : ""}</div>
                          {fixStandardFiles && <FileDialog fixStandardFiles={fixStandardFiles} fixOnClick={fixOnClick} />}
                        </div>
                        { !error && <p className="fileName">{fileName}</p>}
                        { error && <p className="fileName inputTextError">{error}</p> }
                      </>
                  }
                </div>
              </div>
            )
          }}
        </Dropzone>
      </div>
    )

  }

  public isValidType = (file: File | undefined) => {
    const acceptedType = this.props.accept && this.props.accept.replace(".", "");
    const fileType = file && file.type.split("/")[1];
    

    if (!file || !acceptedType || (!fileType && !acceptedType)) { return true; }
    
    return acceptedType === fileType
  }

  public onChange = async (e: React.ChangeEvent<HTMLInputElement>, repoFiles?: FixStandardFile[]) => { 
    const files = e ? e.target.files && e.target.files : repoFiles;
    
    if (this.props.clearError) {
      this.props.clearError();
    }    
    this.handleChange(files as FileList);
  };

  public handleChange = (files: FileList) => { 
    const filesArray = new Array(...files);

    const areFilesValid = filesArray.every(f => this.isValidType(f));

    if (!areFilesValid) {
      return;
    }

    if (files.length > 1) {
      this.setState({
        fileName: `${files.length} files loaded`
      })
    } else {
      this.setState({
        fileName: files[0] ? files[0].name : ""
      })
    }
    this.setProgress(100);
    this.props.onChange(files);
  }

  public setProgress = (value: number) => {
    this.setState({
      pct: value
    })
  };

  public clear = () => {
    this.setState({
      fileName: "",
      pct: 0
    })
  }

  private onDrop = async (acceptedFiles: FileList) => {
    this.handleChange(acceptedFiles);
  };
}

export default FileInput;
