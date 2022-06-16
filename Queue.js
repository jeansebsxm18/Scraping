export default class Queue {
    TIME_CONSTANT = 100;

    _queue = [];

    setRate(remaining, interval, reset) {
        this.interval = interval;
        this.remaining = remaining;
        this.reset = reset;
        this.limit = remaining + 1;
    }

    check(override) {
        if (this.limit === undefined) {
            return;
        }

        if (this.processing && !override)
            return;


        if (this._queue.length === 0) {
            this.processing = false;
            return;
        }
        
        this.processing = true;

        const now = Date.now();
        if (now > this.reset) {
            this.remaining = this.limit;
            this.reset = now + this.interval + this.TIME_CONSTANT;
        }

        if (this.remaining > 0) {
            this.remaining--;
            const task = this._queue.shift();
            task(this);
            this.check(true);
        }
        else {
            const waitTime = this.reset - now;
            setTimeout(() => {
                this.check(true);
            }, waitTime);
        }
    }

    enqueue(task) {
        this._queue.push(task);
        this.check(false);
    }
}