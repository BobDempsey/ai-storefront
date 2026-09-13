# CLAUDE.md

Read [AGENTS.md](AGENTS.md) — it holds this project's working agreement and
applies in full to Claude Code.

First thing, every session: **run `git branch --show-current`.** Two shops live
on two branches here. `main` is the template and the demo; `fif` is Forged in
Filament, a real shop. Shop work never lands on `main`. See AGENTS.md.

Key point: this project uses **OpenSpec**. Use `/opsx:explore`, `/opsx:propose`,
`/opsx:apply` and `/opsx:archive` rather than implementing features directly.
Skills live in `.claude/skills/openspec-*/`, commands in `.claude/commands/opsx/`.
