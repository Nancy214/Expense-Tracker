import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

const AWS_REGION: string = process.env.AWS_REGION || "";
const AWS_ACCESS_KEY: string = process.env.AWS_ACCESS_KEY || "";
const AWS_SECRET_ACCESS_KEY: string = process.env.AWS_SECRET_ACCESS_KEY || "";

// Validate AWS configuration
const isAWSConfigured: boolean = !!(AWS_REGION && AWS_ACCESS_KEY && AWS_SECRET_ACCESS_KEY);

export const s3Client = new S3Client({
    credentials: {
        accessKeyId: AWS_ACCESS_KEY,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
    region: AWS_REGION,
    maxAttempts: 3,
    requestHandler: {
        httpOptions: {
            timeout: 30000,
        },
    },
});

export { isAWSConfigured };
