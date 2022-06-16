import cheerio from 'cheerio';
import fetch from 'node-fetch';
import fs from 'fs';

function find_author(string) {
    let reg = /(Écrit.par.)(?<name>[A-Za-z0-9 ]+)/;
    let res = string.match(reg).groups;
    return res.name;
}

function tradMonth(string) {
    switch(string) {
        case 'janvier':
            return 'January';
        case 'février':
            return 'February';

        case 'mars':
            return 'March';

        case 'avril':
            return 'April';

        case 'mai':
            return 'May';

        case 'juin':
            return 'June';

        case 'juillet':
            return 'July';

        case 'août':
            return 'August';

        case 'septembre':
            return 'September';

        case 'octobre':
            return 'October';

        case 'novembre':
            return 'November';

        case 'décembre':
            return 'December';
    }
}

function dateToTimeStamp(string) {
    let reg = /(?<date>[0-9]+).(?<mois>[a-z]+).(?<annee>[0-9]+),.(?<heure>[0-9:]+)/;
    let array = string.match(reg);
    let date = new Date(tradMonth(array[2]).toString() + " " + array[1].toString() + " " + array[3].toString() + " " + array[4].toString());
    return date.getTime();
}

function getCookieCount(str) {
    var regex = /\bcookie\b|\bcookies\b/gi;
    var count = str.match(regex);
    return count ? count.length : 0;
  }

function comp(a, b) {
    if (a[1] > b[1])
        return -1;
    else if (a[1] === b[1])
        if (a[0] < b[0])
            return -1;
    return 1;
}

function cookie(array) {
    let res = [];
    array.forEach((element) => {
        let is_add = false;
        for (let i = 0; i < res.length; i++) {
            let aut = res[i];
            if (aut[0] === element.author) {
                is_add = true;
                aut[1] += getCookieCount(element.content);
            }
        }
        if (is_add === false) {
            let li = [element.author, getCookieCount(element.content)];
            res.push(li);
        }
    });
    return res;
}

async function one_page(e, adress) {
    let cur_article = await fetch(adress.concat(e));
    let $$ = cheerio.load(await cur_article.text());

    return {
        "title": $$(".article-title").text().trim(),
        "slug": e.substring("/news/".length).trim(),
        "content": $$(".article-content").text().trim(),
        "author": find_author($$(".article-author").text().trim()),
        "createdAt": dateToTimeStamp($$(".article-date").text().trim())
    };
}

const second_step = async (adress) => {
    //Enter to the main page
    const response = await fetch(adress);
    let $ = cheerio.load(await response.text());

    let links = [];
    let titles = [];
    //get all the links to find the news
    let news_link = $('.h-link').each(function (i) {
        links[i] = $(this).prop('href');
        titles[i] = $(this).text();
    });

    // go inside the news page
    let news_i = titles.indexOf("News");
    let cur_ad = adress.concat(links[news_i]);
    let news = await fetch(cur_ad);

    let $$ = cheerio.load(await news.text());
    let obj_link = [];
    let next_page;

    //loop to get all the links of all the pages
    while (true) {
        //  get the link of the next page

        next_page = null;
        $$('.page-link').each((i, e) => {
            if ($$(e).text() === "Page suivante")
                next_page = $$(e).prop('href');
        });

        var next_promise = (async () => {
            if (next_page === null)
                return;
            news = await fetch(adress.concat(next_page));
            return cheerio.load(await news.text());   
        })();

        // get all the links of the current page
        $$('li[class="article-item"]').each((i, e) => {
            obj_link.push($$(e).children('a').attr('href'));
        });

        $$ = await next_promise;

        if (next_page === null)
            break;
        
    }

    //loop in the array of links to get the info of all the article
    let res_news = [];
    for (let i = 0; i < obj_link.length; i++) {
        //go inside the page
        res_news.push(one_page(obj_link[i], adress));
    }

    res_news = await Promise.all(res_news);

    res_news.sort((a, b) => {
        if (a.createdAt > b.createdAt)
            return 1;
        if (a.createdAt < b.createdAt) {
            return -1;
        }
        return 0;
    });

    let jsonContent = JSON.stringify(res_news, null, 3);

    // create the file news.json
    try {
        // first check if directory already exists
        if (!fs.existsSync("results")) {
            fs.mkdirSync("results");
        } 
        fs.writeFileSync("results/news.json", jsonContent, function (err) {
            if (err) throw err;
        })
    }
    catch (e) {
        console.log("Cannot create the directory");
    }

    let author_news = [];
    res_news.forEach((element) => {
        let is_add = false;
        for (let i = 0; i < author_news.length; i++) {
            let aut = author_news[i];
            if (aut[0] === element.author) {
                is_add = true;
                aut[1]++;
            }
        }
        if (is_add === false) {
            let li = [element.author, 1];
            author_news.push(li);
        }
    });

    author_news.sort((a, b) => {
        return comp(a, b);
    });

    let res = {
        "authorNews": author_news,
        "mostCookieAuthor": cookie(res_news).sort((a, b) => {return comp(a, b);})[0][0]
    };

    jsonContent = JSON.stringify(res, null, 3);

    // create the file news_analysis.json
    try {
        // first check if directory already exists
        if (!fs.existsSync("results")) {
            fs.mkdirSync("results");
        } 
        fs.writeFileSync("results/news_analysis.json", jsonContent, function (err) {
            if (err) throw err;
        })
    }
    catch (e) {
        console.log("Cannot create the directory");
    }
}

function step_two(adress) {
    return second_step(adress);
}

export {
    step_two
}