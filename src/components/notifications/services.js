import getRethinkDB from "../../config/db.js";
import r from "rethinkdb";
import fetch from "node-fetch";

const service = {};

service.getTokens = async (filter) => {
  const conn = await getRethinkDB();

  return new Promise((resolve, reject) => {
    r.table("token_notification")
      .filter(filter)
      .run(conn, (err, cursor) => {
        if (err) console.log(err);
        cursor.toArray((err, res) => {
          if (err) console.log(err);
          if (res.length > 0) {
            resolve(res);
          } else {
            resolve([]);
          }
        });
      });
  });
};

service.updateTokensByMembers = async ({ id_member, token }) => {
  const conn = await getRethinkDB();
  return new Promise((resolve, reject) => {
    service
      .getTokens({ id_member: id_member })
      .then((result) => {
        if (result.length > 0) {
          if (result[0] !== token.token && token.token != null) {
            r.table("token_notification")
              .filter({
                token: result[0].token,
                id_member: result[0].id_member,
                id_user: result[0].id_user,
              })
              .update({ token: token.token, device: token.device })
              .run(conn, (err, cursor) => {
                if (err) {
                  reject(err);
                } else {
                  resolve("data update");
                }
                // cursor.toArray((err, resu) => {
                //   print(resu);
                //   resolve("data update");
                // });
              });
          }
        } else if (token.token != null) {
          service.addTokens(token);
        }
      })
      .catch((err) => {});
  });
};

service.sendNotification = (filter, message) => {
  return new Promise((resolve, reject) => {
    service
      .getTokens(filter)
      .then((result) => {
        sendPush({ message, tokens: result });
        resolve("notifications");
      })
      .catch((err) => {
        reject(err);
      });
  });
};

service.addTokens = async (token, id_member) => {
  const conn = await getRethinkDB();

  return new Promise((resolve, reject) => {
    if (token) {
      r.table("token_notification")
        .insert(token)
        .run(conn, (err, res) => {
          if (err) console.log(err);
          resolve("token aggregated");
        });
    } else {
      fetch(`${process.env.API_FETCH}${id_member}`, {
        method: "GET",
        headers: {
          Authorization: process.env.API_AUTHORIZATION,
          "Content-Type": "application/json",
          "x-bodytech-organization": process.env.API_ORGANIZATION,
          "x-bodytech-brand": process.env.API_BRAND,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.data && data.data.length > 0) {
            data.data.forEach((token) => {
              let dataToken = {
                device: token.os,
                type: "mobile",
                id_user: id_member_user ?? null,
                id_member: id_member.toString(),
                token: token.token,
              };
              r.table("token_notification")
                .insert(dataToken)
                .run(conn, (err, res) => {
                  if (err) console.log(err);
                  resolve("token aggregated");
                });
            });
          }
        });
    }
  });
};

service.testNotificationsByUser = async ({ id_member }) => {
  return new Promise((resolve, reject) => {
    service
      .getTokens({ id_member: id_member })
      .then((result) => {
        const message = {
          author_name: "test",
          content: "test push",
          id_channel: "123",
        };
        sendPush({ message, tokens: result });
        resolve("notifications");
      })
      .catch((err) => {
        reject(err);
      });
  });
};

function sendPush({ message, tokens }) {
  let tokensIDs = tokens.map((token) => token.token);

  if (tokens[0].device == "Huawei") {
    huaweiNotification({
      message: message,
      tokensIDs: tokensIDs,
    });
  } else {
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
      registration_ids: tokensIDs,
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
        // console.log(res);
        console.log("Notification send successfully");
      })
      .catch((err) => {
        console.log("Something went wrong!", err);
      });
  }
}

function huaweiNotification({ message, tokensIDs }) {
  let notification_body = {
    validate_only: false,
    message: {
      data: `{"title":"${message.author_name}","body":"${message.content}", "id_channel": "${message.id_channel}", "coach": "Soporte"}`,
      android: {
        fast_app_target: 1,
      },
      token: tokensIDs,
    },
  };

  let details = {
    client_secret: process.env.HUAWEI_CLIENT_SECRET,
    client_id: process.env.HUAWEI_CLIENT_ID,
    grant_type: process.env.HUAWEI_GRANT_TYPE,
  };

  var formBody = [];
  for (var property in details) {
    var encodedKey = encodeURIComponent(property);
    var encodedValue = encodeURIComponent(details[property]);
    formBody.push(encodedKey + "=" + encodedValue);
  }
  formBody = formBody.join("&");

  fetch("https://oauth-login.cloud.huawei.com/oauth2/v3/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formBody,
  })
    .then((respo) => respo.json())

    .then((res) => {
      if (res["access_token"]) {
        fetch(
          `https://push-api.cloud.huawei.com/v1/${process.env.HUAWEI_CLIENT_ID}/messages:send`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${res["access_token"]}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(notification_body),
          }
        )
          .then((respo) => respo.json())
          .then((res) => {
            // console.log(res);
          })
          .catch((err) => {
            console.log("Something went wrong!", err);
          });
      }
    })
    .catch((err) => {
      console.log("Something went wrong!", err);
    });
}

export default service;
