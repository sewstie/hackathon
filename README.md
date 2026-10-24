# hackathon

## Ralph

Ralph uses Kiro by default. To run it with another supported agent, set `AGENT`:

```sh
AGENT=claude ./ralph/once.sh
AGENT=codex ./ralph/afk.sh
```

To choose which Kiro model Ralph uses, start `kiro-cli chat`, run `/model` to
select a model, then run `/model set-current-as-default` to save it for future
sessions. Ralph's non-interactive Kiro sessions use that saved default. Check
available models with `kiro-cli chat --list-models`; model credit costs vary,
so confirm the selected model and its cost in Kiro before running a long loop.
