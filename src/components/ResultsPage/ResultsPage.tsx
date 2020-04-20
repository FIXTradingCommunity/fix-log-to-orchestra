import React from "react";
import cancelIcon from "./cancel.svg";
import "./resultsPage.css";

interface Props {
  results?: {
    componentScenarios: number;
    components: number;
    fields: number;
    fixMessageTypes: number;
    messageScenarios: number;
    userDefinedFields: number;
  };
  downloadButton: JSX.Element;
  onClose: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const ProgressCircle: React.FC<Props> = (props) => {
  const { results, downloadButton, onClose } = props;

  let componentScenarios = 0;
  let components = 0;
  let fields = 0;
  let fixMessageTypes = 0;
  let messageScenarios = 0;
  let userDefinedFields = 0;
  
  if (results) {
    componentScenarios = results.componentScenarios;
    components = results.components;
    fields = results.fields;
    fixMessageTypes = results.fixMessageTypes;
    messageScenarios = results.messageScenarios;
    userDefinedFields = results.userDefinedFields;
  }

  return (
    <div className="resultsPageContainer">
      <div className="resultsPageOverlay" />
      <div className="resultsContainer">
        <button className="closeButton" onClick={onClose}>
          <img className="closeIcon" src={cancelIcon} alt="close" />
        </button>
        <div className="resultsValueContainer no-margin-top">
          <div className="resultsLabel"># FIX Message Types discovered</div>
          <div className="resultsValue">{fixMessageTypes}</div>
        </div>
        <div className="resultsValueContainer">
          <div className="resultsLabel"># scenarios created</div>
          <div className="resultsValue">{messageScenarios}</div>
        </div>
        <div className="resultsValueContainer">
          <div className="resultsLabel"># fields discovered</div>
          <div className="resultsValue">{fields}</div>
        </div>
        <div className="resultsValueContainer">
          <div className="resultsLabel"># user defined fields discovered</div>
          <div className="resultsValue">{userDefinedFields}</div>
        </div>
        <div className="resultsValueContainer">
          <div className="resultsLabel"># components discovered</div>
          <div className="resultsValue">{components}</div>
        </div>
        <div className="resultsValueContainer">
          <div className="resultsLabel"># component scenarios discovered</div>
          <div className="resultsValue">{componentScenarios}</div>
        </div>
        <div className="downloadButtonContainer">
          {downloadButton}
        </div>
      </div>
    </div>
  );
};

export default ProgressCircle;
