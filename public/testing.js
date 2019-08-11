
const requestProm = require('request-promise');
const API_ENDPOINT = `https://api.spotify.com`;
//const CLIENT_ID = process.env.LMS_CLIENT_ID; // Loaded from our .env file
//const CLIENT_SECRET = process.env.LMS_CLIENT_SECRET; // Loaded from our .env file
const PAGE_SIZE = 50; // How many records the API returns in a page.



const go = async (token) => {
    allAlbums = await getAlbums(token); // IRF this is the call
    // allAlbums = getAlbums();
        // We're all done.   Now we can do what we would like with our array of user objects.
    console.log(`Total length of users is ${allAlbums.length}`);
    return allAlbums;
    console.log("after return???");
}

function doSomethingCool() {
  getAlbums().then(allAlbums => allAlbums);
}

const getAlbums = async (token) => {
    let allAlbums = [];
    let keepGoing = true;
    let offset = 0;
    while (keepGoing) {
        console.log("in keepGoing");
        let response = await reqAlbums(offset, token);
        console.log("response! ", response);
        console.log("response length: ", response.items.length);
        allAlbums.push(response);
        //await allAlbums.push(response);
        //await allAlbums.push.apply(allAlbums, response);
        offset += 50;
        if (response.items.length < PAGE_SIZE) {
            console.log("response < page size ", response.items.length,"   ", PAGE_SIZE);
            keepGoing = false;
            console.log("num in allAlbums: ", allAlbums[0]);
            await Promise.all(allAlbums);
            return allAlbums;
        }
    }
}

const reqAlbums = async (offset, token) => {
    const albumRequest = {
        url: `${API_ENDPOINT}/v1/me/albums?offset=${offset}&limit=50`,
        json: true,
        headers: { 'Authorization': 'Bearer ' + token },
        data: {
            limit: 50
        }
    };

    try {
        let payload = await requestProm(albumRequest);
        console.log("payload! ", payload);
        return payload;
    } catch(err) {
        console.log("Error in reqAlbums");
    }
}



export function iNeedAlbums(token) {
    console.log("beginning of albumsFirst");
    let allAlbums = [];
    //allAlbums = doSomethingCool();
    allAlbums = go(token);
    console.log("ALL ALBMS: ", allAlbums);
    console.log("after go");
    return allAlbums;
}
