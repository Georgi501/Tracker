import { expect, it } from "vitest";
import { dedupeMarketNews } from "@/lib/market-news";

it("removes repeated articles by canonical URL or normalized title", () => {
  const news = [
    { title: "Bitcoin climbs today", link: "https://example.com/bitcoin?source=yahoo" },
    { title: "Bitcoin climbs today", link: "https://other.example/story" },
    { title: "Ethereum update", link: "https://example.com/eth#latest" },
    { title: "Another Ethereum article", link: "https://example.com/eth?source=yahoo" },
  ];

  expect(dedupeMarketNews(news)).toEqual([news[0], news[2]]);
});

it("keeps distinct articles in provider order", () => {
  const news = [
    { title: "Bitcoin market update", link: "https://example.com/bitcoin-1" },
    { title: "Ethereum market update", link: "https://example.com/ethereum-1" },
  ];

  expect(dedupeMarketNews(news)).toEqual(news);
});
