import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import AttachFileIcon from '@material-ui/icons/AttachFile';
import Avatar from '@material-ui/core/Avatar';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemAvatar from '@material-ui/core/ListItemAvatar';
import ListItemText from '@material-ui/core/ListItemText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Dialog from '@material-ui/core/Dialog';
import Button from '@material-ui/core/Button';
import { blue } from '@material-ui/core/colors';
import "./fileDialog.css";
import { DialogContent } from '@material-ui/core';


const useStyles = makeStyles({
  avatar: {
    backgroundColor: blue[100],
    color: blue[600],
  },
});

export interface SimpleDialogProps {
  open: boolean;
  selectedValue: string;
  onClose: (value: string) => void;
  fixStandardFiles: any;
  handleCancel: any;
  title: string;
  buttonText: string;
  errorMessage: string;
}

function SimpleDialog(props: SimpleDialogProps) {
  const classes = useStyles();
  const { onClose, selectedValue, open, handleCancel, fixStandardFiles, title, buttonText, errorMessage } = props; 
  const handleClose = () => {
    onClose(selectedValue);
  };

  const handleListItemClick = (value: any, e: any) => {
    e.stopPropagation();
    onClose(value);
  };
    
  return (
    <Dialog onClose={handleClose} aria-labelledby="simple-dialog-title" open={open}>
      <DialogTitle id="simple-dialog-title">{title}</DialogTitle>
      {fixStandardFiles && fixStandardFiles.length > 0 && (<List>
        {fixStandardFiles.map((file: any) => (
          <ListItem button onClick={(e) => handleListItemClick(file, e)} key={file.name}>
            <ListItemAvatar>
              <Avatar className={classes.avatar}>
                <AttachFileIcon />
              </Avatar>
            </ListItemAvatar>
            <ListItemText primary={file.name} />
          </ListItem>
        ))}
      </List>)}
      {(!fixStandardFiles || fixStandardFiles.length === 0) && (
        <DialogContent>{errorMessage}</DialogContent>
      )}
      <Button onClick={handleCancel} variant="contained">{buttonText}</Button>
    </Dialog>
  );
}

export default function SimpleDialogDemo(props: any) {
  const [open, setOpen] = React.useState(false);
  
  const handleClickOpen = (e: any) => {
    e.stopPropagation();    
    setOpen(true);
  };
  const { fixStandardFiles, fixOnClick } = props;
  
  const handleClose = (value: any) => {
    if (value) fixOnClick(value)
    setOpen(false);
  };

  const handleCancel = (e: any) => {
     e.stopPropagation();
    setOpen(false);
  }
  
  return (
    <div onClick={handleClickOpen} className="chooseFileButton fixFileButton">
        FIX Standard
      <SimpleDialog 
        selectedValue={""}
        open={open}
        handleCancel={handleCancel}
        onClose={handleClose}
        fixStandardFiles={fixStandardFiles}
        title={
          fixStandardFiles.length > 0 
            ? "Select FIX Standard File"
            : "Retrieval failed"
        }
        buttonText={
          fixStandardFiles.length > 0 
            ? "Cancel"
            : "Ok"
        }
        errorMessage={"Access to GitHub failed, please choose a local file."}
      />
    </div>
  );
}