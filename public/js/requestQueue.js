class RequestQueue {
    constructor(concurrencyLimit) {
        this.queue = [];
        this.running = 0;
        this.concurrencyLimit = concurrencyLimit;
    }

    async add(task) {
        return new Promise((resolve, reject) => {
            this.queue.push({ task, resolve, reject });
            this.runNext();
        });
    }

    async runNext() {
        if (this.running >= this.concurrencyLimit || this.queue.length === 0) {
            return;
        }

        const { task, resolve, reject } = this.queue.shift();
        this.running++;

        try {
            const result = await task();
            resolve(result);
        } catch (error) {
            reject(error);
        } finally {
            this.running--;
            this.runNext();
        }
    }
}