import React, { Component } from 'react';
import "./progressBar.css";

interface State {
  value: number,
}

class ProgressBar extends Component<{}, State> {

  public state = {
    value: 0,
  }

  public render() {
    const  { value } = this.state;

    if (!value) { return null }
    
    return (
      <div className="progressBarContainer">
        <div className="progressBar" style={{ width: `${value}%` }} />
      </div>
    )
  }

  public setProgress = (value: number) => {
    this.setState({
      value
    })
  };
}

export default ProgressBar;