# Financial statement validation

Annual SEC data is supported for USD 10-K/10-K/A entity-wide disclosures. Other
supported listings use the separately labelled Yahoo history path. This is not a
claim that every issuer or reporting taxonomy has complete coverage.

Each value retains its actual fiscal dates and filing provenance. Reported zeros
and losses remain valid. Missing, conflicting, ambiguous or unmatched components
remain unavailable. No missing capex or principal payment is treated as zero.
Unsupported bank gross-profit/capex concepts are not manufactured.

## Free cash flow

FCF is a non-GAAP measure without a uniform issuer definition. The screen shows
which formula was used for each reporting date; a generic calculation is not
represented as the issuer's adjusted FCF.

- Generic: CFO minus cash PP&E purchases. If PP&E is absent, a separately labelled
  productive-assets calculation can include software and intangible assets.
  These components are distinct concepts, not competing synonyms.
- NVIDIA: CFO minus productive-asset purchases minus financed-asset principal.
- Amazon: CFO minus productive-asset purchases plus equipment sales and incentives.
- Meta: CFO minus PP&E purchases minus finance-lease principal.

Issuer-specific adjustments require every component, with exactly matching fiscal
start/end and accession. Unknown custom tags and missing adjustments suppress FCF.
NVIDIA and Amazon extension facts are read only from the verified issuer's primary
10-K, using a matching CIK, USD unit and unsegmented annual context. Older unsupported
document layouts or inline transforms remain unavailable.

## Regression coverage

Reduced public SEC fixtures captured as of 2026-11-12 cover AAPL, MSFT, AMZN, GOOGL,
META, TSLA, AMD, ORCL, JPM, KO, XOM and IBM. Each fixture includes its SEC source URL.
They check reported revenue, net income and operating cash flow as well as safe FCF
coverage. These tests demonstrate coverage of that sample, not all listed companies.

Live five-year provider checks also cover NVIDIA, Amazon and Meta. Latest verified
FCF: NVDA FY2026 USD 96.575 billion; AMZN FY2025 USD 11.194 billion; META FY2025
USD 43.585 billion. Historical series retain gaps when supporting evidence is absent.

## Sources

- SEC: https://www.sec.gov/rules-regulations/staff-guidance/corporation-finance-interpretations/non-gaap-financial-measures
- NVIDIA: https://investor.nvidia.com/news/press-release-details/2026/NVIDIA-Announces-Financial-Results-for-Fourth-Quarter-and-Fiscal-2026/
- Amazon: https://ir.aboutamazon.com/news-release/news-release-details/2026/Amazon-com-Announces-Fourth-Quarter-Results/default.aspx
- Meta: https://investor.atmeta.com/investor-news/press-release-details/2026/Meta-Reports-Fourth-Quarter-and-Full-Year-2025-Results/