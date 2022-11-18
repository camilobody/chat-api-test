// import rabbitConnect from "../config/rabbitConnect.js";

import { rabbitConn } from "../config/rabbitConnect.js";

const queue = "chat_msm_env";

const sendMessageRabbit = ({ msg, flag }) => {
  // queryMySql(msg);
  msg.flag = flag;

  console.log(msg);

  rabbitConn.createChannel((err, channel) => {
    if (err) console.log(err);
    else {
      const message = Buffer.from(JSON.stringify(msg));
      channel.assertQueue(queue, { durable: false });
      channel.sendToQueue(queue, message, { persistent: false });
    }
  });

  // rabbitConnect((conn) => {
  //   conn.
  //   // setTimeout(() => {
  //   //   conn.close();
  //   //   // process.exit(0);
  //   // }, 500);
  // });
  // rabbitConnect((conn) => {
  //   conn.createChannel((err, channel) => {
  //     if (err) {
  //       console.log("error");
  //     }
  //     const queue = id_channel;
  //     channel.assertQueue(queue, { durable: true });
  //     channel.prefetch(1);
  //     channel.consume(queue, async (msg) => {
  //       console.log("entrooooo");
  //       var buf = JSON.parse(msg.content);
  //       //insert to database
  //       const connMySql = await getConnectionMySql();
  //       const queryToExecute = () => {
  //         return new Promise((res, rej) => {
  //           connMySql.query(queryMySql, (err, result) => {
  //             if (err) rej(err);
  //             res(console.log("execute query successfully"));
  //           });
  //         });
  //       };
  //       await queryToExecute();
  //       // queryMySql(buf);
  //       setTimeout(() => {
  //         channel.ack(msg);
  //         conn.close();
  //         // process.exit(0);
  //       }, 500);
  //     });
  //   });
  // });
};

export default sendMessageRabbit;
