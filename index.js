const fs = require("fs");
const path = require("path");
const express = require("express");
const cheerio = require("cheerio");
const axios = require("axios");

const app = express();
const http = require("http").Server(app);

const PORT = process.env.PORT || 4200;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", async (req, res) => {
  res.send("crawl congthucmau.com");
});

app.get("/crawl-cong-thuc-mau", async (req, res) => {
  const fileName = await crawl();
  res.send(
    `crawl congthucmau.com successful. View more data: http://127.0.0.1:4200/${fileName}`
  );
});

async function crawl() {
  const uri = "https://congthucmau.com/lightroom";
  const uriPage = "https://congthucmau.com/lightroom/page/";

  const html = await axios.get(uri);
  const $ = cheerio.load(html.data);
  const totalPage = $(".page-nav .last").attr("title");

  const presetPosts = [];
  let timer = 0;

  const interval = setInterval(() => {
    ++timer;
    console.log(`spending time: ${timer}`);
  }, 1000);

  presetPosts.push({
    pageIndex: 1,
    posts: []
  });

  // Get posts on page 1
  $(".td_module_3 .td-module-title a").each((index, item) => {
    presetPosts[0].posts.push($(item).attr("href"));
  });

  // Get posts from page 2 to total page
  for (let i = 2; i <= parseInt(totalPage, 10); i++) {
    const _uri = uriPage + i;
    const _html = await axios.get(_uri);
    const _$ = cheerio.load(_html.data);

    const _posts = [];

    _$(".td_module_3 .td-module-title a").each((index, item) => {
      _posts.push(_$(item).attr("href"));
    });

    presetPosts.push({
      pageIndex: i,
      posts: _posts
    });
  }

  const currentDate = new Date();

  const date =
    currentDate.getFullYear().toString() +
    (currentDate.getMonth() + 1).toString() +
    currentDate.getDate().toString();

  const time =
    currentDate.getHours().toString() +
    currentDate.getMinutes().toString() +
    currentDate.getSeconds().toString();

  fs.writeFile(
    `./public/preset-posts.${date}.${time}.json`,
    JSON.stringify({ time: timer, data: presetPosts }, null, 2),
    () => {
      clearInterval(interval);
      console.log(
        `Crawl successful. View details on file: ./public/preset-posts.${date}.${time}.json`
      );
    }
  );

  return `preset-posts.${date}.${time}.json`;
}

const server = http.listen(PORT, () => {
  console.log(`Server listening on port:${PORT}`);
});
