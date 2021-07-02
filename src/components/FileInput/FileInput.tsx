import React, { Component } from 'react';
import Dropzone from 'react-dropzone';
import ProgressCircle from "../ProgressCircle/ProgressCircle";
import "./fileInput.css";

interface Props {
  label: string;
  accept?: HTMLInputElement['accept'];
  multiple?: boolean;
  onChange: (files: FileList) => void;
  error?: string;
  clearError?: () => void;
}

class FileInput extends Component<Props> {

  public state = {
    fileName: "",
    pct: 0,
  }

  public render() {
    const { label, accept, multiple = false, error } = this.props;
    const { pct, fileName } = this.state;

    return (
      <div className="fileInput">
        <p className="inputLabel">{label}</p>
  
        <Dropzone onDrop={this.onDrop as () => {}}>
          {({ getRootProps, getInputProps, isDragActive, draggedFiles }) => {
            
            const isValidFileType = this.isValidType(draggedFiles[0]);
            const fileType = draggedFiles[0] && draggedFiles[0].type.split("/")[1]

            return (
              <div {...getRootProps()}>
                <input
                  {...getInputProps({
                    onChange: this.onChange
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
                            <p className="inputText">Drop your Reference Orchestra file here</p> :
                            <p className="inputText inputTextError">{fileType || "This file type" } is not allowed</p>
                          }
                        </div>
                      </>
                    :
                    <>
                        <ProgressCircle value={pct} />
                        <div className="inputContent">
                          <p className="inputText">Drag file to upload or</p>
                          <div className="chooseFileButton">Choose File{multiple ? "s" : ""}</div>
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

    if (!acceptedType || (!fileType && !acceptedType)) { return true; }
    
    return acceptedType === fileType
  }

  public onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files && e.target.files;

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

  private onDrop = (acceptedFiles: FileList) => {
    this.handleChange(acceptedFiles);
  };
}

export default FileInput;