import { LightningElement, track, wire } from "lwc";
import awssdk from "@salesforce/resourceUrl/AWSSDK";
import { loadScript } from "lightning/platformResourceLoader";
//getting S3Creds from MDT
import getS3Creds from "@salesforce/apex/AWSCredentialSelector.getS3Creds";
//should be fetching files from custom object with AWS file data
import fetchContentVersions from "@salesforce/apex/AWSFileController.fetchContentVersions";
//mock data
import SIZE from "@salesforce/schema/ContentVersion.ContentSize";
import MODIFIED_DATE from "@salesforce/schema/ContentVersion.ContentModifiedDate";
import PATH from "@salesforce/schema/ContentVersion.PathOnClient";

import { NavigationMixin } from "lightning/navigation";

const BUTTON_LABEL = "Preview";
//bucket hardcoded
const BUCKET = "*****";

export default class AWSMockup extends NavigationMixin(LightningElement) {
  columns = [
    {
      label: "File name",
      fieldName: PATH.fieldApiName,
      sortable: false,
      editable: false,
      initialWidth: 360
    },
    {
      label: "Size, bytes",
      fieldName: SIZE.fieldApiName,
      sortable: false,
      editable: false,
      initialWidth: 200
    },
    {
      label: "Last Modified Date",
      fieldName: MODIFIED_DATE.fieldApiName,
      sortable: false,
      editable: false,
      initialWidth: 240
    },
    {
      type: "button",
      initialWidth: 120,
      typeAttributes: {
        label: BUTTON_LABEL,
        name: BUTTON_LABEL,
        title: BUTTON_LABEL,
        disabled: false,
        value: BUTTON_LABEL,
        variant: "Brand"
      }
    }
  ];

  keyId;
  keySecret;
  @track fileName;
  @track showSpinner = false;
  fileToUpload;
  wiredMockData;
  error;

  @wire(fetchContentVersions)
  wiredPlans(result) {
    if (result.data) {
      this.wiredMockData = result.data;
      this.error = undefined;
    } else if (result.error) {
      this.error = result.error;
      this.wiredMockData = undefined;
      console.log("Error: " + this.error);
    }
  }

  renderedCallback() {
    Promise.all([loadScript(this, awssdk)])
      .then(() => {
        this.getObjectsFromS3();
      })
      .catch((error) => {
        console.error("error -> " + error);
      });
  }

  async getObjectsFromS3() {
    console.log("retrieving file list..");

    const AWS = window.AWS;

    getS3Creds().then((result) => {
      this.keyId = result.AWSS3AccessKeyId__c;
      this.keySecret = result.AWSS3AccessKeySecret__c;
//region is hardcoded
      AWS.config.update({
        apiVersion: "2006-03-01",
        accessKeyId: this.keyId,
        secretAccessKey: this.keySecret,
        region: "eu-central-1",
        bucket: BUCKET
      });

      var s3 = new AWS.S3();

      async function getSignedUrl() {
        return new Promise((resolve, reject) => {
          let params = {
            Bucket: BUCKET,
            MaxKeys: 1000
          };
          s3.getSignedUrl("listObjectsV2", params, (err, url) => {
            if (err) {
              console.log("S3 error: " + err);
              reject(err);
            }
            resolve(url);
          });
        });
      }

      async function processFileList() {
        const signedUrl = await getSignedUrl();
        console.log("fileList URL: " + signedUrl);
        fetch(signedUrl, {
          method: "Get"
        })
          .then((response) => {
            return response;
          })
          .catch((error) => {
            console.log("file listing error caught");
            console.error(error);
          });
      }
//should transform xml to json here or another option is to retrieve from file data custom object
      processFileList().then((res) => {
        var parser = new DOMParser();
        var xml = parser.parseFromString(res, "application/xml");
        const jsonData = JSON.stringify(xml);
        console.dirxml("xml: " + xml);
        console.log("jsonData: " + jsonData);
      });
    });
  }

  handleSelectedFiles(event) {
    if (event.target.files.length > 0) {
      this.fileToUpload = event.target.files[0];
      this.fileName = event.target.files[0].name;
      console.log("fileName ====> " + this.fileName);
      this.uploadToAWS(this.fileName, this.fileToUpload);
    }
  }

  //uploading file to bucket with presigned URL to avoid SF file size limits
  async uploadToAWS(fileName, fileBody) {
    console.log("uploadToAWS...");

    const AWS = window.AWS;

    getS3Creds().then((result) => {
      this.keyId = result.AWSS3AccessKeyId__c;
      this.keySecret = result.AWSS3AccessKeySecret__c;

      AWS.config.update({
        apiVersion: "2006-03-01",
        accessKeyId: this.keyId,
        secretAccessKey: this.keySecret,
        region: "eu-central-1",
        bucket: BUCKET
      });

      var s3 = new AWS.S3();

      async function getSignedUrl(fileName) {
        return new Promise((resolve, reject) => {
          let params = {
            Bucket: BUCKET,
            ContentType: fileBody.type,
            Key: fileName
          };
          s3.getSignedUrl("putObject", params, (err, url) => {
            if (err) {
              console.log("S3 error: " + err);
              reject(err);
            }
            resolve(url);
          });
        });
      }

      async function uploadFile(fileName) {
        const signedUrl = await getSignedUrl(fileName);
        console.log("upload file URL: " + signedUrl);

        fetch(signedUrl, {
          method: "PUT",
          body: fileBody
        })
          .then((response) => {
            return response;
          })
          .catch((error) => {
            console.log("file upload error caught");
            console.error(error);
          });
      }

      uploadFile(fileName).then((res) => {
        console.log(res);
        console.log("uploadToAWS Finish...");
      });
    });
  }
  
//used for rendering files with presigned URL
  async showDocumentLink() {
    const AWS = window.AWS;

    getS3Creds().then((result) => {
      this.keyId = result.AWSS3AccessKeyId__c;
      this.keySecret = result.AWSS3AccessKeySecret__c;
//hardcoded bucket
      AWS.config.update({
        accessKeyId: this.keyId,
        secretAccessKey: this.keySecret,
        region: "eu-central-1",
        bucket: "*****"
      });

      var s3 = new AWS.S3();
//hardcoded file for development purposes, should be generated on a case-by-case basis, depending on which file we render
      var strImageUrl =
        "*******";
      if (strImageUrl != null && strImageUrl != "") {
        var keyindex = strImageUrl.lastIndexOf("/");
        var strKey = strImageUrl.substring(keyindex + 1);
      }

      async function getSignedUrl() {
        return new Promise((resolve, reject) => {
          let params = {
            Bucket: BUCKET,
            Key: strKey
          };
          s3.getSignedUrl("getObject", params, (err, url) => {
            if (err) {
              console.log("S3 error: " + err);
              reject(err);
            }
            resolve(url);
          });
        });
      }

      async function processFileURL() {
        const signedUrl = await getSignedUrl();
        return signedUrl;
      }

      processFileURL().then((result) => {
        this.pdfUrl = result;
        this[NavigationMixin.Navigate]({
          type: "standard__webPage",
          attributes: {
            url: this.pdfUrl
          }
        });
      });
    });
  }

  renderFile() {
    this.showDocumentLink();
  }
}
