import { GitStandardFile, FixStandardFile } from './types';

export const readXMLfromURL = (file: GitStandardFile): any => new Promise((resolve, reject) => {
  try {
    const request = new XMLHttpRequest();
    request.open("GET", `${file.download_url}`, true);
    request.responseType = 'document';
    request.overrideMimeType('text/xml');
    request.onload = () => {
      if (request.readyState === request.DONE && request.status === 200) {
          const oSerializer = new XMLSerializer();
          const sXML = oSerializer.serializeToString(request.responseXML as Node);
          const newFile: FixStandardFile = new Blob([sXML], {type : 'text/xml'});
          newFile.name = file.name;
          newFile.path = file.path;
          resolve(newFile);
        } else {
          reject("Error reading Standard File");
        }
    };
    request.send(null);
  } catch (e) {
    reject("Error reading Standard File");
  }
})

export const getFileList = (): any => new Promise((resolve, reject) => {
  fetch('https://api.github.com/repositories/89743776/contents/FIX%20Standard')
  .then(response => response.json())
  .then(data => resolve(data))
  .catch(err => reject("Error reading Standard Files"));
})
