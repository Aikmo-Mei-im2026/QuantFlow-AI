# QuantFlow AI frontend

The current application provides Chinese pages only. For setup, commands, architecture and known limitations, use the maintained [Chinese frontend guide](README.md) and [project guide](../README.md).

This is a frontend prototype using fixed mock results and synthetic candles. There is no working backend, live feed or verified backtest yet. Training state resets on refresh. The previous upstream login, AI demo and English content pages have been removed.

Use Node.js 24.x for the complete toolchain; the locally checked version is v24.16.0. Existing dependencies were installed with pnpm 12.14.0, while the current shell reports 11.25.0. A clean installation with the team's chosen pnpm version still needs verification. Preserve the lockfile and dependency trust settings.

The frontend is adapted from [pdsuwwz/nextjs-nextra-starter](https://github.com/pdsuwwz/nextjs-nextra-starter). The original [MIT license and copyright notice](LICENSE) are retained. This pointer does not indicate that English application routes are available.
