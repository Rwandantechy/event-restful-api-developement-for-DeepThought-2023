const moment = require("moment-timezone");
const multer = require("multer");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "uploads/";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const originalName = file.originalname;
    const timezone = "Asia/Kolkata";
    const currentDateTime = moment().tz(timezone).format("YYYYMMDD_HHmmss.SSS");
    const fileName = currentDateTime + "_" + originalName;
    cb(null, fileName);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    const allowedFileTypes = ["image/jpeg", "image/png"]; // Add any other allowed file types

    if (allowedFileTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type."));
    }
  },
});

module.exports = upload;

