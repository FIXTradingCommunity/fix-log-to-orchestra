import * as React from 'react';
import "./index.css";

export default function InputButton(props: any) {

  const { onChange, disableButton, buttonStyle, buttonTitle, titleAttributes } = props;

  const handleOnClick = (e: any) => {
    disableButton ?  e.stopPropagation() : onChange()
  }

  return (
    <div onClick={handleOnClick} className="fieldsButtonContainers" title={titleAttributes}>
        <button className={`${buttonStyle} ${disableButton && "disabledButton"}`}>
          {buttonTitle}
        </button>
    </div>
  );
}
