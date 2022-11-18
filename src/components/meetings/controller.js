import Services from "./services.js";

const controller = {};

controller.createService = (req, res) => {
  const { body } = req;

  Services.createMeeting(body.id_channel)
    .then((result) => {
      res.send(result);
    })
    .catch((err) => {
      res.status(500).send(err);
    });
};

controller.getMeetings = (req, res) => {
  const {
    query: { status },
  } = req;

  var filter = {};

  if (status) filter = { status };

  Services.getMeetings(filter)
    .then((result) => {
      res.send(result);
    })
    .catch((err) => {
      res.status(500);
      res.send(err);
    });
};

controller.closeMeetingByChannel = (req, res) => {
  const { body } = req;

  Services.closeMeetingByChannel(body.id_channel)
    .then((result) => {
      res.send(result);
    })
    .catch((err) => {
      res.status(500).send(err);
    });
};

controller.getCountMeetings = (req, res) => {
  const {
    query: { status },
  } = req;

  var filter = {};

  if (status) filter = { status };

  Services.getCountMeetings(filter)
    .then((result) => {
      res.send(result);
    })
    .catch((err) => {
      res.status(500);
      res.send(err);
    });
};

export default controller;
