import fetch from "node-fetch";
import serviceMessage from "../messages/services.js"

const services = {};

const token =
  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6Imp3cm9fa2ljZnEyN0BqeXBsby5jb20iLCJzdHJhdGVneSI6ImRlZmF1bHQiLCJ0b2tlblZlcnNpb24iOjIsImlzU3VwZXJBZG1pbiI6dHJ1ZSwiaWF0IjoxNjY4ODAxMzQ2LCJleHAiOjE2Njg4MDQ5NDYsImF1ZCI6ImNvbGxhYm9yYXRvcnMifQ.QYCIeWCOGvyPT_uluzTjOjbZ-uUYB2Wvk1XFmdH_5-Y";

services.getToken = () => {
    console.log('1');
    fetch(
        `http://localhost:3000/api/v1/admin/ping`,
        {
            method: "GET",
            headers: {
                Authorization: token,
                "Content-Type": "application/json",
            },
        }
    )
    .then((response) => response.json())
    .then(async (res) => {
        console.log(res);
    })
    .catch((err) => {
      console.log("Something went wrong!", err);
    });
    console.log('2');
};

services.postMessage = (message, id_member) => {
    console.log('1----------------------------------------1');
    services.getToken();
    console.log('2----------------------------------------2');
    fetch(
        `http://localhost:3000/api/v1/bots/new_bot/converse/${id_member}/secured?include=nlu`,
        {
        method: "POST",
        headers: {
            Authorization: token,
            "Content-Type": "application/json",
        },

        body: JSON.stringify({
            "type": "text",
            "text": message.content,
        }),
        }
    )
    .then((response) => response.json())
    .then(async (res) => {
        console.log(res);
        if (res.responses){
            const response = res.responses;
            for (let index = 0; index < response.length; index++) {
                const datecol = new Date().toDateString('es-co');
                const hourcol = new Date().toLocaleTimeString('es-co', { hour12: false });
                const dateUTC = new Date(`${datecol} ${hourcol} UTC`);
                const datenow = dateUTC.toISOString();
                const milliseconds = new Date().getTime();
                const datenowWithMilliseconds = datenow.replace('000Z', milliseconds);
                const messageBot =
                {
                    "author": "bot",
                    "author_name": "bot",
                    "author_type": "bot",
                    "content": response[index].text,
                    "create_at": datenowWithMilliseconds,
                    "id_channel": message.id_channel,
                    "id_meet": null,
                    "type": "text"
                }
                await serviceMessage.insertMessage(messageBot)
                
            }
        }else{
            console.log(res);
        }
    })
    .catch((err) => {
      console.log("Something went wrong!", err);
    });
};

export default services;
