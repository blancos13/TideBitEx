import SafeMath from "../utils/SafeMath";
import Communicator from "./Communicator";

class Middleman {
  constructor() {
    this.communicator = new Communicator();
  }
  updateSelectedTicker(ticker) {
    this.selectedTicker = ticker;
  }
  updateTickers(updatePairs) {
    if (!this.tickers.length > 0) return;
    let updateTickers = [...this.tickers];
    let updateTicker;
    updatePairs.forEach((pair) => {
      const index = this.tickers.findIndex(
        (ticker) => ticker.instId === pair.instId
      );
      updateTickers[index] = {
        ...pair,
        pair: pair.instId.replace("-", "/"),
        change: SafeMath.minus(pair.last, pair.open24h),
        changePct: SafeMath.mult(
          SafeMath.div(SafeMath.minus(pair.last, pair.open24h), pair.open24h),
          "100"
        ),
        update: true,
      };
      if (pair.instId === this.selectedTicker?.instId)
        updateTicker = updateTickers[index];
      return index;
    });
    this.tickers = updateTickers;
    return {
      updateTicker,
      updateTickers,
    };
  }

  async getTickers(instType, from, limit) {
    try {
      const rawTickers = await this.communicator.tickers(instType, from, limit);
      const tickers = rawTickers.map((ticker) => ({
        ...ticker,
        baseCcy: ticker.instId.split("-")[0],
        quoteCcy: ticker.instId.split("-")[1],
        pair: ticker.instId.replace("-", "/"),
        // pair: ticker.instId
        //   .split("-")
        //   .reduce((acc, curr, i) => (i === 0 ? `${curr}` : `${acc}/${curr}`), ""),
        change: SafeMath.minus(ticker.last, ticker.open24h),
        changePct: SafeMath.mult(
          SafeMath.div(
            SafeMath.minus(ticker.last, ticker.open24h),
            ticker.open24h
          ),
          "100"
        ),
      }));
      this.tickers = tickers;
      return tickers;
    } catch (error) {
      throw error;
    }
  }

  handleBooks(books) {
    let totalAsks = "0",
      totalBids = "0";
    const asks = books.asks
      ?.sort((a, b) => +a[0] - +b[0])
      ?.map((d) => {
        totalAsks = SafeMath.plus(SafeMath.plus(d[2], d[3]), totalAsks);
        return {
          price: d[0],
          amount: SafeMath.plus(d[2], d[3]),
          total: totalAsks,
        };
      })
      ?.sort((a, b) => +b.price - +a.price);
    const bids = books.bids
      ?.sort((a, b) => +b[0] - +a[0])
      ?.map((d) => {
        totalBids = SafeMath.plus(SafeMath.plus(d[2], d[3]), totalBids);
        return {
          price: d[0],
          amount: SafeMath.plus(d[2], d[3]),
          total: totalBids,
        };
      });
    const updateBooks = {
      ...this.books,
      asks,
      bids,
    };
    return updateBooks;
  }

  updateBooks(orders) {
    console.log(`updateBooks this.rawBooks`, this.rawBooks);
    console.log(`updateBooks orders`, orders);
    orders.forEach((order) => {
      const asks = order.asks
        ?.map((order) => ({
          ...order,
          update: true,
        }))
        .concat(this.rawBooks?.asks || []);
      const bids = order.bids
        ?.map((order) => ({
          ...order,
          update: true,
        }))
        .concat(this.rawBooks?.bids || []);
      const updateRawBooks = {
        ...this.rawBooks,
        asks,
        bids,
      };
      this.rawBooks = updateRawBooks;
      console.log(`updateBooks updateRawBooks`, updateRawBooks);
    });

    this.books = this.handleBooks(this.rawBooks);
    console.log(`updateBooks this.books`, this.books);
    return this.books;
  }

  async getBooks(instId, sz) {
    try {
      const rawBooks = await this.communicator.books(instId, sz);
      console.log(`getBooks rawBooks`, rawBooks);
      const asks = rawBooks[0].asks;
      const bids = rawBooks[0].bids;
      const books = {
        asks,
        bids,
        ts: rawBooks[0].ts,
      };
      this.rawBooks = rawBooks[0];
      console.log(`getBooks books`, books);
      this.books = this.handleBooks(books);
      return this.books;
    } catch (error) {
      throw error;
    }
  }

  updateTrades = (updateData) => {
    const _updateTrades = updateData
      .map((trade) => ({
        ...trade,
        px: trade.price,
        sz: trade.size,
        ts: trade.timestamp,
        tradeId: trade.tradeId.toString(),
        update: true,
      }))
      .concat(this.trades.map((trade) => ({ ...trade, update: false })) || []);
    this.trades = _updateTrades;
    return _updateTrades;
  };

  async getTrades(instId, limit) {
    try {
      const trades = await this.communicator.trades(instId, limit);
      this.trades = trades;
      return trades;
    } catch (error) {
      throw error;
    }
  }

  async getCandles(instId, bar, after, before, limit) {
    return await this.communicator.candles(instId, bar, after, before, limit);
  }

  async getPendingOrders(options) {
    return await this.communicator.ordersPending(options);
  }

  async getCloseOrders(options) {
    return await this.communicator.closeOrders(options);
  }

  async getBalances(ccy) {
    return await this.communicator.balance(ccy);
  }

  async postOrder(order) {
    return await this.communicator.order(order);
  }
}

export default Middleman;
