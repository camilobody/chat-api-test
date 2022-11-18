import getRethinkDB from "../../config/db.js";
import r from "rethinkdb";
import sendMessageRabbit from "../../rabbitmq/send.js";

const service = {};

service.migration = async () => {
  const conn = await getRethinkDB();

  return new Promise((resolve, reject) => {
    r.table("token_notification")
      .slice(0, 20000)
      .run(conn, (err, cursor) => {
        if (err) reject(err);
        else {
          cursor.toArray(async (err, result) => {
            for (var i = 0; i <= result.length; i++) {
              const token = {
                id_rethink: result[i].id,
                ...result[i],
              };

              await service.add({ msg: token, flag: "insert_token" });
              console.log("dta: ", i);
              await sleep(30);
              // if (i % 5000 == 0 && i > 0) {
              //   console.log(i);
              //   console.log("wait");
              //   await sleep(10000);
              //   console.log("start");
              // }
            }
            await sleep(3000);

            r.table("users").run(conn, (err, cursor) => {
              if (err) reject(err);
              else {
                cursor.toArray(async (err, result) => {
                  if (err) reject(err);
                  else {
                    for (const val of result) {
                      const user = {
                        id_rethink: val.id,
                        ...val,
                      };

                      await service.add({ msg: user, flag: "insert_user" });
                    }
                    await sleep(4000);

                    r.table("members").run(conn, (err, cursor) => {
                      if (err) reject(err);
                      else {
                        cursor.toArray(async (err, result) => {
                          if (err) reject(err);
                          else {
                            for (const val of result) {
                              const userData = {
                                id_rethink: val.id,
                                ...val,
                              };

                              await service.add({
                                msg: userData,
                                flag: "insert_member",
                              });
                            }
                            await sleep(5000);

                            r.table("channels").run(conn, (err, cursor) => {
                              if (err) reject(err);
                              else {
                                cursor.toArray(async (err, result) => {
                                  if (err) reject(err);
                                  else {
                                    for (const val of result) {
                                      const channel = {
                                        id_rethink: val.id,
                                        ...val,
                                      };

                                      await service.add({
                                        msg: channel,
                                        flag: "insert_channel",
                                      });
                                    }
                                    await sleep(3000);

                                    r.table("meetings").run(
                                      conn,
                                      (err, cursor) => {
                                        if (err) reject(err);
                                        else {
                                          cursor.toArray(
                                            async (err, result) => {
                                              if (err) reject(err);
                                              else {
                                                for (const val of result) {
                                                  const meet = {
                                                    id_rethink: val.id,
                                                    ...val,
                                                  };

                                                  await service.add({
                                                    msg: meet,
                                                    flag: "insert_meeting",
                                                  });
                                                }

                                                await sleep(3000);

                                                r.table("messages").run(
                                                  conn,
                                                  (err, cursor) => {
                                                    if (err) reject(err);
                                                    else {
                                                      cursor.toArray(
                                                        async (err, result) => {
                                                          if (err) reject(err);
                                                          else {
                                                            for (const val of result) {
                                                              const message = {
                                                                id_rethink:
                                                                  val.id,
                                                                ...val,
                                                              };

                                                              await service.add(
                                                                {
                                                                  msg: message,
                                                                  flag: "insert_messages",
                                                                }
                                                              );
                                                              await sleep(100);
                                                            }
                                                          }
                                                        }
                                                      );
                                                    }
                                                  }
                                                );
                                              }
                                            }
                                          );
                                        }
                                      }
                                    );
                                  }
                                });
                              }
                            });
                          }
                        });
                      }
                    });
                  }
                });
              }
            });

            console.log("migration");

            resolve("migration ok");
          });
        }
      });
  });
};

service.add = ({ msg, flag }) => {
  return new Promise((resolve, reject) => {
    sendMessageRabbit({
      msg: msg,
      flag: flag,
    });
    resolve("ok");
  });
};

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export default service;
