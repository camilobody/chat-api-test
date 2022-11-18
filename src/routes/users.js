import express, { response } from "express";
import r from "rethinkdb";
import getRethinkDB from "../config/db.js";
import sendMessageRabbit from "../rabbitmq/send.js";
import connectMysql from "../config/mysql.js";

const users = express.Router();

users.post("/", async (req, response) => {
  console.log("post users");
  const conn = await getRethinkDB();
  const user = req.body;
  const { id, token, first_name, last_name, role_id } = req.body; // valited for no broken the server
  if (!id || !token || !first_name || !last_name || !role_id)
    response.sendStatus(204);
  r.table("users")
    .filter({ id_user: user.id })
    .run(conn, (err, cursor) => {
      if (err) {
        console.log(err);
      } else {
        cursor.toArray((err, result) => {
          if (err) {
            console.log(err);
          } else {
            if (result.length === 0) {
              let dataUser = {
                id_user: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                role_id: user.role_id,
                status: "active",
              };

              r.table("users")
                .insert(dataUser)
                .run(conn, (err, res) => {
                  if (err) {
                    console.log(err);
                  } else {
                    dataUser.id_rethink = res.generated_keys[0];
                    dataUser.flag = "insert_user";
                    // sendMessageRabbit({
                    //   msg: dataUser,
                    // });
                    const dataToken = {
                      device: user.device,
                      type: user.type,
                      id_user: user.id ?? null,
                      id_member: null,
                      token: user.token,
                    };
                    r.table("token_notification")
                      .insert(dataToken)
                      .run(conn, (err, res) => {
                        if (err) console.log(err);
                      });
                  }
                });
            } else {
              r.table("token_notification")
                .filter(
                  r
                    .row("id_user")
                    .eq(user.id)
                    .and(r.row("token").eq(user.token))
                )
                .run(conn, (err, cursor) => {
                  if (err) {
                    console.log(err);
                  } else {
                    cursor.toArray((err, result) => {
                      if (err) {
                        console.log(err);
                      } else {
                        if (result.length === 0) {
                          const dataToken = {
                            device: user.device,
                            type: user.type,
                            id_user: user.id ?? null,
                            id_member: null,
                            token: user.token,
                          };
                          r.table("token_notification")
                            .insert(dataToken)
                            .run(conn, (err, res) => {
                              if (err) console.log(err);
                            });
                        }
                      }
                    });
                  }
                });
            }
          }
        });
      }
    });
});

users.post("/change-status", async (req, response) => {
  const conn = await getRethinkDB();
  const data = req.body;
  r.table("users")
    .filter({ id_user: data.id_user })
    .update({ status: data.status })
    .run(conn, (err, res) => {
      if (err) console.log(err);
      response.json({
        message: "Change status successfully",
        status: "success",
      });
    });
});

users.get("/active", async (req, response) => {
  const conn = await getRethinkDB();

  r.table("users")
    .filter({ status: "active" })
    .run(conn, (err, cursor) => {
      if (err) console.log(err);
      cursor.toArray((err, result) => {
        if (err) console.log(err);
        response.json({
          data: result,
        });
      });
    });

  // connectMysql((conn) => {
  //   conn.connect((err) => {
  //     if (err) console.log(err);
  //     console.log("connected");
  //   });
  //   const query = 'SELECT * FROM users WHERE status = "active"';
  //   conn.query(query, (err, result) => {
  //     if (err) console.log(err);
  //     response.json({
  //       status: "success",
  //       data: result,
  //     });
  //   });
  //   conn.end();
  // });
});

// mysql queries
const addUsersInMySql = (data) => {
  connectMysql((conn) => {
    conn.connect((err) => {
      if (err) console.log(err);
      console.log("connected");
    });
    const query = `INSERT INTO users (id_rethink, id_user,  first_name, last_name, role_id, status) VALUES ("${data.id}",  "${data.id_user}", "${data.first_name}", "${data.last_name}", "${data.role_id}",  "${data.status}")`;
    conn.query(query, (err, result) => {
      if (err) console.log(err);
      console.log("Insert users in mysql: ", data.id);
    });
    conn.end();
  });
};

const updateStatusUserMySql = (data) => {
  connectMysql((conn) => {
    conn.connect((err) => {
      if (err) console.log(err);
      console.log("connect");
    });
    const query = `UPDATE users SET status = "${data.status}" WHERE id_user = "${data.id_user}"`;
    conn.query(query, (err, result) => {
      if (err) console.log(err);
      console.log("Update user in mysql: ", data.id_user);
    });
    conn.end();
  });
};

export default users;
