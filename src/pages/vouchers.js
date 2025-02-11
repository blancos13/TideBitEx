import React, { useState, useEffect, useCallback, useContext } from "react";
import StoreContext from "../store/store-context";
import TableDropdown from "../components/TableDropdown";
import { convertExponentialToDecimal } from "../utils/Utils";
import { useTranslation } from "react-i18next";
import SafeMath from "../utils/SafeMath";
import DatePicker from "../components/DatePicker";
import LoadingDialog from "../components/LoadingDialog";
import ProfitTrendingChart from "../components/ProfitTrendingChart";
import VoucherTile from "../components/VoucherTile";
import SupportedExchange from "../constant/SupportedExchange";

export const TableHeader = (props) => {
  const [ascending, setAscending] = useState(null);
  return (
    <th
      className={`screen__table-header${
        props.className ? ` ${props.className}` : ""
      }`}
    >
      <span
        className="screen__table-header--text"
        onClick={() =>
          setAscending((prev) => {
            props.onClick(!prev);
            return !prev;
          })
        }
      >
        {props.label}
      </span>
      <span
        className={`screen__table-header--btns${
          ascending === true
            ? " ascending"
            : ascending === false
            ? " descending"
            : ""
        }`}
      >
        <span
          className="screen__table-header--btn screen__table-header--btn-up"
          onClick={() => {
            setAscending(true);
            props.onClick(true);
          }}
        ></span>
        <span
          className="screen__table-header--btn screen__table-header--btn-down"
          onClick={() => {
            setAscending(false);
            props.onClick(false);
          }}
        ></span>
      </span>
    </th>
  );
};

let currentDate = new Date();

const Vouchers = () => {
  const storeCtx = useContext(StoreContext);
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalCounts, setTotalCounts] = useState(1);
  const [isInit, setIsInit] = useState(null);
  const [trades, setTrades] = useState(null);
  const [profits, setProfits] = useState(null);
  const [filterTrades, setFilterTrades] = useState(null);
  const [filterOption, setFilterOption] = useState(30); // 30, 365
  const [filterKey, setFilterKey] = useState("");
  const [filterExchange, setFilterExchange] = useState(null);
  const [exchanges, setExchanges] = useState(null);
  const [tickersSettings, setTickersSettings] = useState(null);
  const [tickers, setTickers] = useState(null);
  const [filterTicker, setFilterTicker] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chartData, setChartData] = useState({ data: {}, xaxisType: "string" });
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [dateStart, setDateStart] = useState(
    new Date(
      `${currentDate.getFullYear()}-${
        currentDate.getMonth() + 1
      }-${currentDate.getDate()} 08:00:00`
    )
  );
  const [dateEnd, setDateEnd] = useState(
    new Date(
      `${currentDate.getFullYear()}-${
        currentDate.getMonth() + 1
      }-${currentDate.getDate()} 08:00:00`
    )
  );

  const getVouchers = useCallback(
    async ({ exchange, ticker, start, end, limit, offset }) => {
      if (start) setStartDate(start);
      if (end) setEndDate(end);
      let page = Math.ceil(offset / limit) + 1,
        totalCounts,
        newTrades,
        updateTrades;
      // console.log(
      //   `trades[${exchange}][${ticker}][${start}][${end}][${limit}][${offset}][${page}]`
      // );
      let res = await storeCtx.getOuterTradeFills({
        instId: ticker,
        exchange,
        start: start || startDate,
        end: end || endDate,
        limit,
        offset,
      });
      totalCounts = res?.totalCounts;
      newTrades = res?.trades;
      // console.log(`newTrades`, newTrades);
      setTotalCounts(totalCounts);
      setTrades((prev) => {
        updateTrades = { ...prev };
        if (exchange) {
          if (!updateTrades[exchange]) updateTrades[exchange] = {};
          if (ticker) {
            if (!updateTrades[exchange][ticker])
              updateTrades[exchange][ticker] = {};
            updateTrades[exchange][ticker][page] = newTrades;
          }
        }
        // console.log(`updateTrades`, updateTrades);
        return updateTrades;
      });
      return newTrades;
    },
    [endDate, startDate, storeCtx]
  );

  const filter = useCallback(
    (trades, { keyword, exchange, ticker }) => {
      // console.log(`trades[:${trades?.length}]`, trades);
      let _keyword = keyword === undefined ? filterKey : keyword,
        _exchange = exchange || filterExchange,
        _ticker = ticker || filterTicker,
        _trades;
      if (ticker) setFilterTicker(ticker);
      // console.log(`before filter trades[:${trades.length}]`);
      _trades = trades.filter((trade) => {
        let condition =
          trade.instId?.includes(_keyword) ||
          trade.email?.includes(_keyword) ||
          trade.memberId?.includes(_keyword) ||
          trade.exchange?.includes(_keyword);
        if (_exchange !== "ALL")
          condition = condition && trade.exchange === _exchange;
        if (_ticker) condition = condition && trade.instId === _ticker;
        return condition;
      });
      // console.log(`after filter _trades[:${_trades.length}]`, _trades);
      setFilterTrades(_trades);
    },
    [filterExchange, filterKey, filterTicker]
  );

  const updateInterval = useCallback(
    async (option) => {
      const newPage = 1;
      setPage(newPage);
      setIsLoading(true);
      const now = new Date();
      const end = new Date(
        `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()} 08:00:00`
      );
      const startTime = new Date(end.getTime() - option * 24 * 60 * 60 * 1000);
      const start = new Date(
        `${startTime.getFullYear()}-${
          startTime.getMonth() + 1
        }-${startTime.getDate()} 08:00:00`
      );
      let tickerSetting = tickersSettings[filterExchange][filterTicker];
      if (tickerSetting.source === SupportedExchange.OKEX) {
        const result = await storeCtx.getOuterTradesProfits({
          ticker: filterTicker,
          exchange: tickerSetting.source,
          start: start.toISOString().substring(0, 10),
          end: end.toISOString().substring(0, 10),
        });
        if (result.chartData) setChartData(result.chartData);
        else setChartData({ data: {}, xaxisType: "string" });
        setProfits(result.profits);
      }
      const trades = await getVouchers({
        ticker: filterTicker,
        exchange: tickerSetting.source,
        start: start.toISOString().substring(0, 10),
        end: end.toISOString().substring(0, 10),
        limit: limit,
        offset: 0,
      });
      if (tickerSetting.source === SupportedExchange.TIDEBIT) {
        if (trades.chartData) setChartData(trades.chartData);
        else setChartData({ data: {}, xaxisType: "string" });
        setProfits(trades.profits);
      }
      filter(trades, {});
      setFilterOption(option);
      setIsLoading(false);
    },
    [
      filter,
      filterExchange,
      filterTicker,
      getVouchers,
      limit,
      storeCtx,
      tickersSettings,
    ]
  );

  const dateStartUpdateHandler = useCallback(
    async (date) => {
      const newPage = 1;
      setPage(newPage);
      setIsLoading(true);
      setDateStart(date);
      const end = dateEnd.toISOString().substring(0, 10);
      const start = date.toISOString().substring(0, 10);
      let tickerSetting = tickersSettings[filterExchange][filterTicker];
      if (tickerSetting.source === SupportedExchange.OKEX) {
        const result = await storeCtx.getOuterTradesProfits({
          ticker: filterTicker,
          exchange: tickerSetting.source,
          start,
          end,
        });
        if (result.chartData) setChartData(result.chartData);
        else setChartData({ data: {}, xaxisType: "string" });
        setProfits(result.profits);
      }
      const trades = await getVouchers({
        ticker: filterTicker,
        exchange: tickerSetting.source,
        start,
        end,
        offset: 0,
        limit: limit,
      });
      if (tickerSetting.source === SupportedExchange.TIDEBIT) {
        if (trades.chartData) setChartData(trades.chartData);
        else setChartData({ data: {}, xaxisType: "string" });
        setProfits(trades.profits);
      }
      filter(trades, {});
      setIsLoading(false);
    },
    [
      dateEnd,
      filter,
      filterExchange,
      filterTicker,
      getVouchers,
      limit,
      storeCtx,
      tickersSettings,
    ]
  );

  const dateEndUpdateHandler = useCallback(
    async (date) => {
      const newPage = 1;
      setPage(newPage);
      setIsLoading(true);
      setDateEnd(date);
      const end = date.toISOString().substring(0, 10);
      const start = dateStart.toISOString().substring(0, 10);
      let tickerSetting = tickersSettings[filterExchange][filterTicker];
      if (tickerSetting.source === SupportedExchange.OKEX) {
        const result = await storeCtx.getOuterTradesProfits({
          ticker: filterTicker,
          exchange: tickerSetting.source,
          start,
          end,
        });
        if (result.chartData) setChartData(result.chartData);
        else setChartData({ data: {}, xaxisType: "string" });
        setProfits(result.profits);
      }
      const trades = await getVouchers({
        ticker: filterTicker,
        exchange: tickerSetting.source,
        start,
        end,
        offset: 0,
        limit: limit,
      });
      if (tickerSetting.source === SupportedExchange.TIDEBIT) {
        if (trades.chartData) setChartData(trades.chartData);
        else setChartData({ data: {}, xaxisType: "string" });
        setProfits(trades.profits);
      }
      filter(trades, {});
      setIsLoading(false);
    },
    [
      dateStart,
      filter,
      filterExchange,
      filterTicker,
      getVouchers,
      limit,
      storeCtx,
      tickersSettings,
    ]
  );

  const selectExchangeHandler = useCallback(
    async (exchange) => {
      let newTrades,
        newPage = 1;
      setPage(newPage);
      setIsLoading(true);
      setFilterExchange(exchange);
      let tickers = Object.keys(tickersSettings[exchange]);
      setTickers(tickers);
      setFilterTicker(tickers[0]);
      if (exchange === SupportedExchange.OKEX) {
        const result = await storeCtx.getOuterTradesProfits({
          ticker: tickers[0],
          exchange: exchange,
          start: startDate,
          end: endDate,
        });
        if (result.chartData) setChartData(result.chartData);
        else setChartData({ data: {}, xaxisType: "string" });
        setProfits(result.profits);
      }
      newTrades = await getVouchers({
        ticker: tickers[0],
        exchange: exchange,
        offset: (newPage - 1) * limit,
        limit: limit,
      });
      if (exchange === SupportedExchange.TIDEBIT) {
        if (newTrades.chartData) setChartData(newTrades.chartData);
        else setChartData({ data: {}, xaxisType: "string" });
        setProfits(newTrades.profits);
      }
      filter(newTrades, { exchange });
      setIsLoading(false);
    },
    [tickersSettings, getVouchers, limit, filter, storeCtx, startDate, endDate]
  );

  const selectTickerHandler = useCallback(
    async (ticker) => {
      let newTrades,
        newPage = 1;
      setPage(newPage);
      setIsLoading(true);
      setFilterTicker(ticker);
      let tickerSetting = tickersSettings[filterExchange][ticker];
      if (tickerSetting.source === SupportedExchange.OKEX) {
        const result = await storeCtx.getOuterTradesProfits({
          ticker: ticker,
          exchange: tickerSetting.source,
          start: startDate,
          end: endDate,
        });
        if (result.chartData) setChartData(result.chartData);
        else setChartData({ data: {}, xaxisType: "string" });
        setProfits(result.profits);
      }
      newTrades = await getVouchers({
        ticker,
        exchange: tickerSetting.source,
        offset: (newPage - 1) * limit,
        limit: limit,
      });
      if (tickerSetting.source === SupportedExchange.TIDEBIT) {
        if (newTrades.chartData) setChartData(newTrades.chartData);
        else setChartData({ data: {}, xaxisType: "string" });
        setProfits(newTrades.profits);
      }
      filter(newTrades, { ticker });
      setIsLoading(false);
    },
    [
      tickersSettings,
      filterExchange,
      storeCtx,
      startDate,
      endDate,
      getVouchers,
      limit,
      filter,
    ]
  );

  const nextPageHandler = useCallback(async () => {
    let newTrades,
      newPage = page + 1;
    if (SafeMath.lte(newPage, Math.ceil(totalCounts, limit))) {
      setPage(newPage);
      setIsLoading(true);
      if (
        trades &&
        trades[filterExchange] &&
        trades[filterExchange][filterTicker] &&
        trades[filterExchange][filterTicker][newPage]
      ) {
        newTrades = trades[filterExchange][filterTicker][newPage];
        // console.log(`newTrades`, newTrades);
      } else {
        let tickerSetting = tickersSettings[filterExchange][filterTicker];
        newTrades = await getVouchers({
          ticker: filterTicker,
          exchange: tickerSetting.source,
          offset: (newPage - 1) * limit,
          limit: limit,
        });
        if (tickerSetting.source === SupportedExchange.TIDEBIT) {
          if (newTrades.chartData) setChartData(newTrades.chartData);
          else setChartData({ data: {}, xaxisType: "string" });
          setProfits(newTrades.profits);
        }
        // console.log(`newTrades`, newTrades);
      }
      filter(newTrades, {});
      setIsLoading(false);
    }
  }, [
    page,
    totalCounts,
    limit,
    trades,
    filterExchange,
    filterTicker,
    filter,
    tickersSettings,
    getVouchers,
  ]);

  const prevPageHandler = useCallback(async () => {
    let newTrades,
      newPage = page - 1;
    // console.log(`prevPageHandler newPage`, newPage);
    // console.log(
    //   `trades[${filterExchange}][${filterTicker}][${newPage}]`,
    //   trades
    // );
    if (
      SafeMath.gte(newPage, 1) &&
      trades &&
      trades[filterExchange] &&
      trades[filterExchange][filterTicker] &&
      trades[filterExchange][filterTicker][newPage]
    ) {
      setPage(newPage);
      setIsLoading(true);
      newTrades = trades[filterExchange][filterTicker][newPage];
      filter(newTrades, {});
      setIsLoading(false);
    }
  }, [filter, filterExchange, filterTicker, page, trades]);

  const sorting = (key, ascending) => {
    // console.log(`key`, key);
    // console.log(`ascending`, ascending);
    setFilterTrades((prevTrades) => {
      // console.log(`prevTrades`, prevTrades);
      let sortedTrades = prevTrades.map((trade) => ({ ...trade }));

      sortedTrades = ascending
        ? sortedTrades?.sort((a, b) => +a[key] - +b[key])
        : sortedTrades?.sort((a, b) => +b[key] - +a[key]);
      // console.log(`sortedTrades`, sortedTrades);
      return sortedTrades;
    });
  };

  const init = useCallback(() => {
    setIsInit(async (prev) => {
      if (!prev) {
        setIsLoading(true);
        let tickersSettings = await storeCtx.getTickersSettings();
        tickersSettings = Object.values(tickersSettings).reduce((acc, curr) => {
          if (curr.visible) {
            if (!acc[curr.source]) acc[curr.source] = {};
            acc[curr.source] = {
              ...acc[curr.source],
              [curr.instId]: curr,
            };
          }
          return acc;
        }, {});
        setTickersSettings(tickersSettings);
        let exchanges = Object.keys(tickersSettings);
        // console.log(exchanges);
        let exchange = exchanges[0];
        let tickers = Object.keys(tickersSettings[exchanges[0]]);
        let ticker = tickers[0];
        setExchanges(exchanges);
        setFilterExchange(exchange);
        setTickers(tickers);
        setFilterTicker(ticker);
        const now = new Date();
        const end = new Date(
          `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()} 08:00:00`
        );
        const startTime = new Date(
          end.getTime() - filterOption * 24 * 60 * 60 * 1000
        );
        const start = new Date(
          `${startTime.getFullYear()}-${
            startTime.getMonth() + 1
          }-${startTime.getDate()} 08:00:00`
        );
        if (exchange === SupportedExchange.OKEX) {
          const result = await storeCtx.getOuterTradesProfits({
            ticker,
            exchange,
            start: start.toISOString().substring(0, 10),
            end: end.toISOString().substring(0, 10),
          });
          if (result.chartData) setChartData(result.chartData);
          else setChartData({ data: {}, xaxisType: "string" });
          setProfits(result.profits);
        }
        const trades = await getVouchers({
          exchange,
          ticker,
          start: start.toISOString().substring(0, 10),
          end: end.toISOString().substring(0, 10),
          offset: 0,
          limit,
        });
        if (exchange === SupportedExchange.TIDEBIT) {
          if (trades.chartData) setChartData(trades.chartData);
          else setChartData({ data: {}, xaxisType: "string" });
          setProfits(trades.profits);
        }
        filter(trades, { exchange });
        // console.log(trades);
        setIsLoading(false);
        return !prev;
      } else return prev;
    });
  }, [filterOption, storeCtx, getVouchers, limit, filter]);

  useEffect(() => {
    if (!isInit) {
      init();
    }
  }, [init, isInit]);

  return (
    <>
      <LoadingDialog isLoading={isLoading} />
      <section className="screen__section vouchers">
        <div className="screen__header">{t("match-orders")}</div>
        <TableDropdown
          className="screen__filter"
          selectHandler={(exchange) => selectExchangeHandler(exchange)}
          options={exchanges ? exchanges : []}
          selected={filterExchange}
        />
        <ProfitTrendingChart
          data={chartData.data ? Object.values(chartData.data) : []}
          xaxisType={chartData.xaxisType}
        />
        <div className="screen__search-bar">
          <TableDropdown
            className="screen__filter"
            selectHandler={(ticker) => selectTickerHandler(ticker)}
            options={tickers ? tickers : []}
            selected={filterTicker}
          />
          <div className="screen__search-box">
            <input
              type="text"
              inputMode="search"
              className="screen__search-input"
              placeholder={t("search-keywords")}
              onInput={(e) => {
                setFilterKey(e.target.value);
                // console.log(`setFilterKey e.target.value`, e.target.value);
                // console.log(
                //   `trades[${filterExchange}][${filterTicker}][${page}]`,
                //   trades
                // );
                if (
                  trades &&
                  trades[filterExchange] &&
                  trades[filterExchange][filterTicker] &&
                  trades[filterExchange][filterTicker][page]
                )
                  filter(trades[filterExchange][filterTicker][page], {
                    keyword: e.target.value,
                  });
              }}
            />
            <div className="screen__search-icon">
              <div className="screen__search-icon--circle"></div>
              <div className="screen__search-icon--rectangle"></div>
            </div>
          </div>
        </div>
        <div className="screen__tool-bar">
          <div className="screen__display">
            <div className="screen__display-title">{`${t("show")}:`}</div>
            <ul className="screen__display-options">
              <li
                className={`screen__display-option${
                  filterOption === 30 ? " active" : ""
                }`}
                onClick={() => updateInterval(30)}
              >
                {t("recent-month")}
              </li>
              <li
                className={`screen__display-option${
                  filterOption === 365 ? " active" : ""
                }`}
                onClick={() => updateInterval(365)}
              >
                {t("recent-year")}
              </li>
            </ul>
          </div>
          <div className="screen__date--range-bar">
            <div className="screen__date--group">
              <label className="screen__date--title">
                {t("another-time")}:
              </label>
              {/* <input
              type="date"
              id="start"
              name="date-start"
              value={new Date().toISOString().substring(0, 10)}
            ></input> */}
              <DatePicker
                date={dateStart}
                setDate={dateStartUpdateHandler}
                maxDate={dateEnd}
              />
            </div>
            <div className="screen__date--group">
              <label className="screen__date--title">{t("to")}:</label>
              {/* <input
              type="date"
              id="end"
              name="date-end"
              value={new Date().toISOString().substring(0, 10)}
            ></input> */}
              <DatePicker
                date={dateEnd}
                setDate={dateEndUpdateHandler}
                minDate={dateStart}
              />
            </div>
          </div>
          {/* <div className="screen__sorting" onClick={sorting}>
          <img src="/img/sorting@2x.png" alt="sorting" />
        </div> */}
        </div>
        <div className="screen__table--overivew">
          <div className="screen__table-title">{`${t("current-profit")}:`}</div>
          <div className="screen__table--values">
            {profits &&
              Object.values(profits).map((profit) => (
                <div
                  className={`screen__table-value${
                    profit?.sum > 0 ? " positive" : " negative"
                  }`}
                >{`${convertExponentialToDecimal(profit?.sum) || "--"} ${
                  profit?.currency || "--"
                }`}</div>
              ))}
          </div>
        </div>
        <div className="screen__container">
          <table className={`screen__table`}>
            <tr className="screen__table-headers">
              <th className="screen__table-header screen__shrink">#</th>
              <TableHeader
                label={t("date")}
                onClick={(ascending) => sorting("ts", ascending)}
              />
              <th className="screen__table-header screen__email">
                {t("member_email")}
              </th>
              <th className="screen__table-header">
                <div className="screen__table-header--text">
                  {t("exchange")}
                </div>
                <div className="screen__table-header--switch"></div>
              </th>
              <th className="screen__table-header">{t("transaction-side")}</th>
              <TableHeader
                label={t("orderId")}
                onClick={(ascending) => sorting("orderId", ascending)}
              />
              <th className="screen__table-header">{t("state")}</th>
              <TableHeader
                className="screen__expand"
                label={t("transaction-price")}
                onClick={(ascending) => sorting("fillPrice", ascending)}
              />
              <TableHeader
                className="screen__expand"
                label={t("transaction-amount")}
                onClick={(ascending) => sorting("fillVolume", ascending)}
              />
              <TableHeader
                className="screen__expand"
                label={t("match-fee")}
                onClick={(ascending) => sorting("fee", ascending)}
              />
              <TableHeader
                className="screen__expand"
                label={t("referral")}
                onClick={(ascending) => sorting("referral", ascending)}
              />
              <TableHeader
                className="screen__expand"
                label={t("profit")}
                onClick={(ascending) => sorting("profit", ascending)}
              />
            </tr>
            <tr className="screen__table-rows">
              {filterTrades &&
                filterTrades.map((trade, index) => (
                  <VoucherTile
                    trade={trade}
                    number={(page - 1) * limit + (index + 1)}
                  />
                ))}
            </tr>
            {/* <tfoot
              className="screen__table-btn screen__table-text"
              onClick={() => setShowMore((prev) => !prev)}
            >
              {showMore ? t("show-less") : t("show-more")}
            </tfoot> */}
            <tfoot className="screen__table-tools">
              <div
                className={`screen__table-tool${
                  SafeMath.gt(page, 1) ? "" : " disable"
                }`}
                onClick={prevPageHandler}
              >
                <div className="screen__table-tool--left"></div>
              </div>
              <div className="screen__page">{`${page} / ${Math.ceil(
                totalCounts / limit
              )}`}</div>
              <div
                className={`screen__table-tool${
                  SafeMath.lt(page, Math.ceil(totalCounts / limit))
                    ? ""
                    : " disable"
                }`}
                onClick={nextPageHandler}
              >
                <div className="screen__table-tool--right"></div>
              </div>
            </tfoot>
          </table>
        </div>
        <div className="screen__floating-box">
          <div
            className="screen__floating-btn"
            onClick={() => {
              const screenSection =
                window.document.querySelector(".screen__section");
              screenSection.scroll(0, 0);
            }}
          >
            <img src="/img/floating-btn@2x.png" alt="arrow" />
          </div>
        </div>
      </section>
    </>
  );
};

export default Vouchers;
