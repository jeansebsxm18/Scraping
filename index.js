import { step_one } from "./step1.js";
import { step_two } from "./step2.js";
import { step_three } from "./step3.js";

//let url = "http://127.0.0.1:8080";

let url = process.env.SERVER_URL;
//console.time('index');

step_one(url);
step_two(url);
step_three(url);


/*
console.time('step2');

step_two(url).then(() => {
    console.timeEnd('step2');
});*/
