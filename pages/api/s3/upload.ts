import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import multer from "multer";
const nextConnect = require("next-connect"); // ✅ Use CommonJS require
import { NextApiRequest, NextApiResponse } from "next";
import dotenv from "dotenv";

dotenv.config();

// Extend NextApiRequest to include file property
interface NextApiRequestWithFile extends NextApiRequest {
  file?: Express.Multer.File;
}

// 🔹 AWS S3 Configuration
const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

// 🔹 Multer Middleware for File Upload Handling
const upload = multer({ storage: multer.memoryStorage() });

const apiRoute = nextConnect({
  onError: (error: any, req: NextApiRequest, res: NextApiResponse) => {
    console.error("API Error:", error?.message || error);
    res.status(500).json({ error: error?.message || "Internal Server Error" });
  },  
  onNoMatch: (req: NextApiRequest, res: NextApiResponse) => {
    res.status(404).json({ error: "Not Found" });
  },
});

// Apply Multer Middleware
apiRoute.use(upload.single("file"));

apiRoute.post(async (req: NextApiRequestWithFile, res: NextApiResponse) => {
  try {
    if (!req.file) {
      console.error("❌ No file received in request.");
      return res.status(400).json({ error: "No file provided" });
    }

    console.log("✅ File received:", req.file.originalname);

    const { originalname, buffer, mimetype } = req.file;
    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME as string,
      Key: `uploads/${Date.now()}-${originalname}`,
      Body: buffer,
      ContentType: mimetype,
    };

    console.log("🚀 Uploading to S3...");
    await s3.send(new PutObjectCommand(uploadParams));
    console.log("✅ Upload successful!");

    res.status(200).json({ message: "File uploaded successfully!" });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("❌ S3 Upload Error:", error.message);
      res.status(500).json({ error: error.message });
    } else {
      console.error("❌ Unknown error:", error);
      res.status(500).json({ error: "An unknown error occurred" });
    }
  }
});


export default apiRoute;

export const config = {
  api: {
    bodyParser: false, // Needed for file uploads
  },
};
