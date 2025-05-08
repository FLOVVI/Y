import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from db import save_message, get_history

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# In-memory active connections
from collections import defaultdict
active_connections: dict[str, list[WebSocket]] = defaultdict(list)

async def broadcast_user_list():
    users = list(active_connections.keys())
    data = json.dumps({"type": "users", "users": users})
    for ws_list in active_connections.values():
        for ws in ws_list:
            await ws.send_text(data)

@app.get("/users")
async def users():
    return JSONResponse(list(active_connections.keys()))

@app.get("/", response_class=HTMLResponse)
async def get(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.websocket("/ws/{username}")
async def websocket_endpoint(ws: WebSocket, username: str):
    await ws.accept()
    # register
    active_connections[username].append(ws)
    await broadcast_user_list()
    try:
        while True:
            data = await ws.receive_text()
            msg = json.loads(data)
            t = msg.get("type")
            if t == "message":
                to = msg.get("to")
                content = msg.get("message")
                save_message(username, to, content)
                out = json.dumps({"type": "message", "from": username, "message": content})
                # send to recipient if online
                ws_to = active_connections.get(to)
                if ws_to := active_connections.get(to):
                    for w in ws_to:
                        await w.send_text(out)
                else:
                    await ws.send_text(json.dumps({"type": "error", "message": "User not online."}))
            elif t == "history":
                other = msg.get("with")
                rows = get_history(username, other)
                history = [dict(sender=r[0], recipient=r[1], content=r[2], timestamp=r[3]) for r in rows]
                await ws.send_text(json.dumps({"type": "history", "with": other, "history": history}))
    except WebSocketDisconnect:
        active_connections[username].remove(ws)
        if not active_connections[username]:
            del active_connections[username]
        await broadcast_user_list()