import fetch from "node-fetch";
import Queue from "./Queue.js";

const _queues = {};

export default async function myFetch(key, args) {
    if (_queues[key] == null) {
        _queues[key] = new Queue();
        const response = await fetch(args);
        const rate = getRate(response);
        _queues[key].setRate(rate.remaining, rate.interval, rate.reset);
        _queues[key].check(false);
        return response;
    }
    else {
        return new Promise((resolve) => {
            _queues[key].enqueue(async function() {
                const response = await fetch(args);
                resolve(response);
            })
        })
    }
}

function getRate(headers) {
    return {
        interval: Number(headers.headers.get('x-ratelimit-interval')) * 1000,
        remaining: Number(headers.headers.get('x-ratelimit-remaining')),
        reset: Date.parse(headers.headers.get('x-ratelimit-reset'))
    }
}