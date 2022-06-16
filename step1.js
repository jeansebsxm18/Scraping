import cheerio from 'cheerio';
import fetch from 'node-fetch';
import fs from 'fs';


function getNumber(string) {
    let reg = /(?<number>[0-9]+)/g;
    return string.match(reg);
}

const first_step = async (adress) => {
    const response = await fetch(adress);
    let $ = cheerio.load(await response.text());

    let title = $('.sub-title');
    let title2 = $('.title');
    let title3 = $('title');

    let number = getNumber(title.text());
    let step1 = {
        "productNumber": parseInt(number[0]),
        "userNumber": parseInt(number[1]),
        "secret": title2.text().substring(title3.text().length)
    };

    let jsonContent = JSON.stringify(step1, null, 3);
    try {
        // first check if directory already exists
        if (!fs.existsSync("results")) {
            fs.mkdirSync("results");
        }
        fs.writeFileSync("results/index.json", jsonContent, function (err) {
            if (err) throw err;
        })
    }
    catch (e) {
        console.log("Cannot create the directory");
    }
}

function step_one(address) {
    return first_step(address);
}

export {
    step_one
}