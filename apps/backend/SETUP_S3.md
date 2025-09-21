# AWS S3 Setup for Profile Picture Uploads

## Prerequisites

1. AWS Account
2. S3 Bucket created
3. IAM User with S3 permissions

## Step 1: Create S3 Bucket

1. Go to AWS S3 Console
2. Click "Create bucket"
3. Choose a unique bucket name (e.g., `my-expense-tracker-profile-pics`)
4. Select your preferred region
5. Keep default settings for versioning and encryption
6. Create the bucket

## Step 2: Configure Bucket for Public Access

1. Go to your bucket → Permissions tab
2. Edit "Block public access" settings
3. Uncheck "Block all public access" (since we need public read access for profile pictures)
4. Save changes

## Step 3: Create IAM User

1. Go to AWS IAM Console
2. Create a new user with programmatic access
3. Attach the following policy (or create a custom one):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:DeleteObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    }
  ]
}
```

## Step 4: Configure Environment Variables

Create a `.env` file in the backend directory with:

```env
# AWS S3 Configuration
AWS_BUCKET_NAME=your-bucket-name
AWS_REGION=your-region (e.g., us-east-1)
AWS_ACCESS_KEY=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

## Step 5: Test the Setup

1. Start the backend server
2. Go to the Profile page
3. Upload a profile picture
4. Check the console logs for S3 upload confirmation

## Troubleshooting

- If you see "AWS not configured" warnings, check your .env file
- If S3 upload fails, verify your IAM permissions
- If images don't display, check the bucket's public access settings

## Security Notes

- The profile pictures are stored with public read access
- Each file has a unique bcrypt-hashed filename
- Old profile pictures are automatically deleted when new ones are uploaded
