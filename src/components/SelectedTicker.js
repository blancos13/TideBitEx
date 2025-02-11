import React, { Suspense, useState, useContext } from "react";
import StoreContext from "../store/store-context";
import SafeMath from "../utils/SafeMath";
import { formateDecimal } from "../utils/Utils";
// import DesktopTickers from "./DesktopTickers";
import { useTranslation } from "react-i18next";
import { AiOutlineBarChart } from "react-icons/ai";
import { AiFillCaretDown } from "react-icons/ai";

const DesktopTickers = React.lazy(() => import("./DesktopTickers"));

const SelectedTicker = (props) => {
  const [openTickerList, setOpenTickerList] = useState(false);
  const storeCtx = useContext(StoreContext);
  const { t } = useTranslation();
  const openTickerListHandler = (open) => {
    setOpenTickerList((prev) => (open !== undefined ? open : !prev));
  };

  return (
    <div className="ticker">
      <div
        className={`ticker__button${openTickerList ? " open" : ""}`}
        onMouseEnter={() => openTickerListHandler(true)}
        onMouseLeave={() => openTickerListHandler(false)}
      >
        <div
          className="selectedTicker"
          onClick={(_) => openTickerListHandler()}
        >
          <AiOutlineBarChart size={28} />
          <div className="selectedTicker__text">
            {storeCtx.selectedTicker?.name || "--"}
          </div>
          <AiFillCaretDown />
        </div>
        <Suspense fallback={<div></div>}>
          <DesktopTickers
            openTickerList={openTickerList}
            openTickerListHandler={openTickerListHandler}
          />
        </Suspense>
      </div>
      <div className="ticker__price">
        <div
          className={`showPrice ${
            !storeCtx.selectedTicker
              ? ""
              : storeCtx.selectedTicker?.change?.includes("-")
              ? "decrease"
              : "increase"
          }`}
        >
          {formateDecimal(storeCtx.selectedTicker?.last, {
            decimalLength: storeCtx?.tickSz ? storeCtx?.tickSz : "0",
            pad: true,
          })}
        </div>
      </div>
      <div className="ticker__details">
        <div className="tickerItemLabel">{t("24_change")}</div>
        <div
          className={`tickerPriceText ${
            !storeCtx.selectedTicker
              ? ""
              : storeCtx.selectedTicker?.change?.includes("-")
              ? "decrease"
              : "increase"
          }`}
        >
          <span>
            {!storeCtx.selectedTicker
              ? "-- %"
              : `${formateDecimal(
                  SafeMath.mult(storeCtx.selectedTicker?.changePct, "100"),
                  {
                    decimalLength: 2,
                    pad: true,
                    withSign: true,
                  }
                )}%`}
          </span>
        </div>
      </div>
      <div className="ticker__details">
        <div className="tickerItemLabel">{t("24_high")}</div>
        <div className="tickerPriceText">
          {formateDecimal(storeCtx.selectedTicker?.high, {
            decimalLength: storeCtx?.tickSz ? storeCtx?.tickSz : "0",
            pad: true,
          })}
        </div>
      </div>
      <div className="ticker__details">
        <div className="tickerItemLabel">{t("24_low")}</div>
        <div className="tickerPriceText">
          {formateDecimal(storeCtx.selectedTicker?.low, {
            decimalLength: storeCtx?.tickSz ? storeCtx?.tickSz : "0",
            pad: true,
          })}
        </div>
      </div>
      <div className="ticker__details">
        <div className="tickerItemLabel">
          {`${t("24_volume")}(${
            storeCtx.selectedTicker?.baseUnit?.toUpperCase() || "--"
          })`}
        </div>
        <div className="tickerPriceText">
          {!storeCtx.selectedTicker
            ? "--"
            : formateDecimal(storeCtx.selectedTicker?.volume, {
                decimalLength: storeCtx?.lotSz,
              })}
        </div>
      </div>
      {storeCtx.selectedTicker?.volumeCcy && (
        <div className="ticker__details">
          <div className="tickerItemLabel">{`${t("24_volume_quote")}(${
            storeCtx.selectedTicker?.quoteUnit?.toUpperCase() || "--"
          })`}</div>
          <div className="tickerPriceText">
            {!storeCtx.selectedTicker
              ? "--"
              : formateDecimal(storeCtx.selectedTicker?.volumeCcy, {
                  decimalLength: 2,
                })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SelectedTicker;
