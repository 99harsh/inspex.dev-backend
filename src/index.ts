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
            const clientId = generateClientId();
            ws.room_owner = "host";
            ws.client_id = clientId;
            ws.room_id = roomId;
            if (!rooms[roomId]) {
                rooms[roomId] = [];
            }

            const { dom } = decodedObject;
            const updatedDomString = processDomString(dom);
            const response = {
                event: "exchange_dom",
                room_id: roomId,
                processed_dom: updatedDomString,
                client_id: clientId
            }
            rooms[roomId] = { host: ws };
            console.log("Room Created:- ", clientId, roomId);
            ws.send(JSON.stringify(response));
        } else if (decodedObject.event == "join_room") {
            if (rooms.hasOwnProperty(decodedObject.room_id)) {
                const client_id = generateClientId();
                ws.client_id = client_id;
                ws.room_id = decodedObject.room_id;
                ws.room_owner = "client";
                if(rooms[decodedObject.room_id]?.client){   
                    rooms[decodedObject.room_id].client.push(ws);
                }else{
                    rooms[decodedObject.room_id].client = [ws];
                }
                rooms[decodedObject.room_id].host.send(JSON.stringify({ event: "request_dom", client_id: client_id }));
                console.log("User Joined:- ", client_id, decodedObject.room_id)
            }else{
                ws.send(JSON.stringify({event: "error", statusCode: 404, messsage: "Room Not Found"}))
            }
        } else if (decodedObject.event == "requested_dom") {
            if (rooms.hasOwnProperty(decodedObject.room_id)) {
                const clients = rooms[decodedObject.room_id].client;
                for (let client of clients) {
                    if (client.client_id == decodedObject.client_id) {
                        client.send(JSON.stringify({event: "exchange_dom", room_id: decodedObject.room_id, client_id: client.client_id, processed_dom: decodedObject.dom}))
                    }
                }
            }
        } else if (decodedObject.event == "listen_change" || decodedObject.event == "lock_element" || decodedObject.event == "listen_innertext_change") {
            if(rooms.hasOwnProperty(decodedObject.room_id)){
                const host = rooms[decodedObject.room_id].host;
                const clients = rooms[decodedObject.room_id]?.client;
                
                if(decodedObject.room_owner != "host"){
                    host.send(JSON.stringify(decodedObject));
                }

                if(clients){
                    for(let client of clients){
                        if(client.client_id != decodedObject.client_id){
                            client.send(JSON.stringify(decodedObject));
                        }
                    }
                }
            }
        }

    })

    ws.on('close', (code:any, reason:any) => {
        console.log("User Disconnected:- ", ws.client_id, ws.room_id);
        if(rooms[ws.room_id]){
            if(rooms[ws.room_id]?.client?.length > 0 && ws.room_owner == "host"){
                rooms[ws.room_id].host = rooms[ws.room_id].client[0];
                rooms[ws.room_id].client.splice(0, 1);
            }else if(rooms[ws.room_id]?.client?.length > 0 && ws.room_owner == "client"){
                const index = rooms[ws.room_id].client.findIndex((o:any) => o.client_id == ws.client_id);
                if(index != -1){
                    rooms[ws.room_id].client.splice(index, 1);
                }
            }else{
                delete rooms[ws.room_id];
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

const generateClientId = (length = 5) => {
    if (length % 2 !== 0) {
        length++;
    }

    return "INSPEX-" + randomBytes(length / 2).toString("hex");
}

server.listen(8080, () => {
    console.log("Server is listening on port 8080")
})