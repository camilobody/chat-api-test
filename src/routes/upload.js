const express = require("express");
const upload = express.Router();
const uploadAWS = require("../aws/aws");
const r = require("rethinkdb");
const getRethinkDB = require("../config/db");

upload.post("/", uploadAWS.array("file", 3), async (req, response) => {
  const conn = await getRethinkDB();
  const message = req.body;

  message.url_file = req.files[0].location;
  r.table("messages")
    .insert(message)
    .run(conn, (err, res) => {
      if (err) console.log(err);
      let messageStatus = {
        id_message: res.generated_keys[0],
        status: "sent",
      };
      r.table("message_status")
        .insert(messageStatus)
        .run(conn, (err, res) => {
          if (err) console.log(err);
        });
    });
  response.send({
    message: "Uploaded!",
    urls: req.files.map(function (file) {
      return {
        url: file.location,
        name: file.key,
        type: file.mimetype,
        size: file.size,
      };
    }),
  });
});

module.exports = upload;
