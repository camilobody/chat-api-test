import AWS from "aws-sdk";
import multer from "multer";
import multerS3 from "multer-s3-v2";

import "dotenv/config.js";

// config aws s3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: "us-east-1",
});

const uploadAWS = multer({
  storage: multerS3({
    s3: s3,
		bucket: process.env.AWS_BUCKET_NAME,
		contentType: multerS3.AUTO_CONTENT_TYPE,
		acl: "public-read",
    metadata: function (req, file, cb) {
      cb(null, { fileName: file.fieldname });
		},
    key: function (rq, file, cb) {
      cb(null, Date.now().toString());
		},
  }),
});

// function to upload a file
export default uploadAWS;
