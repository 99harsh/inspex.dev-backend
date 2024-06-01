"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const http_1 = __importDefault(require("http"));
const jsdom_1 = require("jsdom");
const node_crypto_1 = require("node:crypto");
const server = http_1.default.createServer(function (request, response) {
    response.end("Hello Connected!");
});
const rooms = {};
const wss = new ws_1.WebSocketServer({ server });
let count = 0;
wss.on('connection', (ws) => {
    ws.on('error', console.error);
    ws.on('message', (data) => {
        var _a, _b, _c;
        let decodedObject = Buffer.from(data).toString('utf-8');
        try {
            decodedObject = JSON.parse(decodedObject);
        }
        catch (error) {
            console.log("Error");
            return;
        }
        if (decodedObject.event == "create_room") {
            const roomId = generateRoomId();
            ws.room_id = roomId;
            ws.client_id = decodedObject.client_id;
            if (!rooms[roomId]) {
                rooms[roomId] = [];
            }
            // rooms[roomId].forEach((client: any) => {
            //     if (client.readyState === WebSocket.OPEN) {
            //         count++;
            //     }
            // });
            const { dom } = decodedObject;
            const updatedDomString = processDomString(dom);
            const response = {
                event: "exchange_dom",
                room_id: roomId,
                processed_dom: updatedDomString
            };
            ws.dom = updatedDomString;
            rooms[roomId] = [ws];
            ws.send(JSON.stringify(response));
            console.log(rooms);
        }
        else if (decodedObject.event == "join_room") {
            if (rooms.hasOwnProperty(decodedObject.room_id)) {
                const response = {
                    room_id: decodedObject.room_id,
                    event: "exchange_dom",
                    processed_dom: (_a = rooms[decodedObject.room_id][0]) === null || _a === void 0 ? void 0 : _a.dom,
                };
                rooms[decodedObject.room_id].push(ws);
                ws.send(JSON.stringify(response));
            }
        }
        else if (decodedObject.event == "listen_change" || true) {
            if (rooms.hasOwnProperty(decodedObject.room_id) && (decodedObject === null || decodedObject === void 0 ? void 0 : decodedObject.room_owner) == "host" && ((_b = rooms[decodedObject.room_id]) === null || _b === void 0 ? void 0 : _b.length) > 1) {
                rooms[decodedObject.room_id][1].send(JSON.stringify(decodedObject));
            }
            else if (rooms.hasOwnProperty(decodedObject.room_id) && (decodedObject === null || decodedObject === void 0 ? void 0 : decodedObject.room_owner) == "client" && ((_c = rooms[decodedObject.room_id]) === null || _c === void 0 ? void 0 : _c.length) > 1) {
                rooms[decodedObject.room_id][0].send(JSON.stringify(decodedObject));
            }
        }
    });
});
const generateUniqueId = () => {
    return 'unique-' + Math.random().toString(36).substr(2, 9);
};
const assignUniqueIds = (element) => {
    if (!element.hasAttribute('data-unique-id')) {
        element.setAttribute('data-unique-id', generateUniqueId());
    }
    console.log("ELEMENT", element);
    Array.from(element.children).forEach(assignUniqueIds);
};
const processDomString = (domString) => {
    const dom = new jsdom_1.JSDOM(domString);
    const document = dom.window.document;
    assignUniqueIds(document.body);
    return document.body.outerHTML;
};
const generateRoomId = (length = 5) => {
    if (length % 2 !== 0) {
        length++;
    }
    return (0, node_crypto_1.randomBytes)(length / 2).toString("hex");
};
server.listen(8080, () => {
    console.log("Server is listening on port 8080");
});
