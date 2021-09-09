import React, { Component } from 'react';
import upArrow from "../../assets/up-arrow.svg";
import "./progressCircle.css";

interface Props {
  value: number;
}

const r = 28;
const c = Math.PI*(r*2);

class ProgressCircle extends Component<Props> {

  public bar?: SVGCircleElement | null;

  public state = {
    pct: c,
    pctString: undefined
  }
  
  public render() {
    const { value } = this.props;

    const pctString: string = Math.floor(value).toString() + "%";
    const pct = ((100-value)/100) * c;

    return (
      <div className="progressCircleContainer" data-pct={value ? (value === 100 ? pctString : 'Reading') : ""}>
        { !value && <img src={upArrow} className="upArrow" alt="" /> }
        <svg className="circleSvg" width="60" height="60" version="1.1" xmlns="http://www.w3.org/2000/svg">
          <circle
            className="circleBackground"
            r={r}
            cx="30"
            cy="30"
            fill="transparent"
            strokeDasharray={c}
            strokeDashoffset="0"
          />
          <circle
            ref={ref => this.bar = ref}
            r={r}
            className="progressBar"
            cx="30"
            cy="30"
            fill="transparent"
            strokeDasharray={c}
            strokeDashoffset="0"
            style={{ strokeDashoffset: pct.toString()+ "px" }}
          />
        </svg>
      </div>
    )
  }
}

export default ProgressCircle;