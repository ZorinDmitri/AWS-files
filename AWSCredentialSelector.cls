public with sharing class AWSCredentialSelector {
  @AuraEnabled(cacheable=false)
  public static SalesforceOrgSettings__c getS3Creds() {
    try {
      return [
        SELECT AWSS3AccessKeyId__c, AWSS3AccessKeySecret__c
        FROM SalesforceOrgSettings__c
        LIMIT 1
      ];
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }
  }
}
