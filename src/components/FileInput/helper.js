

export const readXMLfromURL = file_url => new Promise((resolve, reject) => {
  const request = new XMLHttpRequest();
  request.open("GET", file_url, true);
  request.responseType = 'document';
  request.overrideMimeType('text/xml');
  request.onload = () => {
    if (request.readyState === request.DONE) {
      if (request.status === 200) {
        var oSerializer = new XMLSerializer();
        var sXML = oSerializer.serializeToString(request.responseXML);
        var newFile = new Blob([sXML], {type : 'text/xml'})
        console.log("sXML", sXML);
        
        newFile.name = "OrchestraGit.xml"
        newFile.path = "OrchestraGit.xml"
        console.log(newFile);

        resolve(newFile)
      } else {
        reject(new Error("test"))
      }
    }
  };
  request.send(null);
})
