'use strict';

// Load providers
const providers = require('../scrapers/providers');

const BaseProvider = require('../scrapers/providers/BaseProvider');

/**
 * Sends the current time in milliseconds.
 */
const sendInitialStatus = (sse) => sse.send({ data: [`${new Date().getTime()}`], event: 'status'}, 'result');

/**
 * Return request handler for certain media types.
 * @param data media query
 * @param ws web socket
 * @param req request
 * @return {Function}
 */
const resolveLinks = async (data, ws, req) => {
    const type = data.type;
    const sse = {
        send: (data) => {
            try {
                ws.send(JSON.stringify(data));
            } catch (err) {
                console.log("WS client disconnected, can't send data");
            }
        },
        stopExecution: false
    };

    sendInitialStatus(sse);

    ws.on('close', () => {
        sse.stopExecution = true;
    });

    const promises = [];

    req.query = {...data, type};

    // Get available providers.
    let availableProviders;
    if (type === 'anime') {
        // The universal provider won't work with animes.
        availableProviders = [...providers[type]]
    } else {
        availableProviders = [...providers[type], ...providers.universal];
    }

    availableProviders.forEach((provider) => {
        if (provider instanceof BaseProvider) {
            // Use object orientated provider.
            return promises.push(provider.resolveRequests(req, sse));
        } else {
            // Use declarative provider.
            return promises.push(provider(req, sse));
        }
    });

    await Promise.all(promises);

    sse.send({event: 'done'}, 'done');
};

module.exports = resolveLinks;