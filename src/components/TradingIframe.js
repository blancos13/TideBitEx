import { useContext, useEffect, useState } from "react";
import StoreContext from "../store/store-context";

const TradingIframe = (props) => {
  const storeCtx = useContext(StoreContext);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const { name, pricescale } = storeCtx.selectedTicker;
    const arr = [];
    if (name) arr.push(`symbol=${name}`);
    if (pricescale) arr.push(`pricescale=${pricescale}`);
    const qs = !!arr.length ? `?${arr.join("&")}` : "";
    setQuery(qs);
  }, [storeCtx.selectedTicker]);

  return (
    <iframe
      id="tradingview"
      className="main-chart__chart"
      src={`/tradingview/index.html${query}`}
      title="tradingview"
    ></iframe>
  );
};

export default TradingIframe;
