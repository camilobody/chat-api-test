import express from "express";
import http from "http";
import cors from "cors";
import morgan from "morgan";
import bodyParser from "body-parser";
import { Server } from "socket.io";
import "dotenv/config.js";
import sendMessageRabbit from "./src/rabbitmq/send.js";
import { url_taskMap } from "./src/components/messages/services.js";

// services
import meetingService from "./src/components/meetings/services.js";
import messageService from "./src/components/messages/services.js";

//express services
import messages from "./src/components/messages/main.js";
import channel from "./src/components/channels/main.js";
import members from "./src/components/member/main.js";
import users from "./src/components/users/main.js";
import meetings from "./src/components/meetings/main.js";
import notification from "./src/components/notifications/main.js";
// import receiveMsg from "./src/rabbitmq/recieve.js";
import migration from "./src/components/migration/main.js";
import { connetRabbit } from "./src/config/rabbitConnect.js";
import { formatLocalDate } from "./src/utils/fomat_local_date.js";

const app = express(); // initial express
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan("dev"));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// middleware to control any error when join to the server
app.use((err, _req, res, next) => {
  if (err) res.json({ error: err, status: 500 });
  next("router");
});

// principal roiter to know if the server is ok
app.get("/", (_, res) => {
  res.send("The server is ok");
});

// router
app.use("/channels", channel);
app.use("/messages", messages);
app.use("/members", members);
app.use("/users", users);
app.use("/meetings", meetings);
app.use("/migration", migration);
app.use("/notification", notification);

// socket middleware
io.use((socket, next) => {
  if (!socket.request) {
    const err = new Error("error");
    err.data = { content: "Not socket request" };
    next(err);
  } else {
    next();
  }
});

// socket config
io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // start test ----------------------------
  let nickNames = [];
  
  socket.on("nuevo usuario", (datos, callback) => {
    if (nickNames.indexOf(datos) != -1){
      callback(false);
    }else{
      callback(true);
      socket.nickNames = datos;
      nickNames.push(socket.nickNames);

      io.sockets.emit('usernames', nickNames);
    }
  });
  
  //Al recibir un mensaje recojemos los datos
  socket.on('enviar mensaje', (datos) =>{
    //Lo enviamos a todos los usuarios (clientes)
    io.sockets.emit('nuevo mensaje', {
        msg: datos,
        nick: socket.nickNames
    });
  });

  // end test -------------------------------

  socket.on("service_ping", (data) => {
    socket.emit("pong", 1);
  });

  // change feed messages
  socket.on("join_room", async (room) => {
    console.log(`User ${socket.id} joined room ${room}`);
    socket.join(room);
    try {
      meetingService
        .getMeetingActiveByChannel(room)
        .then((result) => {
          if (result.length === 0) {
            meetingService
              .createMeeting(room)
              .then((result) => {
                console.log("create meeting " + result.id);
                messageService.createChanges(room);
              })
              .catch((err) => {
                console.log(err);
              });
          } else {
            meetingService
              .status(result[0].id, "active")
              .then((res) => {
                const timeout = setTimeout(() => {
                  // io.to(room).emit("close_meeting");
                  meetingService.closeMeeting(result[0].id, room);
                }, 3600000);
                if (url_taskMap[result[0].id]) {
                  clearTimeout(url_taskMap[result[0].id]);
                }
                url_taskMap[result[0].id] = timeout;
                console.log("change meeting status " + result[0].id);
              })
              .catch((err) => {
                console.log(err);
              });
          }
        })
        .catch((err) => {
          console.log(err);
        });
    } catch (e) {
      console.error(e);
    }
  });

  socket.on("receive_message", async (data) => {
    let messageStatus = {
      id_message: data.id_message,
      status: "received",
    };

    messageService
      .messageStatus(messageStatus)
      .then((result) => {
        io.to(data.id_channel).emit("change_status", {
          id_message: data.id_message,
          status: "received",
        });
      })
      .catch((err) => {
        console.log(err);
      });
  });

  socket.on("change_waiting", async (channel) => {
    meetingService.changeStatusToWaiting(channel);
  });

  socket.on("reactive_changefeed", async (room) => {
    console.log("reactive change feed");
    io.to(room).emit("recharge_messages");

    messageService.createChanges(room);
  });

  socket.on("disconnect", () => {
    console.log(`User Disconnected ${socket.id}`);
  });

  // socket.on("view_message", (message) => {
  //   const conn = await getRethinkDB();
  //   r.table("messages").filter({id: message.id}).run((conn, err)=>{

  //   })
  // });
});

// receiveMsg();

connetRabbit();

function ioEmmit({ key, data, to }) {
  if (to) {
    io.to(to).emit(key, data);
  } else {
    io.emit(key, data);
  }
}

server.listen(process.env.PORT, () => {
  console.log("server is running on port " + process.env.PORT);
});

export default ioEmmit;
