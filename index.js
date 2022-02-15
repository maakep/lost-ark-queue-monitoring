const screenshot = require("screenshot-desktop");
const Tesseract = require("tesseract.js");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
var axios = require("axios").default;

const WIDTH = 1920;
const HEIGHT = 1080;
const MONITOR = 0;
const CHAT_URL = `ENTER YOUR WEBHOOK URL HERE`;

const recordedQueues = [];

async function printScreenAndReadQueueNumber() {
  const picPath = path.resolve(`./pic${Math.floor(Math.random() * 1000)}.jpg`);

  const displays = await screenshot.listDisplays();
  await screenshot({
    filename: picPath,
    format: "jpg",
    screen: displays[MONITOR].id,
  });

  const cutPicPath = path.resolve(
    `cutPic${Math.floor(Math.random() * 1000)}.jpg`
  );

  sharp(picPath)
    .extract({
      width: 200,
      height: 60,
      left: WIDTH / 2 - 100,
      top: HEIGHT / 2 - 25,
    })
    .toFile(cutPicPath);

  const data = await Tesseract.recognize(cutPicPath, "eng");
  const text = data.data.text;

  const startPos = text.indexOf("Your queue number: ");
  const endPos = text.indexOf("\n", startPos);

  const numberString = text.substring(startPos, endPos);
  const number = numberString.split(": ")[1];

  if (number == undefined) {
    console.log(text);
    cleanup(picPath, cutPicPath);
    return;
  }

  recordedQueues.push({ date: new Date(), pos: parseInt(number) });

  var msg = "Queue position: " + number + ". ";

  if (parseInt(number) < 1000) {
    msg += "WE CLOSE NOW!!!!!!!!";
  } else if (parseInt(number) < 3000) {
    msg += "We're getting there... :eyes:";
  } else {
    msg += "Not even close :disappointed:";
  }

  if (recordedQueues.length > 2) {
    msg +=
      "(diff: " +
      (recordedQueues[recordedQueues.length - 1].pos -
        recordedQueues[recordedQueues.length - 2].pos) +
      ")";
    msg += "\r\n";
    msg += "Short term velocity: ";
    msg += forecast();

    if (recordedQueues.length > 5) {
      msg += "\r\n";
      msg += "Long term velocity: ";
      msg += forecast(recordedQueues[0]);
    }
  }

  postInChat(msg);

  cleanup(picPath, cutPicPath);
}

function forecast(first) {
  first = first || recordedQueues[recordedQueues.length - 3];
  const last = recordedQueues[recordedQueues.length - 1];
  const averagePerMinute =
    (first.pos - last.pos) / ((last.date - first.date) / 1000 / 60);

  const minutesLeft = last.pos / averagePerMinute;

  const forecastDate = new Date(last.date);
  forecastDate.setMinutes(last.date.getMinutes() + minutesLeft);

  return "Expected done: " + forecastDate;
}

function cleanup(...pics) {
  for (const pic in pics) {
    fs.rmSync(pics[pic]);
  }
}

function postInChat(message) {
  return axios.post(CHAT_URL, message);
}

printScreenAndReadQueueNumber();

setInterval(() => {
  printScreenAndReadQueueNumber();
}, 60 * 1000);
