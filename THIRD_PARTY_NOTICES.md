# Third-party notices

## LiveBench benchmark data

The file `public/data/benchmarks/livebench-2026-06-25.json` contains a filtered and transformed subset of LiveBench leaderboard data.

- Source: https://livebench.ai/
- Data release: LiveBench 2026-06-25
- Methodology and model configurations: https://github.com/LiveBench/LiveBench
- Website license notice: https://github.com/LiveBench/livebench.github.io/blob/19e766a5de4de07d672ed5bf9f0a69ceed1d39bf/src/App.js#L312-L315
- License: Creative Commons Attribution-ShareAlike 4.0 International, https://creativecommons.org/licenses/by-sa/4.0/

Modification notice: the source data was filtered to models that could be connected to exact API model identifiers, category averages were retained for Coding and Reasoning, and application-specific model identifiers and provenance fields were added. Claude Fable 5 was excluded because the published benchmark configuration permits a server-side fallback to Claude Opus 4.8. Models without an exact, configuration-complete mapping are marked as unmeasured rather than assigned a lower score.

The LiveBench-derived JSON data remains available under CC BY-SA 4.0. The surrounding application code and original product copy are separate works and are not included in that dataset license notice.
