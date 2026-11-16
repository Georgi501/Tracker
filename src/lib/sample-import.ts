export const SAMPLE_IMPORT_CSV = `date,type,symbol,name,asset_type,quantity,price,fee,currency
2024-01-15,buy,AAPL,Apple Inc.,stock,10,185.20,0,USD
2024-03-01,buy,BTC,Bitcoin,crypto,0.05,62000,0,USD
2024-05-16,dividend,AAPL,Apple Inc.,stock,1,2.50,0,USD
2024-01-15,buy,AAPL,Apple Inc.,stock,10,185.20,0,USD
2024-06-03,split,AAPL,Apple Inc.,stock,1,1,0,USD`;

export const SAMPLE_TRADING212_CSV = `Action,Time,ISIN,Ticker,Name,No. of shares,Price / share,Currency (Price / share),Exchange rate,Total,Currency (Total),Stamp duty reserve tax,Currency (Stamp duty reserve tax),Notes,ID
Buy,2024-01-15 10:00:00,US5949181045,MSFT,Microsoft,2,420.00,USD,1.00,840.00,USD,0,USD,Sample purchase,T212-1001
Sell,2024-03-15 10:00:00,US5949181045,MSFT,Microsoft,1,450.00,USD,1.00,450.00,USD,0,USD,Sample sale,T212-1002
Dividend (Dividend),2024-06-15 10:00:00,US5949181045,MSFT,Microsoft,1,1.50,USD,1.00,1.50,USD,0,USD,Sample dividend,T212-1003
Buy,2024-01-15 10:00:00,US5949181045,MSFT,Microsoft,2,420.00,USD,1.00,840.00,USD,0,USD,Sample purchase,T212-1001
Interest on cash,2024-07-01 10:00:00,,,,,,,,1.00,USD,0,USD,Unsupported sample action,T212-1004`;

export const SAMPLE_IBKR_CSV = `Trades,Header,DataDiscriminator,Asset Category,Currency,Symbol,Date/Time,Quantity,T. Price,Comm/F
Trades,Data,Order,Stocks,USD,MSFT,"2024-04-02, 10:00:00",2,420.00,-1.00
Trades,Data,Order,Stocks,USD,MSFT,"2024-05-02, 10:00:00",-1,450.00,-1.00
Trades,Data,Order,Stocks,USD,MSFT,"2024-04-02, 10:00:00",2,420.00,-1.00
Trades,Data,Order,Stocks,USD,,2024-06-02,0,0,0
Dividends,Header,Currency,Date,Description,Amount
Dividends,Data,USD,2024-06-15,MSFT (US5949181045) Cash Dividend,1.50`;

export const SAMPLE_REVOLUT_CSV = `Date,Ticker,Type,Quantity,Price per share,Total Amount,Currency,ID
2024-01-15T10:00:00Z,MSFT,BUY - MARKET,2,420.00,840.00,USD,REV-1001
2024-03-15T10:00:00Z,MSFT,SELL - MARKET,1,450.00,450.00,USD,REV-1002
2024-06-15T10:00:00Z,MSFT,DIVIDEND,0,0,1.50,USD,REV-1003
2024-01-15T10:00:00Z,MSFT,BUY - MARKET,2,420.00,840.00,USD,REV-1001
2024-07-01T10:00:00Z,,CASH TOP-UP,0,0,100.00,USD,REV-1004`;
