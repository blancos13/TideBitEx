const path = require("path");
const WebSocket = require("ws");
const Codes = require("../constants/Codes");
const ResponseFormat = require("../libs/ResponseFormat");
const EventBus = require("../libs/EventBus");
const Events = require("../constants/Events");
const { parseMemberId } = require("../libs/TideBitLegacyAdapter");

const Bot = require(path.resolve(__dirname, "Bot.js"));

class WSChannel extends Bot {
  _client = {};
  _privateClient = {};
  _channelClients = {};
  constructor() {
    super();
    this.name = "WSChannel";
  }

  init({ config, database, logger, i18n }) {
    this.config = config;
    this.redis = this.config.redis.domain;
    return super.init({ config, database, logger, i18n });
  }

  start() {
    return super.start();
  }

  ready() {
    return super
      .ready()
      .then(() => {
        return this.getBot("receptor").then((Receptor) => Receptor.servers);
      })
      .then((servers) => {
        this.WebSocket = new WebSocket.Server({
          noServer: true,
          clientTracking: true,
        });
        Object.values(servers).map((s) => {
          s.on("upgrade", (request, socket, head) => {
            this.WebSocket.handleUpgrade(request, socket, head, (ws) => {
              this.WebSocket.emit("connection", ws, request);
            });
          });
        });

        return Promise.resolve(this.WebSocket);
      })
      .then((wss) => {
        wss.on("connection", (ws, req) => {
          ws.id = req.headers["sec-websocket-key"];
          this._client[ws.id] = {
            ws,
            channel: "",
            isStart: false,
            isPrivate: false,
            memberId: "",
          };
          let ip = req.headers["x-forwarded-for"]
            ? req.headers["x-forwarded-for"].split(/\s*,\s*/)[0]
            : req.headers["host"]
            ? req.headers["host"].split(/\s*,\s*/)[0]
            : "unknown";
          ws.on("message", (message) => {
            let op, args;
            try {
              const parsed = JSON.parse(message);
              op = parsed?.op;
              args = parsed?.args;
            } catch (error) {
              this.logger.debug(
                `[${new Date().toISOString()}][${
                  this.constructor.name
                }] JSON.parse(message) error`,
                message,
                error
              );
            }
            if (!op || !args) {
              ws.send(
                JSON.stringify(
                  new ResponseFormat({
                    message: "Invalid Input WebSocket Data.",
                    code: Codes.INVALID_INPUT_WEBSOCKET_DATA,
                  })
                )
              );
              return;
            }
            switch (op) {
              case Events.userStatusUpdate:
                this._onOpStatusUpdate(req.headers, ws, args, this.redis);
                break;
              case Events.switchMarket:
                this._onOpSwitchMarket(ws, args);
                break;
              case Events.registerMarket:
                this._onOpRegisterMarket(ws, args);
                break;
              default:
                ws.send(
                  JSON.stringify(
                    new ResponseFormat({
                      message: "Invalid Input WebSocket operatrion.",
                      code: Codes.INVALID_INPUT_WEBSOCKET_OPERATION,
                    })
                  )
                );
            }
          });
          ws.on("close", () => {
            const findClient = this._client[ws.id];
            if (findClient.isStart) {
              delete this._channelClients[findClient.channel][ws.id];
              if (
                Object.values(this._channelClients[findClient.channel])
                  .length === 0
              ) {
                EventBus.emit(
                  Events.tickerOnUnsubscribe,
                  findClient.channel,
                  ws.id
                );
              }
            }
            if (findClient.isPrivate) {
              EventBus.emit(Events.userOnUnsubscribe, ws.id);
              findClient.isPrivate = false;
              Object.values(this._privateClient).forEach((member) => {
                Object.values(member).forEach((client) => {
                  if (client.ws.id === ws.id)
                    delete this._privateClient[client.memberId][ws.id];
                });
              });
            }
            delete this._client[ws.id];
          });
        });
      });
  }

  // TODO SPA LOGIN
  // ++ CURRENT_USER UNSAVED
  async _onOpStatusUpdate(header, ws, args, redis) {
    const findClient = this._client[ws.id];
    let { memberId, XSRFToken, peatioSession } = await parseMemberId(
      {
        ...header,
        memberId: args.memberId,
        XSRFToken: args.XSRFToken,
        peatioSession: args.peatioSession,
      },
      redis
    );
    if (memberId !== -1 && args.CSRFToken) {
      findClient.isPrivate = true;
      findClient.memberId = memberId;
      if (!this._privateClient[memberId]) this._privateClient[memberId] = {};
      /**
         * findClient = {
            ws,
            channel: "",
            isStart: false,
            isPrivate: false,
            memberId: ""
          }
         */
      this._privateClient[memberId][ws.id] = findClient;
      EventBus.emit(Events.userOnSubscribe, {
        headers: {
          cookie: `XSRF-TOKEN=${decodeURIComponent(
            XSRFToken
          )};_peatio_session=${peatioSession}`,
          "content-type": "application/json",
          "x-csrf-token": args.CSRFToken,
        },
        memberId,
        wsId: ws.id,
      });
    } else {
      findClient.isPrivate = false;
      EventBus.emit(Events.userOnUnsubscribe, {
        wsId: ws.id,
      });
    }
  }

  _onOpRegisterMarket(ws, args) {
    EventBus.emit(Events.registerMarket, args.market);
  }

  _onOpSwitchMarket(ws, args) {
    const findClient = this._client[ws.id];
    if (!findClient.isStart) {
      findClient.channel = args.market;
      findClient.isStart = true;

      // add channel-client map
      if (!this._channelClients[args.market]) {
        this._channelClients[args.market] = {};
      }
      if (Object.values(this._channelClients[args.market]).length === 0) {
        EventBus.emit(Events.tickerOnSibscribe, args.market, ws.id);
      }
      this._channelClients[args.market][ws.id] = ws;
    } else {
      const oldChannel = findClient.channel;
      delete this._channelClients[oldChannel][ws.id];
      if (Object.values(this._channelClients[oldChannel]).length === 0) {
        EventBus.emit(Events.tickerOnUnsubscribe, oldChannel, ws.id);
      }
      findClient.channel = args.market;
      if (!this._channelClients[args.market]) {
        this._channelClients[args.market] = {};
      }
      if (Object.values(this._channelClients[args.market]).length === 0) {
        EventBus.emit(Events.tickerOnSibscribe, args.market, ws.id);
      }
      this._channelClients[args.market][ws.id] = ws;
    }
    if (findClient.isPrivate) {
      this._privateClient[findClient.memberId][ws.id] = findClient;
    }
  }

  async getPrivateClients() {
    return this._privateClient;
  }

  broadcast(market, { type, data }) {
    const msg = JSON.stringify({ type, data });
    // this.WebSocket.send(msg);
    const channel = this._channelClients[market];
    if (channel) {
      const clients = Object.values(channel);
      clients.forEach((ws) => {
        ws.send(msg);
      });
    }
  }

  broadcastAllClient({ type, data }) {
    const msg = JSON.stringify({ type, data });
    const clients = Object.values(this._client);
    clients.forEach((client) => {
      client.ws.send(msg);
    });
  }

  broadcastPrivateClient(memberId, { market, type, data }) {
    const msg = JSON.stringify({ type, data });
    if (this._privateClient[memberId]) {
      const clients = Object.values(this._privateClient[memberId]).filter(
        (client) => client.channel === market
      );
      clients.forEach((client) => {
        client.ws.send(msg);
      });
    } else
      this.logger.debug(
        `[${new Date().toISOString()}][${
          this.constructor.name
        }] memberId[${memberId}] is not online. this._privateClient[memberId]:`,
        this._privateClient[memberId],
        `market`,
        market,
        `type`,
        type,
        `data`,
        data
      );
  }

  broadcastAllPrivateClient(memberId, { type, data }) {
    const msg = JSON.stringify({ type, data });
    if (this._privateClient[memberId]) {
      const clients = Object.values(this._privateClient[memberId]);
      clients.forEach((client) => {
        client.ws.send(msg);
      });
    } else
      this.logger.debug(
        `[${new Date().toISOString()}][${
          this.constructor.name
        }] memberId[${memberId}] is not online. this._privateClient[memberId]`,
        this._privateClient[memberId],
        `market`,
        `type`,
        type,
        `data`,
        data
      );
  }
}

module.exports = WSChannel;
