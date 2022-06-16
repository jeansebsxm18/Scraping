import cheerio from 'cheerio';
import fetch from 'node-fetch';
import myFetch from './RateLimiter.js';
import fs from 'fs';

function getName(string) {
    let reg = /[^/]+$/;
    let array = string.match(reg);
    return array[0];
}

function getNumber(string) {
    let reg = /[0-9.]+/;
    let res = string.match(reg);
    return parseInt(res[0]);
}

function getNumber2(string) {
    let reg = /[0-9.]+/;
    let res = string.match(reg);
    return parseFloat(res[0]);
}

function comp(a, b) {
    if (a.category < b.category)
        return -1;
    else if (a.category === b.category)
        if (a.name < b.name)
            return -1;
    return 1;
}

function analysisStep3(array) {

    let price = 0;
    let priceByCat = {};
    let nbByCat = {};
    let stock = 0;

    let listImg = [];
    let nbItem = 0;
    for (let item of array) {
        nbItem++;
        price += item.price;
        stock += item.stock * price;
        if (!priceByCat[item.category]) {
            priceByCat[item.category] = item.price;
        } else {
            priceByCat[item.category] += item.price;
        }

        if (!nbByCat[item.category]) {
            nbByCat[item.category] = 1;
        } else {
            nbByCat[item.category] += 1;
        }
        /*
        for (let item2 of array) {
            if (item !== item2) {
                let imm1 = fs.readFile("./images/" + item.image, 'utf8');
                let imm2 = fs.readFile("./images/" + item2.image, 'utf8');
                let im1 = new Buffer(imm1);
                let im2 = new Buffer(imm2);
                if (Buffer.compare(im1, im2) === 0 && !listImg.includes(item2.name)) {
                    listImg.push(item2.name); 
                }
            }
        }*/
    }
    
    for (let key in priceByCat) {
        priceByCat[key] = priceByCat[key] / nbByCat[key];
    }

    let obj = {
        "productsWithDuplicateImage": listImg,
        "meanPrice": price / nbItem,
        "meanPricePerCategory": priceByCat,
        "totalValueOfStock": stock
    }

    let res = JSON.stringify(obj, null, 3);

    fs.writeFile("./results/products_analysis.json", res, function (err) {
        if (err) console.log(err);
    });
}

async function getProduct(adress, link, category) {
    let cur_article = await myFetch(category, link);
    let $$ = cheerio.load(await cur_article.text());

    let tag = [];

    $$('.tag').each((i, e) => {
        tag[i] = $$(e).text();
    })

    let image = $$(".product-picture").children("img").prop("src");
    let imageName = getName(image);
    if (!fs.existsSync("./images/")) {
        fs.mkdir("./images", { recursive: true }, function(err) {
            if (err) console.log(err);
        });
    }
    fetch(adress + image).then(res => res.body.pipe(fs.createWriteStream("./images/" + imageName)));

    return {
        "category": category,
        "description": $$('div[class="product-content m-width-70"]').text().trim(),
        "image": getName($$(".product-picture").children("img").prop("src")),
        "name": getName(link),
        "price": getNumber2($$('.product-price').children('div').text()),
        "stock": getNumber($$('.product-stock').text()),
        "tags": tag
    };
}

async function getInfo(adress, link, name_category) {
    let cur_page = await fetch(adress.concat(link));
    let $$ = cheerio.load(await cur_page.text());

    let obj_link = [];
    while (true) {
        let next_page = null;
        $$('.page-link').each((i, e) => {
            if ($$(e).text() === "Page suivante")
                next_page = $$(e).prop('href');
        });

        let item = [];
        var next_promise = (async () => {
            if (next_page === null)
                return;
            let news = await fetch(adress.concat(next_page));
            return cheerio.load(await news.text());   
        })();

        
        //go into the links of the current page to get the objects
        $$('li[class="product-item"]').each((i, e) => {
            let lin = adress.concat($$(e).children('a').attr('href'));
            item.push(getProduct(adress, lin, name_category));
        });

        obj_link.push.apply(obj_link, await Promise.all(item));

        $$ = await next_promise;

        if (next_page === null)
            break;
    }
    
    return obj_link;
}

const step3 = async (adress) => {
    let response = await fetch(adress);
    let $ = cheerio.load(await response.text());

    //get the link of all categories to parse them in an array
    let categories = [];
    $('.h-link').each((i, e) => {
        let link = $(e).prop('href');
        let name_category = $(e).text();
        //directly parse each page info and put it into the array
        if ($(e).prop('href').includes('category'))
            categories.push(getInfo(adress, link, name_category));
    });

    categories = await Promise.all(categories);
    let res = [];
    for (let i = 0; i < categories.length; i++) {
        for (let j = 0; j < categories[i].length; j++) {
            res.push(categories[i][j]);
        }
    }

    res.sort((a, b) => {
        return comp(a,b);
    });

    analysisStep3(res);
    
    const jsonContent = JSON.stringify(res, null, 3);

    // create the file news_analysis.json
    try {
        // first check if directory already exists
        if (!fs.existsSync("results")) {
            fs.mkdirSync("results");
        } 
        fs.writeFileSync("results/products.json", jsonContent, function (err) {
            if (err) throw err;
        })
    }
    catch (e) {
        console.log("Cannot create the directory");
    }
};

function step_three(adress) {
    return step3(adress);
}

export {
    step_three
}