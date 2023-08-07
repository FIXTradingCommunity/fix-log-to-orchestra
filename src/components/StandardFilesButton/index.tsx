import * as React from 'react';
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
import "./index.css";
import { FixStandardFile, GitStandardFile } from './types';
import { getFileList, readXMLfromURL } from './helpers';

const useStyles = makeStyles({
  avatar: {
    backgroundColor: blue[100],
    color: blue[600],
  },
});

export interface StandardFileProps {
  open: boolean;
  selectedValue: string,
  onClose: (value: string) => void;
  fixStandardFiles: any;
  handleCancel: any;
}

function StandardFile(props: StandardFileProps) {
  const classes = useStyles();
  const { onClose, selectedValue, open, handleCancel, fixStandardFiles } = props; 
  const handleClose = () => {
    onClose(selectedValue);
  };

  const handleListItemClick = (value: any, e: any) => {
    e.stopPropagation();
    onClose(value);
  };
    
  return (
    <Dialog onClose={handleClose} aria-labelledby="simple-dialog-title" open={open}>
      <DialogTitle id="simple-dialog-title">Select FIX Standard File</DialogTitle>
      <List>
        {fixStandardFiles && fixStandardFiles.map((file: any) => (
          <ListItem button onClick={(e) => handleListItemClick(file, e)} key={file.name}>
            <ListItemAvatar>
              <Avatar className={classes.avatar}>
                <AttachFileIcon />
              </Avatar>
            </ListItemAvatar>
            <ListItemText primary={file.name} />
          </ListItem>
        ))}
      </List>
      <Button onClick={handleCancel} variant="contained">Cancel</Button>
    </Dialog>
  );
}

export default function StandardFileButton(props: any) {
  const { setErrorMessage } = props;
  const [open, setOpen] = React.useState(false);
  const [fixStandardFiles, setFixStandardFiles] = React.useState<any>(null);
  React.useEffect(() => {
    try {
      const fetchData = async () => {
        const data: GitStandardFile[] | any = await getFileList();
        if (data.message) {
          setErrorMessage("Standard Files Error", "Error reading Standard Files")
          throw new Error("Error reading Standard Files");
        }
        const filteredData = data && data.filter((e: GitStandardFile) => !(e.name === "Readme.md" || e.name === "pom.xml" || !e.name.includes(".xml")));
        setFixStandardFiles(filteredData);
      }
      fetchData();
    } catch (err) {
      setErrorMessage("Standard Files Error", "Error reading Standard Files")
      console.error(err)
    }
  }, [setErrorMessage]);
  
  const fixOnClick = async (fileObject: any) => {
      await readXMLfromURL(fileObject)
      .then((res: FixStandardFile) => {
        props.onChange([res]);
      })
      .catch((err: any) => {
        setErrorMessage("Standard Files Error", "Error reading Standard File")
        throw err;
      })
  }

  const handleClickOpen = (e: any) => {
    e.stopPropagation();    
    setOpen(true);
  };
  
  
  const handleClose = (value: any) => {
    try {
      if (value) fixOnClick(value)
    } catch (error) {
      throw error
    }
    setOpen(false);
  };

  const handleCancel = (e: any) => {
     e.stopPropagation();
    setOpen(false);
  }
  
  return (
    <div onClick={handleClickOpen} title="Choose required source file from standard Orchestra files in GitHub" className="chooseFileButton fixFileButton">
        FIX Standard
      <StandardFile selectedValue={""} open={open} handleCancel={handleCancel} onClose={handleClose} fixStandardFiles={fixStandardFiles} />
    </div>
  );
}