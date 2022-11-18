import express from "express";
import fetch from "node-fetch";
import r from "rethinkdb";
import getRethinkDB from "../config/db.js";

const notification = express.Router();

notification.post("/", (req, res) => {
  let notification = {
    title: "Esto es una notificación",
    body: {
      content: "No puede ser, envié una notificación :3",
      id_channel: 876567899012345,
    },
  };

  let fcm_tokens = [
    "cvreZbEMlZGGgU_79GXme-:APA91bHN7pw_MgOZIZ7gIlXJeIETLy_uPiG0eOy8ja9k_YHAQsbbK2YON1gV7g_Hy9YFR6xte3eha3_N_ZmUp-edLTiFc1yHieBvd51zgdmkMwV74UsMYN8HNT1htuURVBG54lBAUEn3"
  ];
  let notification_body = {
    notification: notification,
    registration_ids: fcm_tokens,
  };

  fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      Authorization: "key=" + process.env.FCM_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(notification_body),
  })
    .then(() => {
      res.status(200).send("Notification send successfully");
    })
    .catch((err) => {
      res.status(400).send("Something went wrong!");
      console.log(err);
    });
});

notification.post("/add-token", async (req, response) => {
  const token = req.body;
  const conn = await getRethinkDB();
  if (token.token) {
    r.table("token_notification")
      .filter({ id_user: token.id_user })
      .run(conn, (err, cursor) => {
        if (err) {
          console.log(err);
        } else {
          cursor.toArray((err, result) => {
            if (resutl && result.length > 0) {
              r.table("token_notification")
                .filter({ id_user: token.id_user })
                .update({ token: token.token })
                .run(conn, (err, res) => {
                  if (err) {
                    console.log(err);
                    response.status(400);
                    response.json({
                      message: "Something went wrong!",
                      status: "error",
                    });
                  } else {
                    response.status(200);
                    response.json({
                      message: "Token added successfully",
                      status: "success",
                    });
                  }
                });
            } else {
              r.table("token_notification")
                .insert(token)
                .run(conn, (err, res) => {
                  if (err) {
                    console.log(err);
                    response.status(400);
                    response.json({
                      message: "Something went wrong!",
                      status: "error",
                    });
                  } else {
                    response.status(200);
                    response.json({
                      message: "Token added successfully",
                      status: "success",
                    });
                  }
                });
            }
          });
        }
      });
  } else {
    response.json({ message: "You did not send any token", status: "error" });
  }
});

export default notification;
