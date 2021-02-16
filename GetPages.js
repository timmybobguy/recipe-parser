const cheerio = require('cheerio');
const request = require('request');
const fs = require('fs');

const crawledPages = [];
const crawledPagesData = [];
let foundPages = [];
let index = 0;

const domain = process.argv[2];
const filterArray = process.argv.splice(3);
//const filter = process.argv[3];

crawl = async () => {
	// here goes the magic
console.log("crawl ran", foundPages.length, "/",crawledPages.length)
	// if it's the first start
    if (index === 0) {
        // use / as first page.
        foundPages.push(domain + '/');
    }

    const pageToCrawl = foundPages[index];
     // exit the process if both arrays are the same or the next page is not defined
    if (foundPages === crawledPages || !pageToCrawl) {
        // stop
        fs.writeFileSync('urls_'+ domain +'.json', JSON.stringify({ data: crawledPagesData }), function (err) {
            if (err) throw err;
        });
        process.exit();
    }

    // if pageToCrawl is not yet in list of crawledPages
    if (crawledPages.indexOf(pageToCrawl) === -1) {
        if (pageToCrawl) {
            new Promise(resolve => {
            	// visit the page
            	visitPage(pageToCrawl, resolve);
            }).then(function() {
                index++;
                crawl();
            });
        } else {
            process.nextTick(crawl);
        }
    } else {
        // go to next crawl
        process.nextTick(crawl);
    }
}

visitPage = (url, callback) => {
	 // Make the request
    request('https://' + url, function(error, response, body) {
        // Check status code (200 is HTTP OK)
        if (!response || response.statusCode !== 200) {
            process.nextTick(callback);
            return;
        }

        // Add URL to crawled Pages
        crawledPages.push(url);
        console.log("URL: " + url);

        filterArray.forEach(filter => {
            if (url.includes(filter)) {
                console.log("Added: " + url);
                crawledPagesData.push({
                    name: url
                });
            }
        });
        
        

        // Parse the document body
        const $ = cheerio.load(body);

        // collect all links
        collectInternalLinks($, domain, foundPages).then(
            (newFoundPages) => {
                foundPages = newFoundPages;
                callback();
        });
    });
}

collectInternalLinks = ($, domain, foundPages) => {
    return new Promise(resolve => {
        const elements = "a[href^='http://" + domain + "']:not(a[href^='mailto']), " +
            "a[href^='https://" + domain + "']:not(a[href^='mailto']), " +
            "a[href^='https://www." + domain + "']:not(a[href^='mailto']), " +
            "a[href^='http://www." + domain + "']:not(a[href^='mailto']), " +
            "a[href^='/']:not(a[href^='mailto'])";

        const relativeLinks = $(elements);

        relativeLinks.each(function(i, e) {

            let href = $(this).attr('href');

            if (href.indexOf('www.') !== -1) {
                href = href.substr(href.indexOf('www.') + 4, href.length);
            }
            if (href.indexOf('http') === 0) {
                href = href.substr(href.indexOf('://') + 3, href.length);
            } else if (href.indexOf('/') === 0) {
                href = domain + href;
            }

            // only add the href to the foundPages if it's not there yet.
            if (foundPages.indexOf(href) === -1) {
                foundPages.push(href);
            }
        });

        resolve(foundPages);
    })
}


crawl();
