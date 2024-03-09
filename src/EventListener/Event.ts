export class EventEmitter {
    /**
    * @constructor
    */
    constructor() {
        this.events = {}
    }
    events: any;
    /**
     * Adds a listener to be invoked when events of the specified type are
     * emitted.
     *
     * @param {string}   event    Name of the event to listen to
     * @param {function} listener Function to invoke when the specified event
     *                            is emitted
     */
    addListener(event: string, listener: Function) {
        const events = this.events;
        if (typeof listener === 'function') {
            if (events.hasOwnProperty(event) && Array.isArray(events[event])) {
                this.listeners(event).push(listener)
            } else {
                events[event] = [listener]
            }
        }
    }


    /**
     * Alias to addListener
     */
    on(event: string, listener: Function) {
        this.addListener(event, listener)
    }


    /**
     * Removes a registered listener from the emitter.
     *
     * @param {string}   event    Name of the event listening to
     * @param {function} listener Function to remove
     */
    removeListener(event: string, listener: Function) {
        const events = this.events;
        let listeners
        let listenerString
        if (typeof listener === 'function' &&
            events.hasOwnProperty(event) &&
            Array.isArray(events[event])) {

            listeners = this.listeners(event)
            listenerString = listener.toString()
            for (let i = 0; i < listeners.length; i++) {
                if (listeners[i].toString() === listenerString) {
                    listeners.splice(i, 1)
                }
            }
        }
    }


    /**
     * Removes all of the registered listeners.
     *
     * @param {string} event Name of the event to remove listeners from
     */
    removeAllListeners(event: string) {
        const events = this.events;
        if (events.hasOwnProperty(event)) {
            events[event] = []
        }
    }


    /**
     * Emits an event of the given type with the given data. All handlers of that
     * particular type will be notified.
     *
     * @param {string} event Name of the event to emit
     * @param {*}            Arbitrary arguments to be passed to each
     *                       registered listener
     *
     * @example
     *   emitter.addListener('someEvent', (message) => {
     *     console.log(message)
     *   })
     *
     *   emitter.emit('someEvent', 'hello') // logs 'hello'
     */
    emit(event: string, ...any: any) {
        const events = this.events;
        const args = Array.prototype.slice.call(arguments, 1)
        let listeners

        if (events.hasOwnProperty(event) && Array.isArray(events[event])) {
            // create a shallow copy
            listeners = this.listeners(event).slice()

            for (let i = 0; i < listeners.length; i++) {
                // The subscription may have been removed during this event loop.
                if (listeners[i]) {
                    listeners[i].apply(this, args)
                }
            }
        }
    }


    /**
     * Much like addListener, except the listener is removed after being invoked.
     *
     * @param {string}   event    Name of the event to listen to
     * @param {function} listener Function to invoke only once when the given
     *                            event is emitted
     */
    once(event: string, listener: Function) {
        const emitter = this
        emitter.on(event, function listenerWrapper() {
            emitter.removeListener(event, listenerWrapper)
            listener.apply(emitter, arguments)
        })
    }


    /**
     * Returns an array of listeners that are currently registered for the given
     * event.
     *
     * @param  {string} event Name of the event to query
     * @return {array}
     */
    listeners(event: string) {
        return this.events.hasOwnProperty(event) ? this.events[event] : []
    }
}