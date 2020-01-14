import React, { Component } from 'react';
import Dropzone from 'react-dropzone';
import ProgressCircle from "./ProgressCircle";

interface Props {
  label: string;
  accept?: HTMLInputElement['accept'];
  multiple?: boolean;
  onChange: (files: FileList) => void;
}

class FileInput extends Component<Props> {

  public state = {
    fileName: "",
    pct: 0,
  }

  public render() {
    const { label, accept, multiple = false } = this.props;
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
                <div className={`inputBox ${isDragActive ? "dragActive" : ""} ${!isValidFileType && isDragActive ? "inputBoxError" : ""}`}>
                  {
                    isDragActive ?
                      <>
                        <ProgressCircle value={pct} />
                        <div>
                          {
                            isValidFileType ?
                            <p className="inputText">Drop your Reference Orchestra file here</p> :
                            <p className="inputText inputTextError">{fileType} is not allowed</p>
                          }
                        </div>
                      </>
                      :
                      <>
                        <ProgressCircle value={pct} />
                        <div className="inputContent">
                          <p className="inputText">Drag file to upload or</p>
                          <div className="chooseFileButton">Chose File{multiple ? "s" : ""}</div>
                        </div>
                        <p className="fileName">{fileName}</p>
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
    
    return acceptedType === fileType
  }

  public onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files && e.target.files;

    this.handleChange(files as FileList);
  };

  public handleChange = (files: FileList) => {
    const file = files[0];

    if (!this.isValidType(file)) {
      return;
    }
    
    if (file) {
      this.setState({
        fileName: file.name
      })
    }
    
    this.props.onChange(files);
  }

  public setProgress = (value: number) => {
    this.setState({
      pct: value
    })
  };

  private onDrop = (acceptedFiles: FileList) => {
    
    this.handleChange(acceptedFiles)
  };
}

export default FileInput;