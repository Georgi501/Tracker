# Capispot homepage video storyboard

## Creative direction

Produce two English cuts from one product-footage session:

- **Visitor cut (60 seconds):** introduce Capispot's core portfolio tracking, then show what Pro adds.
- **Signed-in cut (35 seconds):** focus only on Pro analysis and planning features.

Use a 16:9 master with important UI kept inside a centered mobile-safe area. Capture the public sample portfolio and clearly retain its sample-data label. Never record a user's real account. Use controlled screen captures, quiet music, English captions, and no autoplay with sound.

For a quick review before recording, open the [interactive product walkthrough](./capispot-video-preview.html). It uses screen captures from Capispot's real public pages, including the clearly labelled sample portfolio and the Free-vs-Pro comparison. The visitor cut runs for 36 seconds; the Pro cut runs for 30 seconds. Captions, chapter controls and optional quiet ambient sound make it easy to review locally; the captures contain no personal portfolio data and are not the final voiced video.

## Visitor cut — 60 seconds

| Time   | Picture and edit                                                                                                                   | Voiceover                                                                                                         | On-screen text                                              |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 0–4s   | Capispot logo; scattered asset names resolve into a clean portfolio view.                                                          | “Your investments deserve a clearer picture.”                                                                     | **Your investments, in one clear view.**                    |
| 4–12s  | Show the add/import flow, then a short manual transaction entry. Avoid showing credentials or broker account screens.              | “Bring your activity together with supported CSV imports or manual transactions.”                                 | **Import or add transactions**                              |
| 12–21s | Pan through holdings and allocation across stocks, ETFs, crypto, bonds, cash, and real estate. Keep the sample-data label visible. | “See different asset types, holdings, and allocation together in one portfolio.”                                  | **One portfolio. Multiple asset types.**                    |
| 21–31s | Open dated portfolio history; switch from net worth to performance and select an index.                                            | “Follow dated portfolio history and compare cash-flow-adjusted performance with a market index.”                  | **Real dated history** · **Cash-flow-adjusted performance** |
| 31–39s | Show dividends, goals, and a market-data/source note.                                                                              | “Explore confirmed dividend information and set goals—with clear sources and honest limits when data is missing.” | **Clear sources. No invented history.**                     |
| 39–51s | Short, readable cuts of Pro: AI portfolio review, company research/financials, ETF overlap, and risk analysis.                     | “With Pro, go deeper with an AI portfolio review, company research, financials, ETF overlap, and risk tools.”     | **Pro: deeper analysis**                                    |
| 51–56s | Show a planning tool and a buy-only rebalance preview; do not imply an order is placed.                                            | “Then explore planning, tax, and rebalancing tools using your own assumptions.”                                   | **Plan with your own assumptions**                          |
| 56–60s | End card with two clear choices.                                                                                                   | “Start free. Explore Pro when you’re ready.”                                                                      | **Start free** · **Explore Pro**                            |

Small end-card disclosure: “For information and portfolio tracking only — not investment advice. Investing involves risk.”

## Signed-in cut — 35 seconds

| Time   | Picture and edit                                                                                                                 | Voiceover                                                                             | On-screen text                          |
| ------ | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------- |
| 0–4s   | Transition from the signed-in dashboard into the Pro section.                                                                    | “Ready to get more from your portfolio data?”                                         | **Go deeper with Pro**                  |
| 4–11s  | Show the AI portfolio review starting and its review/checklist layout. Use a prepared demo account; do not expose personal data. | “Review concentration, risks, and questions to revisit with the AI portfolio review.” | **AI portfolio review**                 |
| 11–18s | Show company research, financials, then ETF overlap.                                                                             | “Explore company research and financials, and see where ETF holdings overlap.”        | **Research · Financials · ETF overlap** |
| 18–26s | Show risk contribution, tax reporting, and a buy-only rebalance preview. Keep any assumptions and preview labels visible.        | “Use risk, tax, and rebalancing tools to examine possible next steps.”                | **Risk · Tax · Rebalancing**            |
| 26–31s | Show scenario studio or goal-planning inputs, then return to the dashboard.                                                      | “Build scenarios around assumptions you choose—not promised outcomes.”                | **Your assumptions. Your scenarios.**   |
| 31–35s | End card with a plan link for eligible users.                                                                                    | “Explore the Pro tools and choose the plan that fits.”                                | **Explore Pro**                         |

Small end-card disclosure: “Analysis and scenarios are informational, not personalized investment advice or a guarantee of results.”

## Footage and publication checklist

- Record using the clearly labeled sample portfolio or a dedicated test account with no personal information. The local walkthrough uses only public Capispot pages and illustrative sample data.
- Keep sample figures visibly identified as illustrative; do not present them as live performance.
- Describe only the supported read-only IBKR and Trading 212 sync; do not imply other brokerage integrations, guaranteed returns, or that a rebalance preview executes trades.
- Keep the index disclosure visible where comparison is shown: index lines represent price return, not total return.
- Provide captions matching the English voiceover and a transcript for accessibility.
- For the final video, use a poster image and `preload="none"`; require an explicit play action and provide keyboard-accessible native controls. Keep sound off until the visitor starts playback.
- On the homepage, place the visitor cut in the signed-out landing content. For signed-in users, show only the Pro cut. Keep both versions out of the initial critical loading path.
