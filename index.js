const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");
const download = require("download");

// main();

// const pathPresets = path.join(__dirname, "public", "presets");

// const allGoogleDriveDownloadFile = JSON.parse(
//   fs.readFileSync("public/google-drive-download.20210630-160440.json", {
//     encoding: "utf-8"
//   })
// );

// downloadAllPreset(allGoogleDriveDownloadFile, pathPresets);

async function main() {
  //#region DECLARE
  const fileNameAllPostFromPage = "all-post.{datetime}.json";
  const fileNameAllGoogleDriveView = "google-drive-view.{datetime}.json";
  const fileNameAllGoogleDriveDownload =
    "google-drive-download.{datetime}.json";

  const pathPublic = path.join(__dirname, "public");
  const pathPresets = path.join(pathPublic, "presets");
  const pathAllPostFromPage = path.join(pathPublic, fileNameAllPostFromPage);
  const pathAllGoogleDriveView = path.join(
    pathPublic,
    fileNameAllGoogleDriveView
  );
  const pathAllGoogleDriveDownload = path.join(
    pathPublic,
    fileNameAllGoogleDriveDownload
  );

  const urlTotalPage =
    "https://congthucmau.com/lightroom/lightroom-mobile-presets";
  const urlGetPostFromPage =
    "https://congthucmau.com/lightroom/lightroom-mobile-presets/page/{page}";
  const urlGoogleDriveDownload =
    "https://drive.google.com/u/0/uc?id={googleDriveId}&export=download";

  const optionGetTotalPage = { dom: ".page-nav .last", attr: "title" };
  const optionGetPost = {
    dom: ".td_module_2 .td-module-title a",
    attr: "href"
  };
  const optionGetGoogleDriveView = { dom: "td a", attr: "href" };

  const regexGoogleDriveURL =
    /https?:\/\/(www\.)?drive.google.com\/file\/d\/[-_a-zA-Z0-9]{33}\/view\?usp\=sharing/i;
  const regexGoogleDriveId = /[-_a-zA-Z0-9]{33}/;

  let totalPage = 0;
  let allPostFromPage = [];
  let allGoogleDriveView = [];
  let allGoogleDriveDownload = [];
  //#endregion

  //#region LOGIC
  totalPage = await getTotalPage(urlTotalPage, optionGetTotalPage);
  allPostFromPage = await getAllPostFromPage(
    urlGetPostFromPage,
    optionGetPost,
    totalPage
  );
  allGoogleDriveView = await getAllGoogleDriveViewFromAllPost(
    allPostFromPage,
    optionGetGoogleDriveView,
    regexGoogleDriveURL
  );
  allGoogleDriveDownload = getAllGoogleDriveDownload(
    allGoogleDriveView,
    urlGoogleDriveDownload,
    regexGoogleDriveId
  );
  //#endregion

  //#region SAVE FILE
  const datetime = getCurrentTime();
  writeFile(
    pathAllPostFromPage.replace("{datetime}", datetime),
    JSON.stringify(allPostFromPage, null, 2),
    "get all post from page successful."
  );
  writeFile(
    pathAllGoogleDriveView.replace("{datetime}", datetime),
    JSON.stringify(allGoogleDriveView, null, 2),
    "get all google drive view from all post successful."
  );
  writeFile(
    pathAllGoogleDriveDownload.replace("{datetime}", datetime),
    JSON.stringify(allGoogleDriveDownload, null, 2),
    "get all google drive download from google drive view successful."
  );
  //#endregion

  downloadAllPreset(allGoogleDriveDownload, pathPresets);
}

async function getTotalPage(url, option) {
  try {
    const html = await axios.get(url);
    const $ = cheerio.load(html.data);
    const totalPage = $(option.dom).attr(option.attr);

    console.log("get total page successful.");

    return parseInt(totalPage, 10);
  } catch (error) {
    console.log(error);
    console.log("function get total page failed.");
  }
}

async function getAllPostFromPage(url, option, totalPage) {
  try {
    const data = [];

    for (let i = 1; i <= totalPage; i++) {
      const urlPage = url.replace("{page}", i);
      const onePerTotal = `${i.toString().padStart(2, "0")}/${totalPage}`;

      try {
        const html = await axios.get(urlPage);
        const $ = cheerio.load(html.data);
        const posts = getPostFromOnePage($, option.dom, option.attr);

        data.push({ page: i, posts });

        console.log(`get all post from page [${onePerTotal}] successful.`);
      } catch (error) {
        console.log(error);
        console.log(`get all post from page [${onePerTotal}] failed.`);
      }
    }

    return data;
  } catch (error) {
    console.log(error);
    console.log("function get all post from page failed.");
  }
}

async function getAllGoogleDriveViewFromAllPost(arrayPost, option, regex) {
  try {
    const source = [];
    const data = [];

    for (const item of arrayPost) {
      for (const subItem of item.posts) {
        source.push(subItem);
      }
    }

    for (let i = 0; i < source.length; i++) {
      const onePerTotal = `${(i + 1).toString().padStart(2, "0")}/${
        source.length
      }`;
      try {
        const url = source[i];
        const html = await axios.get(url);
        const $ = cheerio.load(html.data);

        $(option.dom).each((_, el) => {
          if ($(el).attr(option.attr).match(regex)) {
            data.push($(el).attr("href"));
            console.log(
              `[${onePerTotal}] get google drive view post ${url} successful.`
            );
          }
        });
      } catch (error) {
        console.log(error);
        console.log(
          `[${onePerTotal}] get google drive view post ${url} failed.`
        );
      }
    }

    return data;
  } catch (error) {
    console.log(error);
    console.log(`function get google drive view all post failed.`);
  }
}

function getAllGoogleDriveDownload(
  arrayGoogleDrive,
  urlDownload,
  regexGoogleDriveId
) {
  const data = [];

  for (let i = 0; i < arrayGoogleDrive.length; i++) {
    const item = arrayGoogleDrive[i];
    const onePerTotal = `${(i + 1).toString().padStart(2, "0")}/${
      arrayGoogleDrive.length
    }`;

    if (item.match(regexGoogleDriveId)) {
      const matched = item.match(regexGoogleDriveId);
      const url = urlDownload.replace("{googleDriveId}", matched[0]);

      data.push(url);
      console.log(
        `[${onePerTotal}] get url google drive download of ${item} successful.`
      );
    } else {
      console.log(
        `[${onePerTotal}] get url google drive download of ${item} failed.`
      );
    }
  }

  return data;
}

async function downloadAllPreset(arrayGoogleDriveDownload, path) {
  await Promise.all(
    arrayGoogleDriveDownload.map(url => {
      download(url, path)
        .then(() => console.log(`download ${url} successful.`))
        .catch(error => {
          console.log(error);
          console.log(`download ${url} failed.`);
        });
    })
  )
    .then(() => console.log("download all preset completed."))
    .catch(error => {
      console.log(error);
      console.log("Something went wrong when download preset.");
    });
}

//#region common function
function getPostFromOnePage($, dom, attr) {
  const data = [];

  $(dom).each((_, el) => {
    data.push($(el).attr(attr));
  });

  return data;
}

function getCurrentTime() {
  const date = new Date();

  const day =
    date.getFullYear().toString() +
    (date.getMonth() + 1).toString().padStart(2, "0") +
    date.getDate().toString().padStart(2, "0");

  const time =
    date.getHours().toString().padStart(2, "0") +
    date.getMinutes().toString().padStart(2, "0") +
    date.getSeconds().toString().padStart(2, "0");

  return `${day}-${time}`;
}

function writeFile(path, data, message) {
  fs.writeFile(path, data, () => {
    console.log(`${message} View detail on file: ${path}`);
  });
}
//#endregion
