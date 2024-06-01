import { WebSocketServer } from "ws";
import http from 'http';
import { JSDOM } from 'jsdom';
import { randomBytes } from "node:crypto";


const server = http.createServer(function (request: any, response: any) {
    response.end("Hello Connected!");
})

const rooms: any = {};

const wss = new WebSocketServer({ server });
let count = 0;
wss.on('connection', (ws: any) => {
    ws.on('error', console.error);

    ws.on('message', (data: any) => {
        let decodedObject: any = Buffer.from(data).toString('utf-8');
        try {
            decodedObject = JSON.parse(decodedObject);
        } catch (error) {
            console.log("Error")
            return;
        }

        if (decodedObject.event == "create_room") {
            const roomId = generateRoomId();
            ws.room_id = roomId;
            ws.client_id = decodedObject.client_id;
            if (!rooms[roomId]) {
                rooms[roomId] = [];
            }

            const { dom } = decodedObject;
            const updatedDomString = processDomString(dom);
            const response = {
                event: "exchange_dom",
                room_id: roomId,
                processed_dom: updatedDomString
            }

            ws.dom = updatedDomString;
            rooms[roomId] = [ws];
            ws.send(JSON.stringify(response));
            console.log(rooms)


        } else if (decodedObject.event == "join_room") {

            if (rooms.hasOwnProperty(decodedObject.room_id)) {
                const response = {
                    room_id: decodedObject.room_id,
                    event: "exchange_dom",
                    processed_dom: rooms[decodedObject.room_id][0]?.dom,
                }
                rooms[decodedObject.room_id].push(ws);
                ws.send(JSON.stringify(response))
            }
        } else if (decodedObject.event == "listen_change" || true) {
            if (rooms.hasOwnProperty(decodedObject.room_id) && decodedObject?.room_owner == "host" && rooms[decodedObject.room_id]?.length > 1) {
                rooms[decodedObject.room_id][1].send(JSON.stringify(decodedObject));
            } else if (rooms.hasOwnProperty(decodedObject.room_id) && decodedObject?.room_owner == "client" && rooms[decodedObject.room_id]?.length > 1) {
                rooms[decodedObject.room_id][0].send(JSON.stringify(decodedObject));
            }
        }

    })
})

const generateUniqueId = () => {
    return 'unique-' + Math.random().toString(36).substr(2, 9);
}


const assignUniqueIds = (element: any) => {
    if (!element.hasAttribute('data-unique-id')) {
        element.setAttribute('data-unique-id', generateUniqueId());
    }
    console.log("ELEMENT", element)
    Array.from(element.children).forEach(assignUniqueIds);
}


const processDomString = (domString: string) => {
    const dom = new JSDOM(domString);
    const document = dom.window.document;
    assignUniqueIds(document.body);
    return document.body.outerHTML;
}

const generateRoomId = (length = 5) => {
    if (length % 2 !== 0) {
        length++;
    }

    return randomBytes(length / 2).toString("hex");
}

server.listen(8080, () => {
    console.log("Server is listening on port 8080")
})