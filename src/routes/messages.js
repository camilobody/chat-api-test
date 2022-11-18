import express from "express";
import r from "rethinkdb";
import getRethinkDB from "../config/db.js";
import ioEmmit from "../../app.js";
import uploadAWS from "../aws/aws.js";
import fetch from "node-fetch";
import sendMessageRabbit from "../rabbitmq/send.js";
import connectMysql from "../config/mysql.js";

const messages = express.Router();

export const url_taskMap = {};

// middleware
messages.use((err, req, res, next) => {
  if (err) res.json({ error: err, status: 500 });
  if (req.body) next("router");
  res.sendStatus(204);
});

// get messages by channel
messages.get("/by-channel", async (req, response) => {
  const idChannel = req.query.id_channel;

  const conn = await getRethinkDB();
  r.table("messages")
    .filter({ id_channel: idChannel })
    .orderBy(r.asc("create_at"))
    .run(conn, (err, cursor) => {
      if (err) console.log(err);
      cursor.toArray((err, result) => {
        if (err) console.log(err);
        response.json({ data: result });
      });
    });
});

// create messages
messages.post("/", uploadAWS.array("file", 3), async (req, response) => {
  const conn = await getRethinkDB();
  const message = req.body;

  let file = null;
  if (req.files && req.files.length > 0) {
    file = req.files[0];
  }

  let meet_id = "";
  r.table("meetings")
    .filter(
      r
        .row("id_channel")
        .eq(message.id_channel)
        .and(r.row("status").eq("active").or(r.row("status").eq("waiting")))
    )
    .limit(1)
    .run(conn, (err, cursor) => {
      if (err) console.log(err);
      cursor.toArray((err, result) => {
        if (result.length === 0) {
          createMeeting({
            con: conn,
            data: message,
            response: response,
            idChannel: message.id_channel,
            file: file,
          });
        } else {
          if (result[0].status === "waiting") {
            r.table("meetings")
              .filter({ id: result[0].id })
              .update({ status: "active" })
              .run(conn, (err, res) => {
                if (err) console.log(err);
              });
          }
          const timeout = setTimeout(() => {
            r.table("meetings")
              .filter({ id: result[0].id })
              .update({ status: "inactive" })
              .run(conn, (err, res) => {
                if (err) console.log(err);
                console.log("inactive meeting" + result[0].id);
                // ioEmmit({ key: "close_meeting", data: result[0].id });
              });
          }, 3600000);
          if (url_taskMap[result[0].id]) {
            clearTimeout(url_taskMap[result[0].id]);
          }
          url_taskMap[result[0].id] = timeout;
          meet_id = result[0].id;
          message.id_meet = meet_id;
          insertMessage(conn, message, response, file);
        }
      });
    });
});

messages.post("/close-meeting", async (req, res) => {
  const conn = await getRethinkDB();
  const { id_channel } = req.body;
  if (!id_channel) res.sendStatus(204);
  r.table("meetings")
    .filter({ id_channel: id_channel })
    .update({ status: "inactive" })
    .run(conn, (err, response) => {
      if (err) {
        console.log(err);
        res.json({ menssage: "error", status: 500 });
      }
      res.json({ menssage: "meeting closed", status: 200 });
    });
});

function insertMessage(con, data, response, file) {
  try {
    if (data.type === "text") {
      r.table("messages")
        .insert(data)
        .run(con, (err, res) => {
          if (err) console.log(err);
          data.id_rethink = res.generated_keys[0];
          data.flag = "insert_messages";
          // sendMessageRabbit({
          //   msg: data,
          // });
          let messageStatus = {
            id_message: res.generated_keys[0],
            status: "sent",
          };
          r.table("message_status")
            .insert(messageStatus)
            .run(con, (err, res) => {
              if (err) console.log(err);
              response.sendStatus(200);
            });
          r.table("channels")
            .filter({ id_channel: data.id_channel })
            .run(con, (err, cursor) => {
              if (err) console.log(err);
              cursor.toArray((err, result) => {
                if (err) console.log(err);
                if (result.length > 0) {
                  console.log(result);
                  if (data.author_type === "member") {
                    r.table("token_notification")
                      .filter({
                        id_user: result[0].id_user,
                      })
                      .run(con, (err, cursor) => {
                        if (err) console.log(err);
                        cursor.toArray((err, res) => {
                          if (err) console.log(err);
                          if (res.length > 0) {
                            let tokens = res.map((token) => token.token);
                            console.log(tokens);
                            sendPush({ message: data, tokens: tokens });
                          }
                        });
                      });
                  } else {
                    r.table("members")
                      .filter({
                        id: result[0].id_member,
                      })
                      .run(con, (err, cursor) => {
                        if (err) console.log(err);
                        cursor.toArray((err, res) => {
                          if (err) console.log(err);
                          r.table("token_notification")
                            .filter({
                              id_member: res[0].id_member,
                            })
                            .run(con, (err, cursor) => {
                              if (err) console.log(err);
                              cursor.toArray((err, res) => {
                                if (err) console.log(err);
                                if (res.length > 0) {
                                  let tokens = res.map((token) => token.token);
                                  console.log(tokens);
                                  sendPush({ message: data, tokens: tokens });
                                }
                              });
                            });
                        });
                      });
                  }
                }
              });
            });
        });
    } else {
      data.url_file = file.location;
      data.name_file = file.originalname;
      data.size_file = file.size;
      r.table("messages")
        .insert(data)
        .run(con, (err, res) => {
          if (err) console.log(err);
          data.id_rethink = res.generated_keys[0];
          data.flag = "insert_messages";
          // sendMessageRabbit({
          //   msg: data,
          // });
          let messageStatus = {
            id_message: res.generated_keys[0],
            status: "sent",
          };
          r.table("message_status")
            .insert(messageStatus)
            .run(con, (err, res) => {
              if (err) console.log(err);
              response.send({
                message: "Uploaded!",
                status: "success",
              });
            });
          r.table("channels")
            .filter({ id_channel: data.id_channel })
            .run(con, (err, cursor) => {
              if (err) console.log(err);
              cursor.toArray((err, result) => {
                if (err) console.log(err);
                if (result.length > 0) {
                  if (data.author_type === "member") {
                    r.table("token_notification")
                      .filter({
                        id_user: result[0].id_user,
                      })
                      .run(con, (err, cursor) => {
                        if (err) console.log(err);
                        cursor.toArray((err, res) => {
                          if (err) console.log(err);
                          if (res.length > 0) {
                            let tokens = res.map((token) => token.token);
                            console.log(tokens);
                            sendPush({ message: data, tokens: tokens });
                          }
                        });
                      });
                  } else {
                    r.table("members")
                      .filter({
                        id: result[0].id_member,
                      })
                      .run(con, (err, cursor) => {
                        if (err) console.log(err);
                        cursor.toArray((err, res) => {
                          if (err) console.log(err);
                          r.table("token_notification")
                            .filter({
                              id_member: res[0].id_member,
                            })
                            .run(con, (err, cursor) => {
                              if (err) console.log(err);
                              cursor.toArray((err, res) => {
                                if (err) console.log(err);
                                if (res.length > 0) {
                                  let tokens = res.map((token) => token.token);
                                  console.log(tokens);
                                  sendPush({ message: data, tokens: tokens });
                                }
                              });
                            });
                        });
                      });
                  }
                }
              });
            });
        });
    }
  } catch (e) {
    response.json({ error: e, status: 500 });
  }
}

function createMeeting({ con, idChannel, data, response, file }) {
  try {
    let dataMeeting = {
      id_channel: idChannel,
      status: "active",
    };
    r.table("meetings")
      .insert(dataMeeting)
      .run(con, (err, res) => {
        if (err) console.log(err);
        dataMeeting.id_rethink = res.generated_keys[0];
        dataMeeting.create_at = new Date().toISOString();
        dataMeeting.flag = "insert_meeting";
        // sendMessageRabbit({
        //   msg: dataMeeting,
        // });
        const meet_id = res.generated_keys[0];
        data.id_meet = meet_id;
        insertMessage(con, data, response, file);
        const timeout = setTimeout(() => {
          r.table("meetings")
            .filter({ id: res.generated_keys[0] })
            .update({ status: "inactive" })
            .run(con, (err, result) => {
              if (err) console.log(err);
              console.log("inactive meeting" + res.generated_keys[0]);
              ioEmmit({ key: "close_meeting", data: res.generated_keys[0] });
            });
        }, 3600000);
        url_taskMap[res.generated_keys[0]] = timeout;
      });
  } catch (e) {
    console.log(e);
  }
}

function sendPush({ message, tokens }) {
  let notification = {
    title: message.author_name,
    body: message.content,
  };

  let data = {
    body: {
      id_channel: message.id_channel,
      coach: "Soporte",
    },
  };

  let notification_body = {
    notification: notification,
    data: data,
    registration_ids: tokens,
    // to: tokens[0],
  };

  fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      Authorization: "key=" + process.env.FCM_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(notification_body),
  })
    .then((res) => {
      console.log(res);
      console.log("Notification send successfully");
    })
    .catch((err) => {
      console.log("Something went wrong!", err);
    });
}

// MySql queries
export const addMessageInMySql = (data) => {
  console.log("add message fuction");
  connectMysql((conn) => {
    conn.connect((err) => {
      console.log("add message x2");
      if (err) console.log(err);
      console.log("connected");
    });
    const query = `INSERT INTO messages (author, author_name, author_type, content, create_at, id_channel,  id_meet, type,  url_file, name_file, size_file, id_rethink ) VALUES ("${
      data.author
    }", "${data.author_name}", "${data.author_type}", "${data.content}", "${
      data.create_at
    }",  "${data.id_channel}", "${data.id_meet}", "${data.type}", "${
      data.url_file ?? null
    }",  "${data.name_file ?? null}", "${data.size_file ?? null}",  "${
      data.id
    }");`;
    conn.query(query, (err, result) => {
      if (err) console.log(err);
      console.log("Insert Message in mysql: ", data.id);
    });
    conn.end();
  });
};

export const addMeetInMySql = (data) => {
  connectMysql((conn) => {
    conn.connect((err) => {
      if (err) console.log(err);
      console.log("connected");
    });
    const query = `INSERT INTO meetings (id_rethink, create_at, id_channel, status) VALUES ("${data.id}", "${data.create_at}",  "${data.id_channel}", "${data.status}");`;
    conn.query(query, (err, result) => {
      if (err) console.log(err);
      console.log("Insert Meet in mysql: ", data.id);
    });
    conn.end();
  });
};

export const updateStatusMeetInMySql = (data) => {
  connectMysql((conn) => {
    conn.connect((err) => {
      if (err) console.log(err);
      console.log("connected");
    });
    const query = `UPDATE meetings SET status = "${data.status}" WHERE id_channel = "${data.id_channel}"`;
    conn.query(query, (err, result) => {
      if (err) console.log(err);
      console.log("Update Meet in mysql: ", data.id_meet);
    });
    conn.end();
  });
};

export default messages;
