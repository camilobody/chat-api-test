// import rabbitConnect from "../config/rabbitConnect.js";
// import getConnectionMySql from "../config/mysql.js";

// const receiveMsg = () => {
//   rabbitConnect((conn) => {
//     conn.createChannel((err, channel) => {
//       if (err) console.error(err);
//       const queue = "chat_msm_test2";

//       channel.assertQueue(queue, {
//         durable: false,
//       });
//       channel.prefetch(1);
//       console.log(
//         " [*] Waiting for messages in %s. To exit press CTRL+C ",
//         queue
//       );
//       channel.consume(
//         queue,
//         async (msg) => {
//           console.log("[x] message recieved ", msg.content.toString());
//           // const connMySql = getConnectionMySql();
//           // const query = () => {
//           //   return new Promise((res, rej) => {
//           //     connMySql.query(
//           //       "INSERT INTO members (id_rethink,id_member, document_number, email, first_name, last_name, mobile_phone,photo ) VALUES ('1','1','1','1','1','1','1','1')",
//           //       (err, result) => {
//           //         if (err) rej(err);
//           //         console.log(result);
//           //         res(console.log("execute query successfully"));
//           //       }
//           //     );
//           //   });
//           // };

//           // query()
//           //   .then((result) => {
//           //     console.log(result);
//           //   })
//           //   .catch((err) => {
//           //     console.log(err);
//           //   });
//         },
//         { noAck: true }
//       );
//     });
//   });
// };

// export default receiveMsg;
