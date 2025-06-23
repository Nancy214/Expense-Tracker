import multer from "multer";

export const upload = multer({
  storage: multer.memoryStorage(), // keeps file in memory
  //limits: { fileSize: 5 * 1024 * 1024 }, // max 5MB
});
