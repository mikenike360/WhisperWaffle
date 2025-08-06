// src/utils/s3.ts

import AWS from 'aws-sdk';

// Configure AWS SDK
AWS.config.update({
  region: process.env.AWS_REGION, // Example: 'us-east-1'
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const s3 = new AWS.S3();

/**
 * Uploads JSON data to S3.
 * @param bucketName - Name of the S3 bucket.
 * @param key - The key (path/filename) within the bucket.
 * @param data - The data to upload.
 */
export async function uploadToS3(bucketName: string, key: string, data: object): Promise<void> {
  const params = {
    Bucket: bucketName,
    Key: key, // The name of the file in the bucket
    Body: JSON.stringify(data), // The data to upload
    ContentType: 'application/json',
  };

  await s3.upload(params).promise();
  console.log(`Uploaded ${key} to ${bucketName}`);
}

/**
 * Uploads a binary file to S3.
 * @param bucketName - Name of the S3 bucket.
 * @param key - The key (path/filename) within the bucket.
 * @param fileBuffer - The binary data of the file.
 * @param contentType - MIME type of the file.
 */
export async function uploadFileToS3(
  bucketName: string,
  key: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<void> {

  const validatedContentType = contentType || 'application/octet-stream';

  const params = {
    Bucket: bucketName,
    Key: key,
    Body: fileBuffer,
    ContentType: validatedContentType,
  };

  console.log('Uploading file to S3 with params:', params);

  try {
    const uploadResult = await s3.upload(params).promise();
    console.log(`Upload successful:`, uploadResult);
  } catch (error) {
    console.error('S3 Upload Error:', error);
    throw error; // Rethrow to handle it at a higher level
  }
}

/**
 * Retrieves data from S3.
 * @param bucketName - Name of the S3 bucket.
 * @param key - The key (path/filename) within the bucket.
 * @returns The retrieved object as a parsed JSON object.
 */
export async function getFromS3(bucketName: string, key: string): Promise<object> {
  const params = {
    Bucket: bucketName,
    Key: key,
  };

  const result = await s3.getObject(params).promise();
  return JSON.parse(result.Body?.toString() || '{}');
}

/**
 * Lists all objects in a specified S3 bucket.
 * @param bucketName - Name of the S3 bucket.
 * @returns An array of objects containing metadata for each S3 object.
 */
export async function listBucket(bucketName: string): Promise<AWS.S3.Object[]> {
  const params = {
    Bucket: bucketName,
  };

  const allObjects: AWS.S3.Object[] = [];
  let isTruncated = true;
  let continuationToken: string | undefined = undefined;

  while (isTruncated) {
    const response = await s3
      .listObjectsV2({
        ...params,
        ContinuationToken: continuationToken,
      })
      .promise();

    if (response.Contents) {
      allObjects.push(...response.Contents);
    }

    isTruncated = response.IsTruncated ?? false;
    continuationToken = response.NextContinuationToken;
  }

  return allObjects;
}

/**
 * Retrieves the content of a specific object in S3.
 * @param bucketName - Name of the S3 bucket.
 * @param key - The key (path/filename) within the bucket.
 * @returns The content of the object as a string.
 */
export async function getObjectContent(bucketName: string, key: string): Promise<string> {
  const params = {
    Bucket: bucketName,
    Key: key,
  };

  const result = await s3.getObject(params).promise();
  return result.Body?.toString('utf-8') || '';
}
