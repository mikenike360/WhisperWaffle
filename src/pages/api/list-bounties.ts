import type { NextApiRequest, NextApiResponse } from 'next';
import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

export default async function handler(
  _req: NextApiRequest, 
  res: NextApiResponse
) {
  try {
    const bucketName = 'zkontract';
    const bountiesPrefix = 'metadata/bounties/';

    // Fetch all bounties
    const bountiesList = await s3.listObjectsV2({
      Bucket: bucketName,
      Prefix: bountiesPrefix,
    }).promise();

    const activeBounties = [];

    for (const bountyObj of bountiesList.Contents || []) {
      if (!bountyObj.Key || !bountyObj.Key.endsWith('.json')) continue;

      // 1) Get the object, then check `Body` before using it:
      const bountyDataObj = await s3.getObject({
        Bucket: bucketName,
        Key: bountyObj.Key,
      }).promise();

      if (!bountyDataObj.Body) {
        console.error(`No body found for object ${bountyObj.Key}`);
        continue; // skip this bounty
      }

      // Now it's safe to toString():
      const bountyData = JSON.parse(bountyDataObj.Body.toString());

      // Fetch all proposals for this bounty
      // const proposalsList = await s3.listObjectsV2({
      //   Bucket: bucketName,
      //   Prefix: `${proposalsPrefix}${bountyData.id}/`,
      // }).promise();

      // const proposals = await Promise.all(
      //   (proposalsList.Contents || []).map(async (proposalObj) => {
      //     if (!proposalObj.Key || !proposalObj.Key.endsWith('.json')) return null;

          // 2) Same check for each proposal object
          // const proposalDataObj = await s3.getObject({
          //   Bucket: bucketName,
          //   Key: proposalObj.Key,
          // }).promise();

          // if (!proposalDataObj.Body) {
          //   console.error(`No body found for proposal object ${proposalObj.Key}`);
          //   return null; 
          // }

      //     const proposalData = JSON.parse(proposalDataObj.Body.toString());
      //     return proposalData;
      //   })
      // );



      
        activeBounties.push(bountyData);
      
    }

    res.status(200).json(activeBounties);
  } catch (error) {
    console.error('Error fetching bounties:', error);
    res.status(500).json({ error: 'Failed to fetch bounties' });
  }
}
