/*!
 * Copyright 2019, FIX Protocol Ltd.
 */

import React, { Component } from 'react';
import './help.css';

export default class Help extends Component {
    
    render() {
        return (
            <div className="Help-container">
            <h2>Help</h2>
            <h3>Configuration</h3>
            <p>The log2orchestra tool distinguishes message scenarios by a key field in each message type, or a combination of key
            fields. A configuration file is read as JSON (JavaScript Object Notation) like the following sample</p>
            <pre>
        {`
         {   
            "keys": [
                {
                    "msgType": "6",
                    "fieldIds": ["28"]
                },
                {
                    "msgType": "7",
                    "fieldIds": ["5"]
                },
                {
                    "msgType": "8",
                    "fieldIds": ["150", "39"]
                }
            ]
        }
        `}
            </pre>
            <p>The <b>keys</b> object is an array of configurations for each message type.</p>
            <p>The <b>msgType</b> property is a FIX MsgType, e.g. "6" for an IOI message.</p>
            <p>The <b>fieldIds</b> property is an array of field tags that distinguish scenarios for the associated msgType. 
            Commonly, the array is a single field tag. For instance, IOITransType (28) distinguishes scenarios for the IOI message (MsgType=6) in the sample.
            However, scenarios may be distinguish by a combination of fields. In this sample, ExecutionReport (MsgType=8) scenarios are distinguished by the 
            combination of ExecType (150) and OrdStatus (39) fields.</p>
            <p>If a configuration file is not supplied to log2orchestra, then default keys are used.</p>
            </div>
        )
    }
}